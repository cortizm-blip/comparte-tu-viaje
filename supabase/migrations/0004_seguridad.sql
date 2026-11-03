-- Ajustes de los avisos de seguridad de Supabase:
-- la vista corre con los permisos de quien consulta y solo el conteo de inscritos usa permisos elevados,
-- las funciones tienen search_path fijo y las RPC solo las llaman usuarios con sesión.

-- Cuenta inscripciones activas de un viaje sin exponer quiénes son.
create function inscritos_activos(p_viaje uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from inscripciones where viaje_id = p_viaje and estado = 'activa'
$$;

create or replace view viajes_con_precio with (security_invoker = true) as
select v.*,
  i.n as inscritos,
  v.cupos - i.n as cupos_libres,
  precio_por_persona(v.costo_total, i.n) as precio_actual,
  case when v.costo_total > 0 and i.n < v.cupos
       then precio_por_persona(v.costo_total, i.n + 1) end as precio_con_uno_mas
from viajes v
cross join lateral (select inscritos_activos(v.id) as n) i;

alter function precio_por_persona(int, int) set search_path = public;
alter function formato_clp(int) set search_path = public;
alter function distancia_m(float8, float8, float8, float8) set search_path = public;
alter function proteger_viaje() set search_path = public;
alter function avisar_cancelacion() set search_path = public;

revoke execute on function inscribirse(uuid, uuid) from public;
revoke execute on function publicar_viaje(text, text, timestamptz, int, int, uuid, jsonb, text) from public;
revoke execute on function actualizar_ubicacion(uuid, float8, float8) from public;
revoke execute on function informar_pago(uuid) from public;
revoke execute on function confirmar_pago(uuid) from public;
revoke execute on function inscritos_activos(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function inscribirse(uuid, uuid) from anon;
    revoke execute on function publicar_viaje(text, text, timestamptz, int, int, uuid, jsonb, text) from anon;
    revoke execute on function actualizar_ubicacion(uuid, float8, float8) from anon;
    revoke execute on function informar_pago(uuid) from anon;
    revoke execute on function confirmar_pago(uuid) from anon;
    revoke execute on function inscritos_activos(uuid) from anon;
    grant execute on function inscribirse(uuid, uuid) to authenticated;
    grant execute on function publicar_viaje(text, text, timestamptz, int, int, uuid, jsonb, text) to authenticated;
    grant execute on function actualizar_ubicacion(uuid, float8, float8) to authenticated;
    grant execute on function informar_pago(uuid) to authenticated;
    grant execute on function confirmar_pago(uuid) to authenticated;
    grant execute on function inscritos_activos(uuid) to authenticated;
  end if;
end $$;
