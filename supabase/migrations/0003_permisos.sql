-- Permisos: encolar_recordatorios solo lo llama la función de envío (service_role), no los usuarios.
-- Los roles anon/authenticated existen en Supabase; fuera de Supabase se omite.
revoke execute on function encolar_recordatorios() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function encolar_recordatorios() from anon, authenticated;
  end if;
end $$;
