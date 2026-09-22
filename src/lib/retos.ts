/*
  Retos entre usuarios: como una kabalá, pero de dos o más personas. Se invita buscando su
  nombre (ver `buscarParaRetar`, cualquier género — no explora una lista, hace falta escribir
  al menos 2 letras) o mandando el enlace del reto por fuera de la app. Quien recibe la
  invitación acepta o rechaza. Los públicos necesitan aprobación de un admin antes de que otros
  los vean; los privados no, salvo que alguien denuncie.

  Nombres: si todos los participantes activos de un reto son del mismo género, se ven los
  nombres entre ellos; si es mixto, es anónimo para todos (nadie ve el nombre de nadie) — salvo
  que dos personas concretas pidan revelarse mutuamente (ver `pedirRevelarIdentidad`): solo
  cuando AMBAS lo piden se muestran sus nombres entre ELLAS DOS, el resto del reto sigue
  anónimo. Si cualquiera retira su lado, se oculta de nuevo. El admin siempre ve las
  identidades, para poder moderar.

  Quien invita puede cancelar la invitación mientras siga sin responder (`cancelarInvitacion`).
  Si alguien la rechaza, quien invitó lo ve marcado como "rechazó" en la lista de participantes.

  Lo que cada quien marca día a día en un reto (si cuidó o cayó) SOLO lo ven los demás
  participantes de ESE reto — es la única excepción a que lo personal nunca sale del
  dispositivo, y es la esencia misma de un reto (ver si tu rival va cumpliendo).
*/
import { supabase } from './supabase';
import type { KabalaKind } from './db/schema';

export type RetoVisibility = 'publico' | 'privado';
export type RetoStatus = 'pendiente_admin' | 'activo' | 'rechazado_admin';
export type ParticipanteEstado = 'invitado' | 'activo' | 'rechazado' | 'abandonado' | 'ninguno';

export class RetoError extends Error {}

function client() {
  if (!supabase) throw new RetoError('El servidor no está configurado.');
  return supabase;
}

/** Áreas entre las que elegir al crear un reto (las mismas que las kabalot para todo público). */
export { COMUNIDAD_AREAS, safeArea } from './kabalaComunidad';

export interface UsuarioBusqueda {
  user_id: string;
  full_name: string;
}

/**
 * Busca por nombre para invitar a un reto (cualquier género; si el reto termina mixto, se
 * vuelve anónimo solo). No devuelve nada con menos de 2 letras: no hay forma de "explorar" a
 * todos los usuarios, solo de encontrar a alguien puntual.
 */
export async function buscarParaRetar(query: string): Promise<UsuarioBusqueda[]> {
  if (query.trim().length < 2) return [];
  const { data, error } = await client().rpc('buscar_para_retar', { p_query: query });
  if (error) throw new RetoError(error.message);
  return (data ?? []) as UsuarioBusqueda[];
}

export interface MiReto {
  id: string;
  title: string;
  description: string;
  kind: KabalaKind;
  area: string;
  target_days: number;
  visibility: RetoVisibility;
  status: RetoStatus;
  invite_code: string;
  es_creador: boolean;
  mi_estado: ParticipanteEstado;
  mi_inicio: string | null;
  aceptaron: number;
  anonimo: boolean;
}

export async function listMisRetos(): Promise<MiReto[]> {
  const { data, error } = await client().rpc('list_mis_retos');
  if (error) throw new RetoError(error.message);
  return (data ?? []) as MiReto[];
}

export interface RetoPublico {
  id: string;
  title: string;
  description: string;
  kind: KabalaKind;
  area: string;
  target_days: number;
  invite_code: string;
  aceptaron: number;
  ya_participo: boolean;
}

export async function listRetosPublicos(): Promise<RetoPublico[]> {
  const { data, error } = await client().rpc('list_retos_publicos');
  if (error) throw new RetoError(error.message);
  return (data ?? []) as RetoPublico[];
}

export interface NuevoReto {
  title: string;
  description: string;
  kind: KabalaKind;
  area: string;
  targetDays: number;
  visibility: RetoVisibility;
  dayId: string;
  invitadoInicial?: string; // user_id, de buscarParaRetar
}

export async function crearReto(r: NuevoReto): Promise<{ id: string; invite_code: string }> {
  const { data, error } = await client().rpc('crear_reto', {
    p_title: r.title,
    p_description: r.description,
    p_kind: r.kind,
    p_area: r.area,
    p_target_days: r.targetDays,
    p_visibility: r.visibility,
    p_day_id: r.dayId,
    p_invitado_inicial: r.invitadoInicial ?? null,
  });
  if (error) throw new RetoError(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; invite_code: string };
  return row;
}

export async function invitarAReto(retoId: string, userId: string): Promise<void> {
  const { error } = await client().rpc('invitar_a_reto', { p_reto_id: retoId, p_user_id: userId });
  if (error) throw new RetoError(error.message);
}

/** Retractar una invitación que mandé, mientras siga sin responder. Solo quien invitó (o admin). */
export async function cancelarInvitacion(retoId: string, userId: string): Promise<void> {
  const { error } = await client().rpc('cancelar_invitacion_reto', { p_reto_id: retoId, p_user_id: userId });
  if (error) throw new RetoError(error.message);
}

export async function responderInvitacion(retoId: string, aceptar: boolean, dayId: string): Promise<void> {
  const { error } = await client().rpc('responder_invitacion_reto', { p_reto_id: retoId, p_aceptar: aceptar, p_day_id: dayId });
  if (error) throw new RetoError(error.message);
}

export interface RetoPorCodigo {
  id: string;
  title: string;
  description: string;
  kind: KabalaKind;
  area: string;
  target_days: number;
  visibility: RetoVisibility;
  status: RetoStatus;
  mi_estado: ParticipanteEstado;
  creador_etiqueta: string;
}

export async function getRetoByCode(code: string): Promise<RetoPorCodigo | null> {
  const { data, error } = await client().rpc('get_reto_by_code', { p_code: code });
  if (error) throw new RetoError(error.message);
  const rows = (data ?? []) as RetoPorCodigo[];
  return rows[0] ?? null;
}

/** Une (privado: es la invitación misma; público: te suscribes). Devuelve el id del reto. */
export async function unirsePorLink(code: string, dayId: string): Promise<string> {
  const { data, error } = await client().rpc('unirse_reto_por_link', { p_code: code, p_day_id: dayId });
  if (error) throw new RetoError(error.message);
  return data as string;
}

export async function marcarDiaReto(retoId: string, dayId: string, status: 'limpio' | 'caida'): Promise<void> {
  const { error } = await client().rpc('marcar_dia_reto', { p_reto_id: retoId, p_day_id: dayId, p_status: status });
  if (error) throw new RetoError(error.message);
}

export interface ParticipanteReto {
  user_id: string;
  etiqueta: string; // nombre real, "Tú", "Retador N" (anónimo), "… (invitación enviada)" o "… (rechazó)"
  soy_yo: boolean;
  dias_limpios: number;
  dias_caida: number;
  estado_hoy: 'limpio' | 'caida' | null;
  esperando: boolean; // invitación mandada, todavía sin responder
  rechazo: boolean; // rechazó la invitación (solo lo ve quien invitó, o admin)
  revelado: boolean; // ya se ve el nombre real (mismo género, o ambos se revelaron entre sí)
  pedi_revelar: boolean; // yo ya pedí verle su identidad a esta persona
  me_pidio_revelar: boolean; // esta persona ya me pidió ver la mía
}

export async function listParticipantesReto(retoId: string, dayId: string): Promise<ParticipanteReto[]> {
  const { data, error } = await client().rpc('list_participantes_reto', { p_reto_id: retoId, p_day_id: dayId });
  if (error) throw new RetoError(error.message);
  return (data ?? []) as ParticipanteReto[];
}

/**
 * Pedir ver la identidad real de otra persona del mismo reto (o retirar el pedido). Solo cuando
 * AMBOS lo piden entre sí se revelan los nombres — mientras uno no quiera, no sale a nadie.
 */
export async function pedirRevelarIdentidad(retoId: string, targetUserId: string): Promise<void> {
  const { error } = await client().rpc('pedir_revelar_identidad', { p_reto_id: retoId, p_target_user: targetUserId });
  if (error) throw new RetoError(error.message);
}

export async function quitarPeticionRevelar(retoId: string, targetUserId: string): Promise<void> {
  const { error } = await client().rpc('quitar_peticion_revelar', { p_reto_id: retoId, p_target_user: targetUserId });
  if (error) throw new RetoError(error.message);
}

export async function abandonarReto(retoId: string): Promise<void> {
  const { error } = await client().rpc('abandonar_reto', { p_reto_id: retoId });
  if (error) throw new RetoError(error.message);
}

export async function reportarReto(retoId: string, reportedUser: string, reason: string): Promise<void> {
  const { error } = await client().rpc('reportar_reto', { p_reto_id: retoId, p_reported_user: reportedUser, p_reason: reason });
  if (error) throw new RetoError(error.message);
}

/* ───────────────────────── Solo admin ───────────────────────── */

export interface RetoAdmin {
  id: string;
  title: string;
  description: string;
  visibility: RetoVisibility;
  status: RetoStatus;
  created_by: string;
  creador: string;
  created_at: string;
  participantes: number;
}

export async function listRetosAdmin(): Promise<RetoAdmin[] | null> {
  const { data, error } = await client().rpc('list_retos_admin');
  if (error) return null;
  return (data ?? []) as RetoAdmin[];
}

export async function aprobarReto(id: string, aprobar: boolean): Promise<void> {
  const { error } = await client().rpc('aprobar_reto', { p_id: id, p_aprobar: aprobar });
  if (error) throw new RetoError(error.message);
}

export async function deleteRetoAdmin(id: string): Promise<void> {
  const { error } = await client().rpc('delete_reto_admin', { p_id: id });
  if (error) throw new RetoError(error.message);
}

export interface ReporteReto {
  id: string;
  reto_id: string;
  reto_titulo: string;
  reported_user: string;
  reported_nombre: string;
  reported_by: string;
  reporter_nombre: string;
  reason: string;
  resolved: boolean;
  blocked: boolean;
  created_at: string;
}

export async function listReportesRetos(): Promise<ReporteReto[] | null> {
  const { data, error } = await client().rpc('list_reportes_retos');
  if (error) return null;
  return (data ?? []) as ReporteReto[];
}

export async function resolverReporte(id: string, bloquear: boolean): Promise<void> {
  const { error } = await client().rpc('resolver_reporte', { p_id: id, p_bloquear: bloquear });
  if (error) throw new RetoError(error.message);
}

export async function setRetosBloqueadoPorCorreo(email: string, bloqueado: boolean): Promise<void> {
  const { error } = await client().rpc('set_retos_bloqueado_by_email', { p_email: email, p_bloqueado: bloqueado });
  if (error) throw new RetoError(error.message);
}
