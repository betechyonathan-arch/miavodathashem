/*
  Acciones y lecturas del panel de admin. La autorización NO se decide aquí: cada llamada la
  valida la base de datos (supabase/schema.sql y admin-auditoria.sql). Si quien llama no es
  admin, el servidor la rechaza aunque alguien fuerce la pantalla desde el navegador.

  El panel muestra QUIÉN es cada persona, CUÁNDO entra y que registró ALGO. Nunca qué registró:
  eso vive solo en su dispositivo y no existe en el servidor.
*/
import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  gender: 'hombre' | 'mujer' | null;
  role: 'user' | 'admin';
  disabled: boolean;
  created_at: string;
  last_seen_at: string | null;
  last_login_at: string | null;
  login_count: number;
  referred_by: string | null;
  referral_code: string | null;
}

export type EventKind =
  | 'registro'
  | 'entrada'
  | 'admin_otorgado'
  | 'admin_quitado'
  | 'cuenta_desactivada'
  | 'cuenta_activada'
  | 'cuenta_borrada'
  | 'actividad'
  | 'aporte_enviado'
  | 'aporte_aprobado'
  | 'aporte_rechazado'
  | 'kabala_aceptada'
  | 'encuesta_respondida'
  | 'reto_creado'
  | 'reto_aceptado'
  | 'reto_rechazado'
  | 'reto_denunciado'
  | 'reto_usuario_bloqueado'
  | 'reto_usuario_desbloqueado'
  | 'cadena_creada'
  | 'cadena_completada';

export interface AdminEvent {
  id: number;
  at: string;
  kind: EventKind;
  user_id: string | null;
  actor_id: string | null;
  detail: {
    nombre?: string;
    correo?: string;
    genero?: string | null;
    invitado_por?: string | null;
    /** actividad: cuántas veces registró algo seguidas (nunca qué). */
    veces?: number;
    /** aportes: dvar | musar | pirush, y si lo mandó un admin (se publica directo). */
    tipo?: string;
    directo?: boolean;
    /** kabala_aceptada: el título de la kabalá para todos que aceptó. */
    kabala?: string;
    /** encuesta_respondida: el título de la encuesta que respondió. */
    encuesta?: string;
    /** retos: el título del reto involucrado; visibilidad si fue "publico" o "privado". */
    reto?: string;
    visibilidad?: string;
    /** cadenas de Tehilim: el motivo/título de la cadena. */
    cadena?: string;
  };
}

export class AdminError extends Error {}

function client() {
  if (!supabase) throw new AdminError('El servidor no está configurado.');
  return supabase;
}

function fail(message: string): never {
  throw new AdminError(message || 'No se pudo completar la acción.');
}

const BASE_COLS = 'id, email, full_name, gender, role, disabled, created_at, last_seen_at';
const EXT_COLS = `${BASE_COLS}, last_login_at, login_count, referred_by, referral_code`;

export interface UserList {
  users: AdminUser[];
  /** false = todavía no se ejecutó supabase/admin-auditoria.sql: faltan entradas y bitácora. */
  extended: boolean;
}

export async function listUsers(): Promise<UserList> {
  const c = client();
  const full = await c.from('profiles').select(EXT_COLS).order('created_at', { ascending: false });
  if (!full.error) return { users: (full.data ?? []) as AdminUser[], extended: true };

  // Sin la auditoría instalada faltan columnas: se cae a lo básico en vez de romper el panel.
  const base = await c.from('profiles').select(BASE_COLS).order('created_at', { ascending: false });
  if (base.error) fail(base.error.message);
  const users = ((base.data ?? []) as Partial<AdminUser>[]).map((u) => ({
    last_login_at: null,
    login_count: 0,
    referred_by: null,
    referral_code: null,
    ...u,
  })) as AdminUser[];
  return { users, extended: false };
}

/** La bitácora (más reciente primero). null = todavía no está instalada. */
export async function listEvents(limit = 300): Promise<AdminEvent[] | null> {
  const { data, error } = await client()
    .from('audit_events')
    .select('id, at, kind, user_id, actor_id, detail')
    .order('at', { ascending: false })
    .limit(limit);
  if (error) return null;
  return (data ?? []) as AdminEvent[];
}

export async function setAdmin(userId: string, admin: boolean): Promise<void> {
  const { error } = await client().rpc('set_admin', { p_user: userId, p_admin: admin });
  if (error) fail(error.message);
}

export async function addAdminByEmail(email: string): Promise<void> {
  const { error } = await client().rpc('set_admin_by_email', { p_email: email });
  if (error) fail(error.message);
}

export async function setDisabled(userId: string, disabled: boolean): Promise<void> {
  const { error } = await client().rpc('set_disabled', { p_user: userId, p_disabled: disabled });
  if (error) fail(error.message);
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await client().rpc('admin_delete_user', { p_user: userId });
  if (error) fail(error.message);
}
