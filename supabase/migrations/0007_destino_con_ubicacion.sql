-- El destino del viaje guarda su ubicación, para que "¿A dónde vas?" encuentre viajes por destino real
-- y no solo por paradero de subida. Es opcional para no romper versiones anteriores de la app.

alter table viajes add column destino_lat float8, add column destino_lng float8,
  add constraint destino_coordenadas check ((destino_lat is null) = (destino_lng is null)
    and (destino_lat is null or (destino_lat between -90 and 90 and destino_lng between -180 and 180)));

-- La vista expande v.*; se recrea para incluir las columnas nuevas.
drop view viajes_con_precio;
create view viajes_con_precio with (security_invoker = true) as
select v.*,
  i.n as inscritos,
  v.cupos - i.n as cupos_libres,
  precio_por_persona(v.costo_total, i.n) as precio_actual,
  case when v.costo_total > 0 and i.n < v.cupos
       then precio_por_persona(v.costo_total, i.n + 1) end as precio_con_uno_mas
from viajes v
cross join lateral (select inscritos_activos(v.id) as n) i;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on viajes_con_precio from anon;
    grant select on viajes_con_precio to authenticated;
  end if;
end $$;

-- publicar_viaje con destino ubicado (la firma anterior se reemplaza).
drop function publicar_viaje(text, text, timestamptz, int, int, uuid, jsonb, text);
create function publicar_viaje(
  p_origen text, p_destino text, p_sale_en timestamptz, p_costo_total int, p_cupos int,
  p_cuenta_cobro uuid, p_paraderos jsonb, p_notas text default null,
  p_destino_lat float8 default null, p_destino_lng float8 default null
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

  insert into viajes (conductor_id, origen, destino, sale_en, costo_total, cupos, cuenta_cobro_id, notas, destino_lat, destino_lng)
  values (auth.uid(), p_origen, p_destino, p_sale_en, p_costo_total, p_cupos, p_cuenta_cobro, p_notas, p_destino_lat, p_destino_lng)
  returning id into v_id;

  insert into paraderos (viaje_id, orden, nombre, tipo, lat, lng, minutos_desde_salida)
  select v_id, t.orden, t.p->>'nombre', coalesce(t.p->>'tipo', 'punto_fijo')::tipo_paradero,
         (t.p->>'lat')::float8, (t.p->>'lng')::float8, coalesce((t.p->>'minutos_desde_salida')::int, 0)
  from jsonb_array_elements(p_paraderos) with ordinality as t(p, orden);
  return v_id;
end $$;
revoke execute on function publicar_viaje(text, text, timestamptz, int, int, uuid, jsonb, text, float8, float8) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function publicar_viaje(text, text, timestamptz, int, int, uuid, jsonb, text, float8, float8) from anon;
    grant execute on function publicar_viaje(text, text, timestamptz, int, int, uuid, jsonb, text, float8, float8) to authenticated;
  end if;
end $$;
