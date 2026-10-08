/*
  Solo admin: manda una notificación push (que suena en el teléfono) a todas las personas que la
  activaron. El envío real lo hace `supabase/functions/send-push`, que revisa que quien llama sea
  admin ANTES de usar la clave de servicio. Aquí solo se invoca.
*/
import { supabase } from './supabase';

export class PushAdminError extends Error {}

export interface SendPushResult {
  enviadas: number;
  total: number;
  limpiadas: number;
}

export interface PushSubscriber {
  user_id: string;
  /** Desde cuándo tiene notificaciones activadas (la más antigua de sus dispositivos). */
  subscribed_at: string;
}

/** Solo admin: quién activó las notificaciones y desde cuándo — nunca la dirección técnica de envío. */
export async function listPushSubscribers(): Promise<PushSubscriber[]> {
  if (!supabase) throw new PushAdminError('El servidor no está configurado.');
  const { data, error } = await supabase.rpc('admin_list_push_subscribers');
  if (error) throw new PushAdminError(error.message || 'No se pudo cargar quién tiene las notificaciones activadas.');
  return (data ?? []) as PushSubscriber[];
}

/** Llama a una función de servidor de notificaciones y devuelve su resultado, o su mensaje de error real. */
async function invocar(fn: string, body: Record<string, unknown>): Promise<SendPushResult> {
  if (!supabase) throw new PushAdminError('El servidor no está configurado.');
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // FunctionsHttpError trae el cuerpo de la respuesta (con el mensaje real) en `context`.
    let real = '';
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        real = ((await ctx.clone().json()) as { error?: string }).error ?? '';
      } catch {
        /* sin cuerpo legible: se usa el mensaje genérico de abajo */
      }
    }
    throw new PushAdminError(real || error.message || 'No se pudo enviar la notificación.');
  }
  return data as SendPushResult;
}

export async function sendPushToAll(title: string, body: string): Promise<SendPushResult> {
  return invocar('send-push', { title, body });
}

/**
 * Avisa de una encuesta nueva SOLO a quien le toca (todos, hombres, mujeres o la persona elegida).
 * Para quién es y el texto los decide el servidor (`supabase/functions/push-encuesta`), no esta pantalla.
 */
export async function sendPushEncuesta(encuestaId: string): Promise<SendPushResult> {
  return invocar('push-encuesta', { encuesta_id: encuestaId });
}

/** Avisa a UNA persona que recibió un diploma. A quién y el texto los decide el servidor (`push-diploma`). */
export async function sendPushDiploma(diplomaId: string): Promise<SendPushResult> {
  return invocar('push-diploma', { diploma_id: diplomaId });
}
