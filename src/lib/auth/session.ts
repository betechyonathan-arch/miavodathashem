/*
  Sesión local. Solo guarda quién está dentro (id, nombre, email) en localStorage.
  Es un módulo mínimo y sin dependencias porque lo importa db.ts al arrancar: el
  nombre de la base de datos de cada usuario sale de aquí.
*/

const KEY = 'avodah.session';

export type Gender = 'hombre' | 'mujer';

export interface Session {
  userId: string;
  name: string;
  email: string;
  gender: Gender;
  /** Solo para mostrar u ocultar el panel. La autoridad real es la base de datos (RLS). */
  isAdmin?: boolean;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s && typeof s.userId === 'string' && s.userId ? s : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

/** Cada usuario tiene su propia base de datos: sus datos nunca se mezclan con los de otro. */
export function dbNameForSession(): string {
  const s = getSession();
  return s ? `avodah_u_${s.userId}` : 'avodah_sin_sesion';
}
