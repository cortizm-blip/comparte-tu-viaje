-- Funciones que usa la app: publicar un viaje con sus paraderos, enviar la ubicación del conductor
-- con aviso de "conductor llegando", informar y confirmar pagos, y avisar cuando el conductor cancela.

alter table perfiles add column auto text, add column patente text;
alter table paraderos add column minutos_desde_salida int not null default 0 check (minutos_desde_salida >= 0);

-- Distancia en metros entre dos puntos (haversine).
create function distancia_m(lat1 float8, lng1 float8, lat2 float8, lng2 float8) returns float8
language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- Publica un viaje y sus paraderos en una sola transacción.
-- p_paraderos: [{nombre, tipo, lat, lng, minutos_desde_salida}] en el orden del recorrido.
create function publicar_viaje(
  p_origen text, p_destino text, p_sale_en timestamptz, p_costo_total int, p_cupos int,
  p_cuenta_cobro uuid, p_paraderos jsonb, p_notas text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if p_sale_en <= now() then raise exception 'La salida debe ser en el futuro'; end if;
  if p_sale_en > now() + interval '3 days' then
    raise exception 'Los viajes se publican con hasta 2 días de anticipación';
  end if;
  if p_costo_total > 0 and p_cuenta_cobro is null then
    raise exception 'Agrega una cuenta de cobro para viajes pagados';
  end if;
  if p_cuenta_cobro is not null
     and not exists (select 1 from cuentas_cobro where id = p_cuenta_cobro and conductor_id = auth.uid()) then
    raise exception 'La cuenta de cobro no es tuya';
  end if;
  if jsonb_array_length(coalesce(p_paraderos, '[]')) = 0 then raise exception 'Agrega al menos un paradero'; end if;

  insert into viajes (conductor_id, origen, destino, sale_en, costo_total, cupos, cuenta_cobro_id, notas)
  values (auth.uid(), p_origen, p_destino, p_sale_en, p_costo_total, p_cupos, p_cuenta_cobro, p_notas)
  returning id into v_id;

  insert into paraderos (viaje_id, orden, nombre, tipo, lat, lng, minutos_desde_salida)
  select v_id, t.orden, t.p->>'nombre', coalesce(t.p->>'tipo', 'punto_fijo')::tipo_paradero,
         (t.p->>'lat')::float8, (t.p->>'lng')::float8, coalesce((t.p->>'minutos_desde_salida')::int, 0)
  from jsonb_array_elements(p_paraderos) with ordinality as t(p, orden);
  return v_id;
end $$;

-- Una vez que hay inscritos, el conductor no puede subir el costo ni dejar menos cupos que inscritos.
create function proteger_viaje() returns trigger language plpgsql as $$
declare
  n int;
begin
  select count(*) into n from inscripciones where viaje_id = new.id and estado = 'activa';
  if n > 0 and new.costo_total > old.costo_total then
    raise exception 'No puedes subir el costo con pasajeros inscritos';
  end if;
  if new.cupos < n then raise exception 'Ya hay % inscritos', n; end if;
  return new;
end $$;
create trigger proteger_viaje before update of costo_total, cupos on viajes
  for each row execute function proteger_viaje();

-- Si el conductor cancela, avisa al tiro a los inscritos.
create function avisar_cancelacion() returns trigger language plpgsql as $$
begin
  insert into cola_notificaciones (usuario_id, viaje_id, tipo, titulo, cuerpo, clave)
  select i.pasajero_id, new.id, 'viaje_cancelado', 'Se canceló tu viaje',
         new.origen || ' → ' || new.destino || ' fue cancelado por el conductor',
         'viaje_cancelado:' || new.id || ':' || i.pasajero_id
  from inscripciones i where i.viaje_id = new.id and i.estado = 'activa'
  on conflict (clave) do nothing;
  return new;
end $$;
create trigger avisar_cancelacion after update of estado on viajes
  for each row when (new.estado = 'cancelado' and old.estado <> 'cancelado')
  execute function avisar_cancelacion();

-- Guarda la posición del conductor y avisa una vez a cada pasajero cuando está a menos de 1 km de su paradero.
create function actualizar_ubicacion(p_viaje uuid, p_lat float8, p_lng float8) returns void
language plpgsql security definer set search_path = public as $$
declare
  v viajes;
begin
  select * into v from viajes where id = p_viaje;
  if not found or v.conductor_id is distinct from auth.uid() then raise exception 'No eres el conductor de este viaje'; end if;
  if v.estado <> 'en_curso' then raise exception 'El viaje no está en curso'; end if;

  insert into ubicaciones_conductor (viaje_id, lat, lng, actualizado_en) values (p_viaje, p_lat, p_lng, now())
  on conflict (viaje_id) do update set lat = excluded.lat, lng = excluded.lng, actualizado_en = now();

  insert into cola_notificaciones (usuario_id, viaje_id, tipo, titulo, cuerpo, clave)
  select i.pasajero_id, v.id, 'conductor_llegando', 'Tu conductor está llegando',
         (select nombre from perfiles where id = v.conductor_id) || ' está a menos de 1 km de ' || p.nombre,
         'conductor_llegando:' || v.id || ':' || i.pasajero_id
  from inscripciones i join paraderos p on p.id = i.paradero_id
  where i.viaje_id = v.id and i.estado = 'activa' and distancia_m(p_lat, p_lng, p.lat, p.lng) <= 1000
  on conflict (clave) do nothing;
end $$;

-- El pasajero informa que transfirió el precio final. Devuelve el monto.
create function informar_pago(p_viaje uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v viajes;
  insc inscripciones;
  monto int;
begin
  select * into v from viajes where id = p_viaje;
  select * into insc from inscripciones where viaje_id = p_viaje and pasajero_id = auth.uid() and estado = 'activa';
  if insc.id is null then raise exception 'No estás inscrito en este viaje'; end if;
  if v.estado not in ('en_curso', 'terminado') then raise exception 'El pago se hace al terminar el viaje'; end if;

  monto := precio_por_persona(v.costo_total, (select count(*)::int from inscripciones where viaje_id = p_viaje and estado = 'activa'));
  insert into pagos (inscripcion_id, monto, estado, informado_en) values (insc.id, monto, 'informado', now())
  on conflict (inscripcion_id) do update set monto = excluded.monto, estado = 'informado', informado_en = now()
    where pagos.estado = 'pendiente';
  return monto;
end $$;

-- El conductor confirma que le llegó la transferencia.
create function confirmar_pago(p_inscripcion uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update pagos set estado = 'confirmado', confirmado_en = now()
  where inscripcion_id = p_inscripcion and estado = 'informado'
    and exists (select 1 from inscripciones i join viajes v on v.id = i.viaje_id
                where i.id = p_inscripcion and v.conductor_id = auth.uid());
  if not found then raise exception 'No hay un pago informado que puedas confirmar'; end if;
end $$;
