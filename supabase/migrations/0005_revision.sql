-- Correcciones de la revisión de código:
-- 1. El token push sale de perfiles (que todos leen) a una tabla privada de cada usuario.
-- 2. Un viaje solo puede usar una cuenta de cobro de su conductor y su estado solo avanza.
-- 3. El pasajero no puede cancelar su inscripción con el viaje en curso o terminado (evitaba el pago).
-- 4. Los viajes, paraderos y ubicaciones se escriben solo por las funciones que validan.
-- 5. Políticas con (select auth.uid()), solo para usuarios con sesión y sin duplicados; índices faltantes.
-- 6. eliminar_mi_cuenta(): borrado de cuenta desde la app (exigido por Apple).

-- 1. Tokens push privados.
create table tokens_push (
  usuario_id uuid primary key references perfiles (id) on delete cascade,
  token text not null,
  actualizado_en timestamptz not null default now()
);
alter table tokens_push enable row level security;
insert into tokens_push (usuario_id, token) select id, push_token from perfiles where push_token is not null;
alter table perfiles drop column push_token;

-- 2. Cuenta de cobro propia y estados que solo avanzan (las correcciones manuales con rol de servicio quedan libres).
create function validar_viaje() returns trigger language plpgsql set search_path = public as $$
begin
  if new.cuenta_cobro_id is not null
     and not exists (select 1 from cuentas_cobro where id = new.cuenta_cobro_id and conductor_id = new.conductor_id) then
    raise exception 'La cuenta de cobro no es tuya';
  end if;
  if tg_op = 'UPDATE' and new.estado is distinct from old.estado and current_user in ('authenticated', 'anon')
     and not (old.estado, new.estado) in (
       ('esperando_pasajeros', 'confirmado'), ('esperando_pasajeros', 'en_curso'), ('esperando_pasajeros', 'cancelado'),
       ('confirmado', 'en_curso'), ('confirmado', 'cancelado'), ('en_curso', 'terminado')) then
    raise exception 'No se puede pasar el viaje de % a %', old.estado, new.estado;
  end if;
  return new;
end $$;
create trigger validar_viaje before insert or update on viajes
  for each row execute function validar_viaje();

-- 3 a 5. Políticas nuevas.
drop policy perfiles_leer on perfiles;
drop policy perfiles_editar on perfiles;
drop policy viajes_leer on viajes;
drop policy viajes_editar on viajes;
drop policy paraderos_leer on paraderos;
drop policy paraderos_editar on paraderos;
drop policy cuentas_propias on cuentas_cobro;
drop policy cuentas_inscritos on cuentas_cobro;
drop policy inscripciones_leer on inscripciones;
drop policy inscripciones_cancelar on inscripciones;
drop policy seguidores_propios on seguidores_viaje;
drop policy pagos_leer on pagos;
drop policy ubicacion_leer on ubicaciones_conductor;
drop policy ubicacion_escribir on ubicaciones_conductor;
drop policy cola_propia on cola_notificaciones;

create policy perfiles_leer on perfiles for select to authenticated using ((select auth.uid()) is not null);
create policy perfiles_crear on perfiles for insert to authenticated with check (id = (select auth.uid()));
create policy perfiles_editar on perfiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy tokens_propios on tokens_push for all to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));

-- Viajes y paraderos se crean con publicar_viaje(); el conductor solo cambia su viaje (estado, costo, cupos).
create policy viajes_leer on viajes for select to authenticated using ((select auth.uid()) is not null);
create policy viajes_editar on viajes for update to authenticated
  using (conductor_id = (select auth.uid())) with check (conductor_id = (select auth.uid()));
create policy paraderos_leer on paraderos for select to authenticated using ((select auth.uid()) is not null);

create policy cuentas_leer on cuentas_cobro for select to authenticated using (
  conductor_id = (select auth.uid()) or exists (
    select 1 from viajes v join inscripciones i on i.viaje_id = v.id
    where v.cuenta_cobro_id = cuentas_cobro.id and i.pasajero_id = (select auth.uid()) and i.estado = 'activa'));
create policy cuentas_crear on cuentas_cobro for insert to authenticated with check (conductor_id = (select auth.uid()));
create policy cuentas_editar on cuentas_cobro for update to authenticated
  using (conductor_id = (select auth.uid())) with check (conductor_id = (select auth.uid()));
create policy cuentas_borrar on cuentas_cobro for delete to authenticated using (conductor_id = (select auth.uid()));

create policy inscripciones_leer on inscripciones for select to authenticated using (
  pasajero_id = (select auth.uid())
  or exists (select 1 from viajes where id = viaje_id and conductor_id = (select auth.uid())));
create policy inscripciones_cancelar on inscripciones for update to authenticated
  using (pasajero_id = (select auth.uid())
         and exists (select 1 from viajes v where v.id = viaje_id and v.estado in ('esperando_pasajeros', 'confirmado')))
  with check (pasajero_id = (select auth.uid()) and estado = 'cancelada');

create policy seguidores_propios on seguidores_viaje for all to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));

create policy pagos_leer on pagos for select to authenticated using (exists (
  select 1 from inscripciones i join viajes v on v.id = i.viaje_id
  where i.id = inscripcion_id and (i.pasajero_id = (select auth.uid()) or v.conductor_id = (select auth.uid()))));

-- La ubicación la escribe actualizar_ubicacion(); la leen el conductor y sus inscritos.
create policy ubicacion_leer on ubicaciones_conductor for select to authenticated using (exists (
  select 1 from viajes v where v.id = viaje_id and (v.conductor_id = (select auth.uid()) or exists (
    select 1 from inscripciones i where i.viaje_id = v.id and i.pasajero_id = (select auth.uid()) and i.estado = 'activa'))));

create policy cola_propia on cola_notificaciones for select to authenticated using (usuario_id = (select auth.uid()));

create index inscripciones_pasajero on inscripciones (pasajero_id);
create index inscripciones_paradero on inscripciones (paradero_id);
create index viajes_conductor on viajes (conductor_id);
create index viajes_cuenta_cobro on viajes (cuenta_cobro_id);
create index cuentas_cobro_conductor on cuentas_cobro (conductor_id);
create index seguidores_usuario on seguidores_viaje (usuario_id);
create index cola_usuario on cola_notificaciones (usuario_id);
create index cola_viaje on cola_notificaciones (viaje_id);
create index cola_pendientes on cola_notificaciones (id) where enviado_en is null;

-- 6. Borra la cuenta del usuario actual y todos sus datos (en cascada desde auth.users).
-- Si tiene viajes publicados con pasajeros, primero debe cancelarlos para que ellos reciban el aviso.
create function eliminar_mi_cuenta() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if exists (select 1 from viajes v where v.conductor_id = auth.uid()
             and v.estado in ('esperando_pasajeros', 'confirmado', 'en_curso') and inscritos_activos(v.id) > 0) then
    raise exception 'Cancela o termina tus viajes con pasajeros antes de eliminar tu cuenta';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function eliminar_mi_cuenta() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function eliminar_mi_cuenta() from anon;
    grant execute on function eliminar_mi_cuenta() to authenticated;
  end if;
end $$;
