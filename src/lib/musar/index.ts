/*
  מוסר — selección de frases.

  En vez de una frase al azar, se elige por lo que está pasando: si caíste hoy
  pesa תשובה; si el día va vacío pesa זריזות; en Elul y en los Diez Días pesa
  תשובה; si no, rota entre prioridad y exigencia. Siempre filtrada al nivel de
  exigencia (una frase 'demanding' no aparece en modo suave).

  La frase es estable durante la sesión (no marea) y cambia sola cuando el día
  judío cambia con la app abierta, igual que antes.
*/
import { MUSAR, type MusarLine, type MusarTheme, type MusarTone } from './corpus';

export { MUSAR, MUSAR_BY_ID, MUSAR_THEMES } from './corpus';
export type { MusarLine, MusarTheme, MusarTone } from './corpus';

export type MusarSlot = 'morning' | 'afternoon' | 'evening';

export interface MusarContext {
  strictness: MusarTone;
  fellToday?: boolean;
  recoveredToday?: boolean;
  emptyDayMidday?: boolean;
  strongDay?: boolean;
  isElul?: boolean;
  isAseretYemeiTeshuva?: boolean;
  isShabbat?: boolean;
  /** Temas preferidos del usuario (Ajustes). Vacío = sin preferencia. */
  preferred?: MusarTheme[];
  /** Franja del recordatorio, si la frase es para una notificación. */
  slot?: MusarSlot;
}

const TONE_RANK: Record<MusarTone, number> = { gentle: 0, firm: 1, demanding: 2 };

/**
 * Temas que pesan según el contexto, de más a menos relevante. Se mezclan a
 * propósito los dos registros — cercanía/anhelo (prioridad, teshuvá) y sacudida
 * (exigencia, zman) — para que el musar tenga sentimiento y no solo exigencia.
 */
export function themeBias(ctx: MusarContext): MusarTheme[] {
  if (ctx.fellToday && !ctx.recoveredToday) return ['teshuva', 'prioridad', 'exigencia'];
  if (ctx.recoveredToday) return ['teshuva', 'simja', 'prioridad'];
  if (ctx.isAseretYemeiTeshuva) return ['teshuva', 'prioridad', 'zman', 'exigencia'];
  if (ctx.isElul) return ['teshuva', 'prioridad', 'exigencia'];
  if (ctx.isShabbat) return ['simja', 'prioridad', 'teshuva'];
  if (ctx.strongDay) return ['simja', 'prioridad', 'exigencia'];
  if (ctx.emptyDayMidday) return ['exigencia', 'zman', 'prioridad'];
  if (ctx.slot === 'morning') return ['prioridad', 'exigencia', 'simja'];
  if (ctx.slot === 'afternoon') return ['exigencia', 'zman', 'prioridad'];
  if (ctx.slot === 'evening') return ['teshuva', 'prioridad', 'exigencia'];
  return ['prioridad', 'teshuva', 'exigencia', 'zman', 'anava'];
}

function allowedByTone(line: MusarLine, s: MusarTone): boolean {
  return TONE_RANK[line.tone] <= TONE_RANK[s];
}

/** Todas las frases de un tema, respetando el nivel de exigencia. */
export function linesForTheme(theme: MusarTheme, strictness: MusarTone = 'demanding'): MusarLine[] {
  return MUSAR.filter((l) => l.theme === theme && allowedByTone(l, strictness));
}

/** Construye el conjunto del que se va a elegir, de más específico a más amplio. */
function pool(ctx: MusarContext): MusarLine[] {
  const byTone = MUSAR.filter((l) => allowedByTone(l, ctx.strictness));
  const bias = themeBias(ctx);

  // 1. los dos temas con más peso (mezcla de registros) + preferencia del usuario
  const top = new Set<MusarTheme>([bias[0], bias[1]].filter(Boolean) as MusarTheme[]);
  for (const t of ctx.preferred ?? []) top.add(t);
  let p = byTone.filter((l) => top.has(l.theme));
  if (p.length >= 3) return p;

  // 2. todos los temas del bias
  p = byTone.filter((l) => bias.includes(l.theme));
  if (p.length >= 3) return p;

  // 3. cualquier frase permitida por el tono
  if (byTone.length) return byTone;

  // 4. red de seguridad: todo
  return MUSAR;
}

// Sal de sesión: estable hasta un reshuffle explícito (cambio de día judío).
let salt = Math.random().toString(36).slice(2);

/** Cambia la frase de la sesión (se llama al rodar el día judío). */
export function reshuffleMusar(): void {
  salt = Math.random().toString(36).slice(2);
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * La frase de musar para este contexto. Determinista dado (contexto + sal de
 * sesión): estable mientras no cambie ni el contexto ni el día.
 */
export function pickMusar(ctx: MusarContext, seed = ''): MusarLine {
  const p = pool(ctx);
  const sig = [salt, seed, ctx.strictness, themeBias(ctx).join(','), (ctx.preferred ?? []).join(',')].join('|');
  return p[hash(sig) % p.length] ?? MUSAR[0];
}

/** Búsqueda simple por texto (hebreo, castellano o fuente). */
export function searchMusar(q: string): MusarLine[] {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  return MUSAR.filter(
    (l) =>
      l.es.toLowerCase().includes(n) ||
      l.he?.includes(q.trim()) ||
      l.sourceEs?.toLowerCase().includes(n) ||
      l.source?.includes(q.trim()),
  );
}
