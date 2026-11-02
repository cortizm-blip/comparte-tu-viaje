-- Contenido generado por usuarios (guía 1.2 de Apple): reportar viajes o personas y bloquear personas.
-- Los reportes los revisa el equipo desde el panel de Supabase (rol de servicio); el usuario solo ve los suyos.
-- Bloquear oculta en la app los viajes de esa persona.

create table reportes (
  id bigint generated always as identity primary key,
  autor_id uuid not null default auth.uid() references perfiles (id) on delete cascade,
  viaje_id uuid references viajes (id) on delete set null,
  reportado_id uuid references perfiles (id) on delete set null,
  motivo text not null check (length(motivo) between 1 and 500),
  creado_en timestamptz not null default now(),
  revisado_en timestamptz,
  check (viaje_id is not null or reportado_id is not null)
);
alter table reportes enable row level security;
create policy reportes_crear on reportes for insert to authenticated with check (autor_id = (select auth.uid()));
create policy reportes_propios on reportes for select to authenticated using (autor_id = (select auth.uid()));
create index reportes_autor on reportes (autor_id);
create index reportes_viaje on reportes (viaje_id);
create index reportes_reportado on reportes (reportado_id);
create index reportes_pendientes on reportes (creado_en) where revisado_en is null;

create table bloqueos (
  usuario_id uuid not null default auth.uid() references perfiles (id) on delete cascade,
  bloqueado_id uuid not null references perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (usuario_id, bloqueado_id),
  check (usuario_id <> bloqueado_id)
);
alter table bloqueos enable row level security;
create policy bloqueos_propios on bloqueos for all to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create index bloqueos_bloqueado on bloqueos (bloqueado_id);

-- Quien bloqueó no puede inscribirse en viajes de esa persona, ni esa persona en los suyos.
create function rechazar_bloqueado() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from viajes v join bloqueos b
               on (b.usuario_id = new.pasajero_id and b.bloqueado_id = v.conductor_id)
               or (b.usuario_id = v.conductor_id and b.bloqueado_id = new.pasajero_id)
             where v.id = new.viaje_id) then
    raise exception 'No puedes inscribirte en este viaje';
  end if;
  return new;
end $$;
create trigger rechazar_bloqueado before insert on inscripciones
  for each row execute function rechazar_bloqueado();
