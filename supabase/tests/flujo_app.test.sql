-- Pruebas de las funciones de la app: publicar, proteger el costo, cancelar, ubicación y pagos.
-- Uso: psql -v ON_ERROR_STOP=1 -f supabase/tests/flujo_app.test.sql sobre una base con las migraciones.
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

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2');
insert into perfiles (id, nombre) values
  ('00000000-0000-0000-0000-00000000000c', 'Camila'), ('00000000-0000-0000-0000-0000000000a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000000a2', 'Benja');
insert into cuentas_cobro (id, conductor_id, titular, rut, banco, tipo_cuenta, numero_cuenta)
values ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000c',
        'Camila R.', '11.111.111-1', 'Banco de ejemplo', 'Cuenta vista', '00001111');

do $$ begin assert round(distancia_m(-33.45, -70.66, -33.46, -70.66)) between 1100 and 1120; end $$;

select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select pg_temp.debe_fallar($q$ select publicar_viaje('A', 'B', now() + interval '1 day', 8000, 3, null,
  '[{"nombre":"X","lat":0,"lng":0}]') $q$, 'cuenta de cobro');
select pg_temp.debe_fallar($q$ select publicar_viaje('A', 'B', now() + interval '5 days', 0, 3, null,
  '[{"nombre":"X","lat":0,"lng":0}]') $q$, '2 días');
select pg_temp.debe_fallar($q$ select publicar_viaje('A', 'B', now() + interval '1 day', 0, 3, null, '[]') $q$, 'paradero');

create temp table t as select publicar_viaje('Maipú', 'Metro Los Leones', now() + interval '1 day', 9000, 3,
  '00000000-0000-0000-0000-0000000000cc',
  '[{"nombre":"Metro Plaza de Maipú","tipo":"metro","lat":-33.5110,"lng":-70.7576},
    {"nombre":"Metro Las Rejas","tipo":"metro","lat":-33.4573,"lng":-70.7065,"minutos_desde_salida":22}]') as id;
do $$ begin
  assert (select array_agg(nombre || ':' || orden || ':' || minutos_desde_salida order by orden) from paraderos)
    = array['Metro Plaza de Maipú:1:0', 'Metro Las Rejas:2:22'];
end $$;

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select inscribirse((select id from t), (select id from paraderos where orden = 2));
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select inscribirse((select id from t), (select id from paraderos where orden = 1));

-- Con inscritos no se puede subir el costo ni bajar cupos bajo los inscritos; bajar el costo sí.
select pg_temp.debe_fallar($q$ update viajes set costo_total = 12000 $q$, 'subir el costo');
select pg_temp.debe_fallar($q$ update viajes set cupos = 1 $q$, 'Ya hay 2 inscritos');
update viajes set costo_total = 8000;

-- Ubicación: solo el conductor y con el viaje en curso. Avisa una vez a quien está a menos de 1 km.
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select pg_temp.debe_fallar($q$ select actualizar_ubicacion((select id from t), -33.46, -70.71) $q$, 'no está en curso');
update viajes set estado = 'en_curso';
select actualizar_ubicacion((select id from t), -33.4600, -70.7100);  -- ~450 m de Las Rejas
select actualizar_ubicacion((select id from t), -33.4590, -70.7080);
do $$ begin
  assert (select count(*) from cola_notificaciones where tipo = 'conductor_llegando') = 1;
  assert (select usuario_id from cola_notificaciones where tipo = 'conductor_llegando') = '00000000-0000-0000-0000-0000000000a1';
  assert (select cuerpo from cola_notificaciones where tipo = 'conductor_llegando')
    = 'Camila está a menos de 1 km de Metro Las Rejas';
  assert (select lat from ubicaciones_conductor) = -33.4590;
end $$;
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select pg_temp.debe_fallar($q$ select actualizar_ubicacion((select id from t), 0, 0) $q$, 'No eres el conductor');

-- Pagos: el pasajero informa el precio final y el conductor confirma.
do $$ begin assert informar_pago((select id from t)) = 4000; end $$;
select pg_temp.debe_fallar($q$ select confirmar_pago((select id from inscripciones where pasajero_id = '00000000-0000-0000-0000-0000000000a1')) $q$, 'No hay un pago');
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select confirmar_pago((select id from inscripciones where pasajero_id = '00000000-0000-0000-0000-0000000000a1'));
do $$ begin assert (select estado from pagos) = 'confirmado'; end $$;

-- Cancelación avisa a los inscritos.
update viajes set estado = 'cancelado';
do $$ begin assert (select count(*) from cola_notificaciones where tipo = 'viaje_cancelado') = 2; end $$;

select 'OK: todas las pruebas del flujo de la app pasaron' as resultado;
rollback;
