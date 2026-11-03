-- Programa el envío de notificaciones cada minuto (incluye el recordatorio de 30 minutos).
-- Ejecútalo una vez en el SQL Editor de Supabase, reemplazando <proyecto> y <llave-anon>.
-- Requiere las extensiones pg_cron y pg_net (Database → Extensions).
select cron.schedule(
  'enviar-notificaciones',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://<proyecto>.supabase.co/functions/v1/enviar-notificaciones',
       headers := jsonb_build_object('Authorization', 'Bearer <llave-anon>')
     ) $$
);
