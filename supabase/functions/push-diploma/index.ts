// ============================================================================
// Avodah — avisa con una notificación push que alguien recibió un diploma. Le llega SOLO a esa
// persona.
//
// Se pega en Supabase → Edge Functions → Deploy a new function → nombre "push-diploma" → pega
// este código → Deploy. Usa los mismos secretos que send-push (VAPID_PUBLIC_KEY y
// VAPID_PRIVATE_KEY), que ya están puestos.
//
// Solo un admin puede llamarla. Recibe solo el id del diploma: a quién avisar y el texto se leen
// aquí, de la base, nunca de lo que mande el navegador.
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPublic || !vapidPrivate) {
      return json({ error: 'Faltan los secretos VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.' }, 500);
    }

    // Quien llama: se verifica CON SU PROPIA sesión (nunca con la clave de servicio) que sea admin.
    const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: isAdmin, error: adminErr } = await asUser.rpc('is_admin');
    if (adminErr || !isAdmin) return json({ error: 'Solo un admin puede enviar notificaciones.' }, 403);

    const { diploma_id } = await req.json();
    if (!diploma_id || typeof diploma_id !== 'string') return json({ error: 'Falta el diploma.' }, 400);

    const admin = createClient(url, serviceKey);
    const { data: dip, error: dErr } = await admin.from('diplomas').select('user_id, titulo').eq('id', diploma_id).maybeSingle();
    if (dErr) throw dErr;
    if (!dip) return json({ error: 'Ese diploma ya no existe.' }, 404);

    const { data: subs, error: subsErr } = await admin
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth_key')
      .eq('user_id', dip.user_id);
    if (subsErr) throw subsErr;

    webpush.setVapidDetails('mailto:soporte@miavodathashem.com', vapidPublic, vapidPrivate);
    const payload = JSON.stringify({ title: '🏆 Recibiste un diploma', body: dip.titulo });

    let enviadas = 0;
    let limpiadas = 0;
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, payload);
          enviadas++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await admin.from('push_subscriptions').delete().eq('user_id', s.user_id).eq('endpoint', s.endpoint);
            limpiadas++;
          }
        }
      }),
    );

    return json({ enviadas, total: (subs ?? []).length, limpiadas });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado.' }, 500);
  }
});
