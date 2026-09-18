/*
  Cuentas. Nombre + correo + contraseña + género.

  Dos modos, según `.env.local`:
   · CON Supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY): cuentas reales en el
     servidor — entrar desde cualquier dispositivo, roles y panel de admin.
   · SIN Supabase: cuentas locales, guardadas solo en este navegador (para probar).
     La contraseña nunca se guarda: solo un hash PBKDF2-SHA256 con sal aleatoria.

  El resto de la app solo usa las funciones exportadas de aquí y `session.ts`.
*/

import Dexie, { type Table } from 'dexie';
import { backendConfigured, supabase } from '../supabase';
import { clearSession, getSession, setSession, type Gender, type Session } from './session';

export const MIN_PASSWORD = 8;

export class AuthError extends Error {}

const normEmail = (e: string) => e.trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateRegistration(name: string, email: string, password: string, gender: Gender | null) {
  if (name.trim().length < 2) throw new AuthError('Escribe tu nombre.');
  if (gender !== 'hombre' && gender !== 'mujer') throw new AuthError('Elige si eres hombre o mujer.');
  if (!EMAIL_RE.test(normEmail(email))) throw new AuthError('El correo no es válido.');
  if (password.length < MIN_PASSWORD) throw new AuthError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
}

export interface RegisterResult {
  /** null = el servidor pide confirmar el correo antes de entrar. */
  session: Session | null;
}

// ═════════════════════════ Supabase ═════════════════════════

interface ProfileRow {
  full_name: string;
  gender: Gender | null;
  role: 'user' | 'admin';
  disabled: boolean;
}

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, gender, role, disabled')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new AuthError('No se pudo leer tu perfil. Intenta de nuevo.');
  return (data as ProfileRow | null) ?? null;
}

/** Guarda la sesión local a partir del perfil del servidor. Rechaza cuentas desactivadas. */
async function sessionFromServer(userId: string, email: string): Promise<Session> {
  const p = await loadProfile(userId);
  if (p?.disabled) {
    await supabase?.auth.signOut();
    clearSession();
    throw new AuthError('Esta cuenta está desactivada. Contacta al administrador.');
  }
  const session: Session = {
    userId,
    name: p?.full_name || email,
    email,
    gender: p?.gender ?? 'hombre',
    isAdmin: p?.role === 'admin',
  };
  setSession(session);
  // Las llamadas de supabase-js son perezosas: sin .then() nunca se envían.
  supabase?.rpc('touch_last_seen').then(
    () => undefined,
    () => undefined, // registrar el acceso es secundario; si falla, no estorba
  );
  return session;
}

function friendlyAuthMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Falta confirmar tu correo. Revisa tu bandeja y abre el enlace.';
  if (m.includes('already registered')) return 'Ya existe una cuenta con ese correo. Entra con tu contraseña.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  if (m.includes('fetch') || m.includes('network')) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  return 'No se pudo completar. Intenta de nuevo.';
}

async function serverRegister(name: string, email: string, password: string, gender: Gender): Promise<RegisterResult> {
  const e = normEmail(email);
  const { data, error } = await supabase!.auth.signUp({
    email: e,
    password,
    options: { data: { full_name: name.trim(), gender } },
  });
  if (error) throw new AuthError(friendlyAuthMessage(error.message));
  // Con la confirmación de correo activa, un correo ya registrado no da error: vuelve sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    throw new AuthError('Ya existe una cuenta con ese correo. Entra con tu contraseña.');
  }
  if (!data.session || !data.user) return { session: null };
  return { session: await sessionFromServer(data.user.id, e) };
}

async function serverLogin(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase!.auth.signInWithPassword({ email: normEmail(email), password });
  if (error || !data.user) throw new AuthError(friendlyAuthMessage(error?.message ?? ''));
  return sessionFromServer(data.user.id, normEmail(email));
}

// ═════════════════════════ Local (sin servidor) ═════════════════════════

interface UserRow {
  id: string;
  name: string;
  email: string; // en minúsculas, único
  gender: Gender;
  salt: string; // base64
  hash: string; // base64
  iterations: number;
  createdAt: string;
}

class AccountsDB extends Dexie {
  users!: Table<UserRow, string>;
  constructor() {
    super('avodah_cuentas');
    this.version(1).stores({ users: 'id, &email' });
  }
}

const accounts = new AccountsDB();
const ITERATIONS = 210_000;

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return b64(bits);
}

async function localRegister(name: string, email: string, password: string, gender: Gender): Promise<RegisterResult> {
  const e = normEmail(email);
  if (await accounts.users.where('email').equals(e).first()) {
    throw new AuthError('Ya existe una cuenta con ese correo. Entra con tu contraseña.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const row: UserRow = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: e,
    gender,
    salt: b64(salt),
    hash: await derive(password, salt, ITERATIONS),
    iterations: ITERATIONS,
    createdAt: new Date().toISOString(),
  };
  await accounts.users.add(row);
  const session: Session = { userId: row.id, name: row.name, email: row.email, gender };
  setSession(session);
  return { session };
}

async function localLogin(email: string, password: string): Promise<Session> {
  const row = await accounts.users.where('email').equals(normEmail(email)).first();
  // Mismo mensaje para "no existe" y "contraseña mala": no revela qué correos existen.
  const bad = new AuthError('Correo o contraseña incorrectos.');
  if (!row) throw bad;
  const hash = await derive(password, unb64(row.salt), row.iterations);
  if (hash !== row.hash) throw bad;
  const session: Session = { userId: row.id, name: row.name, email: row.email, gender: row.gender ?? 'hombre' };
  setSession(session);
  return session;
}

// ═════════════════════════ API pública ═════════════════════════

export async function register(name: string, email: string, password: string, gender: Gender | null): Promise<RegisterResult> {
  validateRegistration(name, email, password, gender);
  const g = gender as Gender;
  return backendConfigured ? serverRegister(name, email, password, g) : localRegister(name, email, password, g);
}

export async function login(email: string, password: string): Promise<Session> {
  return backendConfigured ? serverLogin(email, password) : localLogin(email, password);
}

/** Corrige el género de la cuenta activa. Cambia qué preguntas y mitzvot se muestran. */
export async function updateGender(gender: Gender): Promise<void> {
  const s = getSession();
  if (!s) return;
  if (backendConfigured) {
    const { error } = await supabase!.rpc('update_my_profile', { p_name: null, p_gender: gender });
    if (error) throw new AuthError('No se pudo guardar el cambio.');
  } else {
    await accounts.users.update(s.userId, { gender });
  }
  setSession({ ...s, gender });
}

export async function logout(): Promise<void> {
  try {
    await supabase?.auth.signOut();
  } finally {
    clearSession();
  }
}

/**
 * Al abrir la app: confirma con el servidor que la sesión sigue vigente y refresca rol,
 * género y estado (una cuenta desactivada o un cambio de admin se aplican aquí).
 * Sin conexión conserva la sesión local para poder seguir usando la app.
 */
export async function validateSession(): Promise<void> {
  if (!backendConfigured || !supabase) return;
  const local = getSession();
  let userId: string | undefined;
  let email = '';
  try {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id;
    email = data.session?.user.email ?? '';
  } catch {
    return; // sin red: se queda como está
  }
  if (!userId) {
    if (local) clearSession(); // la sesión del servidor caducó
    return;
  }
  try {
    await sessionFromServer(userId, email || local?.email || '');
  } catch (e) {
    if (e instanceof AuthError && /desactivada/.test(e.message)) return; // ya se limpió la sesión
    // otro fallo (p. ej. red): se conserva la sesión local
  }
}

// ═════════════════════════ Recuperar contraseña ═════════════════════════

/**
 * Pide el correo con el enlace para crear una contraseña nueva. La respuesta al usuario es
 * siempre la misma exista o no la cuenta, para no revelar qué correos están registrados.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const e = normEmail(email);
  if (!EMAIL_RE.test(e)) throw new AuthError('El correo no es válido.');
  if (!supabase) throw new AuthError('Recuperar la contraseña necesita el servidor.');
  const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: `${window.location.origin}/` });
  if (error && /rate limit|too many|security purposes|seconds/i.test(error.message)) {
    throw new AuthError('Espera un momento antes de pedir otro enlace.');
  }
}

/** ¿Se abrió la app desde el enlace de recuperación del correo? */
export function isRecoveryLink(): boolean {
  return backendConfigured && /[#&]type=recovery/.test(window.location.hash);
}

/** El enlace venció o ya se usó (Supabase lo avisa en la URL). */
export function recoveryLinkError(): string {
  return /error_code=otp_expired|error=access_denied/.test(window.location.hash)
    ? 'El enlace venció o ya se usó. Pide uno nuevo.'
    : '';
}

/** ¿Hay una sesión de recuperación válida (creada al abrir el enlace)? */
export async function hasRecoverySession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/** Cambia la contraseña con la sesión de recuperación y cierra esa sesión: se entra con la nueva. */
export async function setNewPassword(password: string): Promise<void> {
  if (password.length < MIN_PASSWORD) throw new AuthError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
  if (!supabase) throw new AuthError('Falta el servidor.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different from the old/i.test(error.message)) throw new AuthError('Elige una contraseña distinta a la anterior.');
    if (/weak|short|at least/i.test(error.message)) throw new AuthError('Esa contraseña es muy débil. Usa una más larga.');
    throw new AuthError('No se pudo cambiar la contraseña. Pide un enlace nuevo.');
  }
  await supabase.auth.signOut();
  clearSession();
}
