-- Pruebas de 0006: reportes y bloqueos con el rol de la app.
-- Uso: psql -v ON_ERROR_STOP=1 -f supabase/tests/reportes.test.sql sobre una base con las migraciones.
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

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
insert into perfiles (id, nombre) values
  ('00000000-0000-0000-0000-00000000000c', 'Camila'), ('00000000-0000-0000-0000-0000000000a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000000a2', 'Benja');

set local role authenticated;
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select publicar_viaje('Maipú', 'Centro', now() + interval '1 day', 0, 3, null,
  '[{"nombre":"P1","lat":-33.5,"lng":-70.7}]') as v \gset

-- Ana reporta el viaje y a Camila; solo ve sus reportes; no puede reportar a nombre de otro.
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into reportes (viaje_id, reportado_id, motivo) values (:'v', '00000000-0000-0000-0000-00000000000c', 'Precio engañoso');
select pg_temp.debe_fallar($q$ insert into reportes (autor_id, reportado_id, motivo)
  values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000c', 'x') $q$, 'row-level security');
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin assert (select count(*) from reportes) = 0; end $$;

-- Benja bloquea a Camila: no puede inscribirse en su viaje; Ana sí.
insert into bloqueos (bloqueado_id) values ('00000000-0000-0000-0000-00000000000c');
select pg_temp.debe_fallar(format($q$ select inscribirse(%L) $q$, :'v'), 'No puedes inscribirte');
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select inscribirse(:'v') is not null;
do $$ begin assert (select count(*) from bloqueos) = 0, 'Ana no ve bloqueos de Benja'; end $$;

select 'OK: todas las pruebas de reportes y bloqueos pasaron' as resultado;
rollback;
