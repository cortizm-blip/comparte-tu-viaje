-- Pruebas de 0005_revision con el rol de la app (authenticated) y sus políticas:
-- token push privado, cuenta de cobro ajena, estados, cancelación tardía, escritura directa y borrado de cuenta.
-- Uso: psql -v ON_ERROR_STOP=1 -f supabase/tests/revision.test.sql sobre una base con las migraciones.
begin;

create function pg_temp.como(u uuid) returns void language sql as
  $$ select set_config('request.jwt.claim.sub', u::text, true) $$;

create function pg_temp.debe_fallar(sql text, texto text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'Se esperaba error: %', texto;
exception when others then
  if position(texto in sqlerrm) = 0 then raise; end if;
end $$;

-- En Supabase estos permisos ya existen; aquí se dan para la base de prueba.
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
insert into perfiles (id, nombre) values
  ('00000000-0000-0000-0000-00000000000c', 'Camila'), ('00000000-0000-0000-0000-0000000000d2', 'Diego'),
  ('00000000-0000-0000-0000-0000000000a1', 'Ana'), ('00000000-0000-0000-0000-0000000000a2', 'Benja');
insert into cuentas_cobro (id, conductor_id, titular, rut, banco, tipo_cuenta, numero_cuenta) values
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000c', 'Camila R.', '11.111.111-1', 'Banco', 'Vista', '1'),
  ('00000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-0000000000d2', 'Diego P.', '22.222.222-2', 'Banco', 'Vista', '2');
insert into tokens_push (usuario_id, token) values ('00000000-0000-0000-0000-0000000000a1', 'ExponentPushToken[ana]');

set local role authenticated;

-- Token push: cada uno ve solo el suyo.
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin assert (select count(*) from tokens_push) = 0; end $$;
insert into tokens_push (usuario_id, token) values ('00000000-0000-0000-0000-0000000000a2', 'ExponentPushToken[benja]');
select pg_temp.debe_fallar($q$ insert into tokens_push (usuario_id, token)
  values ('00000000-0000-0000-0000-0000000000a1', 'x') on conflict (usuario_id) do update set token = 'x' $q$, 'row-level security');
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select token from tokens_push) = 'ExponentPushToken[ana]'; end $$;

-- Viajes: solo con publicar_viaje(), no por insert directo, y nunca con la cuenta de cobro de otro.
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select pg_temp.debe_fallar($q$ insert into viajes (conductor_id, origen, destino, sale_en, costo_total, cupos)
  values ('00000000-0000-0000-0000-00000000000c', 'A', 'B', now() + interval '30 days', 0, 3) $q$, 'row-level security');
create temp table t as select publicar_viaje('Maipú', 'Centro', now() + interval '1 day', 9000, 3,
  '00000000-0000-0000-0000-0000000000cc', '[{"nombre":"Metro Las Rejas","lat":-33.457,"lng":-70.706}]') as id;
select pg_temp.debe_fallar($q$ update viajes set cuenta_cobro_id = '00000000-0000-0000-0000-0000000000dd' $q$, 'no es tuya');
select pg_temp.debe_fallar($q$ insert into paraderos (viaje_id, orden, nombre, lat, lng)
  values ((select id from t), 9, 'X', 0, 0) $q$, 'row-level security');

-- Pasajeros: se inscriben y pueden cancelar antes de salir, pero no con el viaje en curso.
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select inscribirse((select id from t));
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select inscribirse((select id from t));
update inscripciones set estado = 'cancelada' where pasajero_id = '00000000-0000-0000-0000-0000000000a2';
do $$ begin assert inscritos_activos((select id from t)) = 1; end $$;
select inscribirse((select id from t));

-- Estados: solo avanzan.
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
update viajes set estado = 'confirmado';
update viajes set estado = 'en_curso';
select pg_temp.debe_fallar($q$ update viajes set estado = 'esperando_pasajeros' $q$, 'No se puede pasar');
select pg_temp.debe_fallar($q$ update viajes set estado = 'cancelado' $q$, 'No se puede pasar');

select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update inscripciones set estado = 'cancelada' where pasajero_id = '00000000-0000-0000-0000-0000000000a2';
do $$ begin assert inscritos_activos((select id from t)) = 2; end $$;

-- Ubicación: el pasajero no puede escribirla directamente.
select pg_temp.debe_fallar($q$ insert into ubicaciones_conductor (viaje_id, lat, lng) values ((select id from t), 0, 0) $q$,
  'row-level security');

-- Borrado de cuenta: el conductor con pasajeros debe terminar primero; el pasajero borra todo lo suyo.
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select pg_temp.debe_fallar($q$ select eliminar_mi_cuenta() $q$, 'antes de eliminar tu cuenta');
update viajes set estado = 'terminado';
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select eliminar_mi_cuenta();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000a2');
  assert not exists (select 1 from perfiles where id = '00000000-0000-0000-0000-0000000000a2');
  assert not exists (select 1 from tokens_push where usuario_id = '00000000-0000-0000-0000-0000000000a2');
  assert inscritos_activos((select id from t)) = 1;
end $$;
set local role authenticated;
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select eliminar_mi_cuenta();
reset role;
do $$ begin
  assert not exists (select 1 from viajes);
  assert not exists (select 1 from cuentas_cobro where conductor_id = '00000000-0000-0000-0000-00000000000c');
end $$;

select 'OK: todas las pruebas de la revisión pasaron' as resultado;
rollback;
