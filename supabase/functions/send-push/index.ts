// ============================================================================
// Avodah — envía una notificación push a todas las personas que la activaron.
//
// Se pega en Supabase → Edge Functions → New function ("send-push") → pega este código →
// Deploy. Antes hay que poner los dos secretos (Edge Functions → Manage secrets):
//   VAPID_PUBLIC_KEY  y  VAPID_PRIVATE_KEY  (el par que generó Claude; la pública también
//   vive, sin problema, en src/lib/push.ts porque es pública por diseño).
//
// Solo un admin puede llamarla (se verifica con su propia sesión antes de usar la clave de
// servicio). Envía a cada suscripción en `push_subscriptions`; si una ya no existe (la persona
// desinstaló o borró la app), se borra sola.
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      return new Response(JSON.stringify({ error: 'Faltan los secretos VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Quien llama: se verifica CON SU PROPIA sesión (nunca con la clave de servicio) que sea admin.
    const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: isAdmin, error: adminErr } = await asUser.rpc('is_admin');
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Solo un admin puede enviar notificaciones.' }), {
        status: 403,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { title, body } = await req.json();
    if (!title || typeof title !== 'string' || !body || typeof body !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta el título o el texto.' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    webpush.setVapidDetails('mailto:soporte@miavodathashem.com', vapidPublic, vapidPrivate);

    // Ahora sí, con la clave de servicio: leer TODAS las suscripciones (nunca lo que la gente registra).
    const admin = createClient(url, serviceKey);
    const { data: subs, error: subsErr } = await admin.from('push_subscriptions').select('user_id, endpoint, p256dh, auth_key');
    if (subsErr) throw subsErr;

    const payload = JSON.stringify({ title, body });
    let enviadas = 0;
    let limpiadas = 0;
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            payload,
          );
          enviadas++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await admin.from('push_subscriptions').delete().eq('user_id', s.user_id).eq('endpoint', s.endpoint);
            limpiadas++;
          }
          // otros errores (red, etc.): se ignoran para no tumbar el envío a los demás
        }
      }),
    );

    return new Response(JSON.stringify({ enviadas, total: (subs ?? []).length, limpiadas }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Error inesperado.' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
