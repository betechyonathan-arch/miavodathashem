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

export async function sendPushToAll(title: string, body: string): Promise<SendPushResult> {
  if (!supabase) throw new PushAdminError('El servidor no está configurado.');
  const { data, error } = await supabase.functions.invoke('send-push', { body: { title, body } });
  if (error) {
    // FunctionsHttpError trae el cuerpo de la respuesta (con el mensaje real) en `context`.
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const j = (await ctx.clone().json()) as { error?: string };
        if (j.error) throw new PushAdminError(j.error);
      } catch {
        /* sin cuerpo legible: se usa el mensaje genérico de abajo */
      }
    }
    throw new PushAdminError(error.message || 'No se pudo enviar la notificación.');
  }
  return data as SendPushResult;
}
