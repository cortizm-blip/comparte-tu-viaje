// Envía las notificaciones pendientes de cola_notificaciones por el servicio push de Expo.
// Se llama cada minuto (ver docs/puesta-en-marcha.md); antes encola los recordatorios de 30 minutos.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

type Pendiente = { id: number; usuario_id: string; viaje_id: string | null; tipo: string; titulo: string; cuerpo: string };
type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await sb.rpc('encolar_recordatorios');

  const { data, error } = await sb
    .from('cola_notificaciones')
    .select('id, usuario_id, viaje_id, tipo, titulo, cuerpo')
    .is('enviado_en', null)
    .order('id')
    .limit(300);
  if (error) return new Response(error.message, { status: 500 });
  const pendientes = (data ?? []) as Pendiente[];
  if (pendientes.length === 0) return Response.json({ enviadas: 0, procesadas: 0 });

  // Los tokens viven en una tabla privada (solo la lee el dueño y este servicio).
  const usuarios = [...new Set(pendientes.map((p) => p.usuario_id))];
  const { data: filas, error: e2 } = await sb.from('tokens_push').select('usuario_id, token').in('usuario_id', usuarios);
  if (e2) return new Response(e2.message, { status: 500 });
  const tokenDe = new Map((filas ?? []).map((f) => [f.usuario_id as string, f.token as string]));

  // Se marcan también las de usuarios sin token, para no reintentarlas para siempre.
  const sinToken = pendientes.filter((p) => !tokenDe.has(p.usuario_id));
  await marcar(sb, sinToken.map((p) => p.id));

  // Expo acepta hasta 100 mensajes por llamada; cada lote se marca al enviarse, así un fallo no duplica los anteriores.
  const conToken = pendientes.filter((p) => tokenDe.has(p.usuario_id));
  let enviadas = 0;
  for (let i = 0; i < conToken.length; i += 100) {
    const lote = conToken.slice(i, i + 100);
    const r = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(lote.map((p) => ({
        to: tokenDe.get(p.usuario_id),
        title: p.titulo,
        body: p.cuerpo,
        sound: 'default',
        data: { viajeId: p.viaje_id, tipo: p.tipo },
      }))),
    });
    if (!r.ok) return new Response(`Expo respondió ${r.status}`, { status: 502 });
    await marcar(sb, lote.map((p) => p.id));
    enviadas += lote.length;

    // Borra los tokens de teléfonos que ya no tienen la app.
    const tickets = ((await r.json()) as { data?: Ticket[] }).data ?? [];
    const muertos = lote.filter((_, j) => tickets[j]?.details?.error === 'DeviceNotRegistered').map((p) => p.usuario_id);
    if (muertos.length > 0) await sb.from('tokens_push').delete().in('usuario_id', muertos);
  }
  return Response.json({ enviadas, procesadas: pendientes.length });
});

async function marcar(sb: ReturnType<typeof createClient>, ids: number[]) {
  if (ids.length > 0) await sb.from('cola_notificaciones').update({ enviado_en: new Date().toISOString() }).in('id', ids);
}
