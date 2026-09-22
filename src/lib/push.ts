/*
  Notificaciones push: avisos que suenan en el teléfono aunque la app esté cerrada. Requieren
  que la persona dé su permiso — es una regla del propio navegador, no hay forma de forzarlo.

  La clave de abajo es la VAPID *pública*: es pública por diseño (como la clave `anon` de
  Supabase), así que no hay problema en que viva aquí, en el código del navegador. La clave
  PRIVADA nunca está en el cliente: vive solo como secreto de la función de servidor
  `supabase/functions/send-push`.
*/
import { backendConfigured, supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BIEJ-GW0Hx6Qi7Rh3XZkMpVA2KXcdyHdYtD49hDWW19tYZz0erXwhuUI59TjOV7X14hhvRgum0PAWAwn3T6Oo6g';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function isSubscribed(): Promise<boolean> {
  return !!(await currentSubscription());
}

export type SubscribeResult = 'ok' | 'denegado' | 'no-soportado' | 'error';

/** Pide el permiso y, si lo dan, guarda la suscripción de este dispositivo en el servidor. */
export async function subscribePush(): Promise<SubscribeResult> {
  if (!pushSupported() || !backendConfigured || !supabase) return 'no-soportado';
  let perm: NotificationPermission;
  try {
    perm = await Notification.requestPermission();
  } catch {
    return 'no-soportado';
  }
  if (perm !== 'granted') return 'denegado';

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'error';
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
    });
    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

/** Apaga las notificaciones en este dispositivo y borra la suscripción del servidor. */
export async function unsubscribePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    if (supabase) await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
  } finally {
    await sub.unsubscribe().catch(() => undefined);
  }
}
