// ============================================================================
// Avodah — avisa con una notificación push que hay una encuesta nueva, SOLO a quien le toca:
// todos, solo hombres, solo mujeres, o la persona elegida (encuesta personal).
//
// Se pega en Supabase → Edge Functions → Deploy a new function → nombre "push-encuesta" → pega
// este código → Deploy. Usa los mismos secretos que send-push (VAPID_PUBLIC_KEY y
// VAPID_PRIVATE_KEY), que ya están puestos.
//
// Solo un admin puede llamarla. Recibe solo el id de la encuesta: para quién es y el texto del
// aviso se leen aquí, de la base, nunca de lo que mande el navegador. Así una encuesta personal
// nunca le avisa a nadie más.
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

    const { encuesta_id } = await req.json();
    if (!encuesta_id || typeof encuesta_id !== 'string') return json({ error: 'Falta la encuesta.' }, 400);

    const admin = createClient(url, serviceKey);
    const { data: enc, error: encErr } = await admin
      .from('encuestas')
      .select('title, active, audiencia, target_user')
      .eq('id', encuesta_id)
      .maybeSingle();
    if (encErr) throw encErr;
    if (!enc) return json({ error: 'Esa encuesta ya no existe.' }, 404);
    if (!enc.active) return json({ error: 'La encuesta está cerrada: ábrela antes de avisar.' }, 400);

    // A quién le toca.
    let destinatarios: Set<string> | null = null; // null = todos
    if (enc.audiencia === 'persona') {
      destinatarios = new Set(enc.target_user ? [enc.target_user] : []);
    } else if (enc.audiencia === 'hombres' || enc.audiencia === 'mujeres') {
      const { data: perfiles, error: pErr } = await admin
        .from('profiles')
        .select('id')
        .eq('gender', enc.audiencia === 'hombres' ? 'hombre' : 'mujer');
      if (pErr) throw pErr;
      destinatarios = new Set((perfiles ?? []).map((p) => p.id as string));
    }

    const { data: subs, error: subsErr } = await admin.from('push_subscriptions').select('user_id, endpoint, p256dh, auth_key');
    if (subsErr) throw subsErr;
    const lista = (subs ?? []).filter((s) => !destinatarios || destinatarios.has(s.user_id));

    webpush.setVapidDetails('mailto:soporte@miavodathashem.com', vapidPublic, vapidPrivate);
    const payload = JSON.stringify({ title: '📊 Nueva encuesta', body: enc.title });

    let enviadas = 0;
    let limpiadas = 0;
    await Promise.all(
      lista.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, payload);
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

    return json({ enviadas, total: lista.length, limpiadas });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado.' }, 500);
  }
});
