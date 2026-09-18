/*
  Lógica pura de una Kabalá con fecha (p. ej. 40 días de kedushá / shemirat
  habrit). No toca la base: recibe la Kabalá y "hoy", devuelve el progreso.
  §60: una caída se responde con el regreso; nada aquí llama fracaso ni implica
  que Hashem retiene la yeshuá.
*/
import type { Kabala, KabalaDayStatus } from './db/schema';
import { civilDateKey, keyToNoon } from './jewishDay';

export const KABALA_MILESTONES = [7, 18, 30, 40];

export interface KabalaProgress {
  /** Días que cuentan hacia la meta (limpios totales en 'acumulativo';
   *  racha actual en 'racha'). */
  cleanDays: number;
  /** Días marcados como caída. */
  fallDays: number;
  /** Días transcurridos desde el inicio, hoy incluido. */
  elapsedDays: number;
  target: number;
  /** 0..1 hacia la meta. */
  pct: number;
  /** Días limpios que faltan para completar. */
  remaining: number;
  /** Estado de hoy si ya está marcado. */
  todayStatus: KabalaDayStatus | null;
  todayKey: string;
  done: boolean;
  /** Próximo hito no alcanzado (7 / 18 / 30 / 40) o null. */
  nextMilestone: number | null;
  /** Hitos ya alcanzados por `cleanDays` pero aún no celebrados. */
  milestonesToCelebrate: number[];
  /** Últimos N días como tira para la UI (del más viejo al más nuevo). */
  strip: { key: string; status: KabalaDayStatus | 'sin' }[];
}

function daysBetween(fromKey: string, toKey: string): number {
  const a = keyToNoon(fromKey).getTime();
  const b = keyToNoon(toKey).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * @param todayKey  Clave del día "de hoy" para marcar/contar. Por defecto la
 *   fecha civil local, pero conviene pasar el `dayId` halájico del store para
 *   que la kabalá se archive bajo el mismo día que los registros.
 */
export function kabalaProgress(
  k: Kabala,
  now: Date = new Date(),
  todayKey: string = civilDateKey(now),
  stripLen = 14,
): KabalaProgress {
  const elapsedRaw = daysBetween(k.startDayId, todayKey) + 1;
  const elapsedDays = Math.max(1, elapsedRaw);

  const marks = k.days ?? {};
  const fallDays = Object.values(marks).filter((d) => d.status === 'caida').length;

  let cleanDays: number;
  if (k.mode === 'acumulativo') {
    cleanDays = Object.values(marks).filter((d) => d.status === 'limpio').length;
  } else {
    // Racha: se recorre día a día desde el inicio hasta hoy.
    let run = 0;
    const span = Math.max(1, daysBetween(k.startDayId, todayKey) + 1);
    for (let i = 0; i < span; i++) {
      const key = civilDateKey(new Date(keyToNoon(k.startDayId).getTime() + i * 86_400_000));
      const m = marks[key];
      if (!m) continue; // día sin marcar: no suma ni rompe
      if (m.status === 'limpio') run += 1;
      else if (k.onFall === 'reinicia') run = 0;
      // 'continua' / 'pausa': la caída no incrementa pero tampoco rompe
    }
    cleanDays = run;
  }

  const target = k.targetDays;
  const done = cleanDays >= target;
  const pct = Math.min(1, cleanDays / target);
  const remaining = Math.max(0, target - cleanDays);

  const seen = new Set(k.milestonesSeen ?? []);
  const nextMilestone = KABALA_MILESTONES.find((m) => m > cleanDays && m <= target) ?? null;
  const milestonesToCelebrate = KABALA_MILESTONES.filter((m) => m <= cleanDays && !seen.has(m));

  const strip: KabalaProgress['strip'] = [];
  for (let i = stripLen - 1; i >= 0; i--) {
    const d = new Date(keyToNoon(todayKey).getTime() - i * 86_400_000);
    const key = civilDateKey(d);
    if (daysBetween(k.startDayId, key) < 0) continue; // antes del inicio
    strip.push({ key, status: marks[key]?.status ?? 'sin' });
  }

  return {
    cleanDays,
    fallDays,
    elapsedDays,
    target,
    pct,
    remaining,
    todayStatus: marks[todayKey]?.status ?? null,
    todayKey,
    done,
    nextMilestone,
    milestonesToCelebrate,
    strip,
  };
}

/** Kavaná por defecto de la kabalá de 40 días de kedushá para el zivug. */
export const KABALA_KEDUSHA_PRESET = {
  he: 'מ׳ יוֹם שֶׁל קְדֻשָּׁה',
  es: '40 días de kedushá',
  kavana:
    'לִזְכּוֹת לִמְצֹא בִּמְהֵרָה אֶת זִוּוּגִי הַהָגוּן · Que por el zejut de esta kedushá (shemirat habrit) Hashem me conceda pronto mi zivug hagun.',
  area: 'kedushah' as const,
  targetDays: 40,
  mode: 'acumulativo' as const,
  onFall: 'pausa' as const,
};
