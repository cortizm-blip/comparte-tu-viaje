-- Modelo de datos inicial de Comparte tu viaje (MVP).
-- Viajes con precio dinámico, paraderos, inscripciones con control de cupos,
-- cuentas de cobro visibles solo para inscritos y una cola de notificaciones push.

create extension if not exists pgcrypto;

-- Esquema y función auth mínimos para probar fuera de Supabase; en Supabase ya existen.
create schema if not exists auth;
do $$ begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'auth' and p.proname = 'uid') then
    create table if not exists auth.users (id uuid primary key default gen_random_uuid());
    create function auth.uid() returns uuid language sql stable as
      $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
  end if;
end $$;

create type estado_viaje as enum ('esperando_pasajeros', 'confirmado', 'en_curso', 'terminado', 'cancelado');
create type estado_inscripcion as enum ('activa', 'cancelada');
create type estado_pago as enum ('pendiente', 'informado', 'confirmado');
create type tipo_paradero as enum ('metro', 'punto_fijo');
create type tipo_notificacion as enum ('baja_precio', 'recordatorio_30', 'conductor_llegando', 'viaje_cancelado');

-- Precio por persona, igual que src/lib/precio.ts: redondeo hacia abajo, sin inscritos = costo total.
create function precio_por_persona(costo_total int, inscritos int) returns int
language sql immutable as $$
  select case when costo_total = 0 then 0 else costo_total / greatest(inscritos, 1) end
$$;

create table perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  telefono text,
  foto_url text,
  push_token text,
  creado_en timestamptz not null default now()
);

-- Datos de transferencia del conductor, reutilizables entre viajes.
create table cuentas_cobro (
  id uuid primary key default gen_random_uuid(),
  conductor_id uuid not null references perfiles (id) on delete cascade,
  titular text not null,
  rut text not null,
  banco text not null,
  tipo_cuenta text not null,
  numero_cuenta text not null,
  email text,
  link_pago text,
  creado_en timestamptz not null default now()
);

create table viajes (
  id uuid primary key default gen_random_uuid(),
  conductor_id uuid not null references perfiles (id) on delete cascade,
  origen text not null,
  destino text not null,
  sale_en timestamptz not null,
  costo_total int not null check (costo_total >= 0),
  cupos int not null check (cupos between 1 and 8),
  cuenta_cobro_id uuid references cuentas_cobro (id),
  estado estado_viaje not null default 'esperando_pasajeros',
  notas text,
  creado_en timestamptz not null default now(),
  check (costo_total = 0 or cuenta_cobro_id is not null)
);
create index viajes_sale_en on viajes (sale_en) where estado in ('esperando_pasajeros', 'confirmado');

create table paraderos (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references viajes (id) on delete cascade,
  orden int not null,
  nombre text not null,
  tipo tipo_paradero not null default 'punto_fijo',
  lat double precision not null,
  lng double precision not null,
  unique (viaje_id, orden)
);

create table inscripciones (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references viajes (id) on delete cascade,
  pasajero_id uuid not null references perfiles (id) on delete cascade,
  paradero_id uuid references paraderos (id),
  estado estado_inscripcion not null default 'activa',
  creado_en timestamptz not null default now(),
  unique (viaje_id, pasajero_id)
);

-- Quienes miran un viaje sin inscribirse, para avisarles cuando baja el precio.
create table seguidores_viaje (
  viaje_id uuid not null references viajes (id) on delete cascade,
  usuario_id uuid not null references perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (viaje_id, usuario_id)
);

-- El dinero no pasa por la plataforma: el pasajero informa la transferencia y el conductor la confirma.
create table pagos (
  inscripcion_id uuid primary key references inscripciones (id) on delete cascade,
  monto int not null check (monto >= 0),
  estado estado_pago not null default 'pendiente',
  informado_en timestamptz,
  confirmado_en timestamptz
);

-- Última posición del conductor durante el viaje (una fila por viaje).
create table ubicaciones_conductor (
  viaje_id uuid primary key references viajes (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  actualizado_en timestamptz not null default now()
);

-- Cola que procesa la función de envío push; `clave` evita duplicados.
create table cola_notificaciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references perfiles (id) on delete cascade,
  viaje_id uuid not null references viajes (id) on delete cascade,
  tipo tipo_notificacion not null,
  titulo text not null,
  cuerpo text not null,
  clave text not null unique,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz
);

-- Viajes con inscritos y precios calculados, para la lista y el detalle.
-- Corre con permisos del dueño para contar inscripciones que el usuario no puede leer una a una.
create view viajes_con_precio as
select v.*,
  coalesce(i.n, 0) as inscritos,
  v.cupos - coalesce(i.n, 0) as cupos_libres,
  precio_por_persona(v.costo_total, coalesce(i.n, 0)) as precio_actual,
  case when v.costo_total > 0 and coalesce(i.n, 0) < v.cupos
       then precio_por_persona(v.costo_total, coalesce(i.n, 0) + 1) end as precio_con_uno_mas
from viajes v
left join (select viaje_id, count(*)::int as n from inscripciones where estado = 'activa' group by viaje_id) i
  on i.viaje_id = v.id
where auth.uid() is not null;

-- Formato $10.000 para los textos de las notificaciones.
create function formato_clp(monto int) returns text language sql immutable as $$
  select '$' || replace(to_char(monto, 'FM999G999G999'), ',', '.')
$$;

-- Inscribe al usuario actual. Bloquea el viaje para no sobrevender cupos
-- y encola el aviso de baja de precio para inscritos y seguidores.
create function inscribirse(p_viaje uuid, p_paradero uuid default null) returns inscripciones
language plpgsql security definer set search_path = public as $$
declare
  v viajes;
  n int;
  fila inscripciones;
begin
  select * into v from viajes where id = p_viaje for update;
  if not found then raise exception 'Viaje no existe'; end if;
  if v.estado not in ('esperando_pasajeros', 'confirmado') or v.sale_en <= now() then
    raise exception 'El viaje ya no acepta inscripciones';
  end if;
  if v.conductor_id = auth.uid() then raise exception 'No puedes inscribirte en tu propio viaje'; end if;
  if p_paradero is not null and not exists (select 1 from paraderos where id = p_paradero and viaje_id = p_viaje) then
    raise exception 'El paradero no pertenece a este viaje';
  end if;

  select count(*) into n from inscripciones where viaje_id = p_viaje and estado = 'activa';
  if n >= v.cupos then raise exception 'No quedan cupos'; end if;

  insert into inscripciones (viaje_id, pasajero_id, paradero_id)
  values (p_viaje, auth.uid(), p_paradero)
  on conflict (viaje_id, pasajero_id) do update
    set estado = 'activa', paradero_id = excluded.paradero_id, creado_en = now()
    where inscripciones.estado = 'cancelada'
  returning * into fila;
  if fila.id is null then raise exception 'Ya estás inscrito en este viaje'; end if;

  if v.costo_total > 0 and n >= 1 then
    insert into cola_notificaciones (usuario_id, viaje_id, tipo, titulo, cuerpo, clave)
    select u.id, v.id, 'baja_precio', 'Bajó el precio de tu viaje',
           v.origen || ' → ' || v.destino || ': ahora ' || formato_clp(precio_por_persona(v.costo_total, n + 1))
             || ' por persona',
           'baja_precio:' || v.id || ':' || (n + 1) || ':' || u.id
    from (select pasajero_id as id from inscripciones where viaje_id = v.id and estado = 'activa'
          union select usuario_id from seguidores_viaje where viaje_id = v.id) u
    where u.id <> auth.uid()
    on conflict (clave) do nothing;
  end if;
  return fila;
end $$;

-- Encola el recordatorio de 30 minutos para viajes confirmados; se llama cada minuto (pg_cron).
create function encolar_recordatorios() returns int
language plpgsql security definer set search_path = public as $$
declare
  total int;
begin
  insert into cola_notificaciones (usuario_id, viaje_id, tipo, titulo, cuerpo, clave)
  select u.id, v.id, 'recordatorio_30', 'Tu viaje sale en 30 minutos',
         v.origen || ' → ' || v.destino || ' a las ' || to_char(v.sale_en at time zone 'America/Santiago', 'HH24:MI'),
         'recordatorio_30:' || v.id || ':' || u.id
  from viajes v
  cross join lateral (select v.conductor_id as id
                      union select pasajero_id from inscripciones where viaje_id = v.id and estado = 'activa') u
  where v.estado = 'confirmado' and v.sale_en between now() and now() + interval '30 minutes'
  on conflict (clave) do nothing;
  get diagnostics total = row_count;
  return total;
end $$;

-- Seguridad por filas: cualquiera con sesión ve viajes y paraderos; la cuenta de cobro
-- solo la ven el conductor y sus pasajeros inscritos.
alter table perfiles enable row level security;
alter table cuentas_cobro enable row level security;
alter table viajes enable row level security;
alter table paraderos enable row level security;
alter table inscripciones enable row level security;
alter table seguidores_viaje enable row level security;
alter table pagos enable row level security;
alter table ubicaciones_conductor enable row level security;
alter table cola_notificaciones enable row level security;

create policy perfiles_leer on perfiles for select using (auth.uid() is not null);
create policy perfiles_editar on perfiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy viajes_leer on viajes for select using (auth.uid() is not null);
create policy viajes_editar on viajes for all using (conductor_id = auth.uid()) with check (conductor_id = auth.uid());

create policy paraderos_leer on paraderos for select using (auth.uid() is not null);
create policy paraderos_editar on paraderos for all
  using (exists (select 1 from viajes where id = viaje_id and conductor_id = auth.uid()))
  with check (exists (select 1 from viajes where id = viaje_id and conductor_id = auth.uid()));

create policy cuentas_propias on cuentas_cobro for all using (conductor_id = auth.uid()) with check (conductor_id = auth.uid());
create policy cuentas_inscritos on cuentas_cobro for select using (exists (
  select 1 from viajes v join inscripciones i on i.viaje_id = v.id
  where v.cuenta_cobro_id = cuentas_cobro.id and i.pasajero_id = auth.uid() and i.estado = 'activa'));

-- Las inscripciones se crean solo por inscribirse(); aquí se leen y se cancelan.
create policy inscripciones_leer on inscripciones for select using (
  pasajero_id = auth.uid() or exists (select 1 from viajes where id = viaje_id and conductor_id = auth.uid()));
create policy inscripciones_cancelar on inscripciones for update
  using (pasajero_id = auth.uid()) with check (pasajero_id = auth.uid() and estado = 'cancelada');

create policy seguidores_propios on seguidores_viaje for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy pagos_leer on pagos for select using (exists (
  select 1 from inscripciones i join viajes v on v.id = i.viaje_id
  where i.id = inscripcion_id and (i.pasajero_id = auth.uid() or v.conductor_id = auth.uid())));

create policy ubicacion_leer on ubicaciones_conductor for select using (exists (
  select 1 from viajes v where v.id = viaje_id and (v.conductor_id = auth.uid() or exists (
    select 1 from inscripciones i where i.viaje_id = v.id and i.pasajero_id = auth.uid() and i.estado = 'activa'))));
create policy ubicacion_escribir on ubicaciones_conductor for all
  using (exists (select 1 from viajes where id = viaje_id and conductor_id = auth.uid()))
  with check (exists (select 1 from viajes where id = viaje_id and conductor_id = auth.uid()));

create policy cola_propia on cola_notificaciones for select using (usuario_id = auth.uid());
