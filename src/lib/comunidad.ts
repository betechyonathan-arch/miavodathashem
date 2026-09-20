/*
  «No estás solo»: cuánta gente más está sirviendo ahora mismo o entró hoy.

  Del servidor llegan SOLO DOS NÚMEROS (supabase/comunidad.sql): nunca quiénes son ni nada de
  lo que registran. Quien pregunta no se cuenta a sí misma, así que el número son los demás.
*/
import { backendConfigured, supabase } from './supabase';

export interface Presence {
  /** Otras personas con la app abierta en este momento. */
  ahora: number;
  /** Otras personas que entraron en las últimas 24 horas. */
  hoy: number;
}

const KEY = 'avodah.presencia';

/** Lo último que se supo, para que la pantalla de kaváná no tenga que esperar ni tener conexión. */
export function cachedPresence(): Presence | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Presence) : null;
  } catch {
    return null;
  }
}

/** Pregunta al servidor y guarda la respuesta. `null` si no se pudo (sin conexión, o falta el SQL). */
export async function fetchPresence(): Promise<Presence | null> {
  if (!backendConfigured || !supabase) return null;
  const { data, error } = await supabase.rpc('community_presence');
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as Presence | undefined;
  if (!row || typeof row.hoy !== 'number') return null;
  const p: Presence = { ahora: Math.max(0, row.ahora ?? 0), hoy: Math.max(0, row.hoy ?? 0) };
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  return p;
}

/**
 * La frase más cálida que sea VERDAD, o null si no hay nadie más (mejor callar que decir «0 personas»).
 * Se prefiere «ahora mismo» porque acompaña de verdad; si no hay nadie en línea, vale el día.
 */
export function presenceLine(p: Presence | null): string | null {
  if (!p) return null;
  if (p.ahora === 1) return 'Ahora mismo, otra persona está sirviendo contigo';
  if (p.ahora > 1) return `Ahora mismo, otras ${p.ahora} personas están sirviendo contigo`;
  if (p.hoy === 1) return 'Hoy, otra persona entró a servir';
  if (p.hoy > 1) return `Hoy, otras ${p.hoy} personas entraron a servir`;
  return null;
}
