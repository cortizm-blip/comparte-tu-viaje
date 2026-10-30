-- Pruebas del modelo: precio, cupos, inscripción y cola de notificaciones.
-- Uso: psql -v ON_ERROR_STOP=1 -f supabase/tests/modelo.test.sql sobre una base con la migración aplicada.
begin;

create function pg_temp.como(u uuid) returns void language sql as
  $$ select set_config('request.jwt.claim.sub', u::text, true) $$;

-- Espera que `sql` falle con un mensaje que contenga `texto`.
create function pg_temp.debe_fallar(sql text, texto text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'Se esperaba error: %', texto;
exception when others then
  if position(texto in sqlerrm) = 0 then raise; end if;
end $$;

do $$ begin
  assert precio_por_persona(10000, 1) = 10000;
  assert precio_por_persona(10000, 2) = 5000;
  assert precio_por_persona(10000, 3) = 3333;
  assert precio_por_persona(10000, 4) = 2500;
  assert precio_por_persona(10000, 0) = 10000;
  assert precio_por_persona(0, 3) = 0;
  assert formato_clp(10000) = '$10.000';
  assert formato_clp(1250000) = '$1.250.000';
end $$;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2'), ('00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000f1');
insert into perfiles (id, nombre) values
  ('00000000-0000-0000-0000-00000000000c', 'Carla'), ('00000000-0000-0000-0000-0000000000a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000000a2', 'Benja'), ('00000000-0000-0000-0000-0000000000a3', 'Cata'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fede');
insert into cuentas_cobro (id, conductor_id, titular, rut, banco, tipo_cuenta, numero_cuenta)
values ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000c',
        'Carla Pérez', '12.345.678-9', 'BancoEstado', 'Cuenta RUT', '12345678');
insert into viajes (id, conductor_id, origen, destino, sale_en, costo_total, cupos, cuenta_cobro_id)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000c',
        'Maipú', 'Providencia', now() + interval '1 day', 10000, 2, '00000000-0000-0000-0000-0000000000cc');
insert into paraderos (id, viaje_id, orden, nombre, tipo, lat, lng) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 1, 'Metro Del Sol', 'metro', -33.4867, -70.7507);
insert into seguidores_viaje values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1');

-- Viaje pagado sin cuenta de cobro no se puede publicar.
select pg_temp.debe_fallar($q$ insert into viajes (conductor_id, origen, destino, sale_en, costo_total, cupos)
  values ('00000000-0000-0000-0000-00000000000c', 'A', 'B', now() + interval '1 day', 5000, 3) $q$, 'check');

select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select pg_temp.debe_fallar($q$ select inscribirse('00000000-0000-0000-0000-0000000000b1') $q$, 'propio viaje');

-- Primera inscripción: precio sigue en $10.000 y no hay aviso de baja.
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select inscribirse('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1');
do $$ begin
  assert (select precio_actual from viajes_con_precio where id = '00000000-0000-0000-0000-0000000000b1') = 10000;
  assert (select precio_con_uno_mas from viajes_con_precio where id = '00000000-0000-0000-0000-0000000000b1') = 5000;
  assert (select count(*) from cola_notificaciones) = 0;
end $$;
select pg_temp.debe_fallar($q$ select inscribirse('00000000-0000-0000-0000-0000000000b1') $q$, 'Ya estás inscrito');

-- Segunda inscripción: baja a $5.000, avisa a Ana (inscrita) y Fede (seguidor), no a Benja.
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select inscribirse('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert (select precio_actual from viajes_con_precio where id = '00000000-0000-0000-0000-0000000000b1') = 5000;
  assert (select precio_con_uno_mas from viajes_con_precio where id = '00000000-0000-0000-0000-0000000000b1') is null;
  assert (select array_agg(usuario_id order by usuario_id) from cola_notificaciones where tipo = 'baja_precio')
    = array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1']::uuid[];
  assert (select cuerpo from cola_notificaciones limit 1) = 'Maipú → Providencia: ahora $5.000 por persona';
end $$;

-- Sin cupos para la tercera persona.
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
select pg_temp.debe_fallar($q$ select inscribirse('00000000-0000-0000-0000-0000000000b1') $q$, 'No quedan cupos');

-- Si Benja cancela, Cata puede entrar, y Benja puede volver a inscribirse cuando haya cupo.
update inscripciones set estado = 'cancelada' where pasajero_id = '00000000-0000-0000-0000-0000000000a2';
select inscribirse('00000000-0000-0000-0000-0000000000b1');
update inscripciones set estado = 'cancelada' where pasajero_id = '00000000-0000-0000-0000-0000000000a3';
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select inscribirse('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert (select inscritos from viajes_con_precio where id = '00000000-0000-0000-0000-0000000000b1') = 2;
end $$;

-- Recordatorio de 30 min: solo viajes confirmados en la ventana, una vez por persona.
update viajes set estado = 'confirmado', sale_en = now() + interval '20 minutes'
where id = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert encolar_recordatorios() = 3;  -- conductora + 2 pasajeros
  assert encolar_recordatorios() = 0;
end $$;

-- La cuenta de cobro solo la ven conductor e inscritos (RLS, con un rol sin privilegios).
create role probador_rls;
grant usage on schema public, auth to probador_rls;
grant select on all tables in schema public to probador_rls;
grant execute on all functions in schema auth to probador_rls;
set local role probador_rls;
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select count(*) from cuentas_cobro) = 1; end $$;
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  assert (select count(*) from cuentas_cobro) = 0;
  assert (select count(*) from viajes) = 1;
  assert (select count(*) from inscripciones) = 0;
  assert (select inscritos from viajes_con_precio) = 2;
end $$;
select pg_temp.como(null);
do $$ begin assert (select count(*) from viajes_con_precio) = 0; end $$;
reset role;

select 'OK: todas las pruebas del modelo pasaron' as resultado;
rollback;
