// Envía las notificaciones pendientes de cola_notificaciones por el servicio push de Expo.
// Se llama cada minuto (ver docs/puesta-en-marcha.md); antes encola los recordatorios de 30 minutos.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

type Pendiente = {
  id: number;
  viaje_id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  perfiles: { push_token: string | null } | null;
};

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await sb.rpc('encolar_recordatorios');

  const { data, error } = await sb
    .from('cola_notificaciones')
    .select('id, viaje_id, tipo, titulo, cuerpo, perfiles(push_token)')
    .is('enviado_en', null)
    .order('id')
    .limit(300);
  if (error) return new Response(error.message, { status: 500 });
  const pendientes = (data ?? []) as unknown as Pendiente[];

  // Expo acepta hasta 100 mensajes por llamada.
  const mensajes = pendientes
    .filter((p) => p.perfiles?.push_token)
    .map((p) => ({
      to: p.perfiles!.push_token,
      title: p.titulo,
      body: p.cuerpo,
      sound: 'default',
      data: { viajeId: p.viaje_id, tipo: p.tipo },
    }));
  for (let i = 0; i < mensajes.length; i += 100) {
    const r = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensajes.slice(i, i + 100)),
    });
    if (!r.ok) return new Response(`Expo respondió ${r.status}`, { status: 502 });
  }

  // Se marcan también las de usuarios sin token, para no reintentarlas para siempre.
  if (pendientes.length > 0) {
    await sb.from('cola_notificaciones').update({ enviado_en: new Date().toISOString() }).in('id', pendientes.map((p) => p.id));
  }
  return Response.json({ enviadas: mensajes.length, procesadas: pendientes.length });
});
