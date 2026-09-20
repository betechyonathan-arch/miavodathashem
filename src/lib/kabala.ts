/*
  Lógica pura de una Kabalá con fecha (p. ej. 40 días de kedushá / shemirat
  habrit, o un Tehilim diario). No toca la base: recibe la Kabalá y "hoy", devuelve el progreso.
  §60: una caída se responde con el regreso; nada aquí llama fracaso ni implica
  que Hashem retiene la yeshuá.
*/
import type { AreaId, Kabala, KabalaDayStatus, KabalaKind } from './db/schema';
import type { Gender } from './gender';
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

// ───────────────────────── Sugerencias ─────────────────────────

/** Una sugerencia de kabalá: la persona la puede aceptar tal cual o editarla antes de empezar. */
export interface KabalaPreset {
  id: string;
  /** Solo se sugiere a este género. Sin `for`, es para todos. */
  for?: Gender;
  kind: KabalaKind;
  es: string;
  he: string;
  blurb: string;
  days: number;
  area: AreaId;
  /** Kavaná (para qué la haces) que se propone; la persona puede cambiarla. */
  kavana: string;
  /** Si la kabalá es "por alguien": pide a quién y arma la kavaná con ese nombre. */
  subject?: {
    label: string;
    hint: string;
    kavanaFor: (name: string) => string;
  };
}

export const KABALA_PRESETS: KabalaPreset[] = [
  {
    id: 'cuidar-vista',
    for: 'hombre',
    kind: 'cuidar',
    es: 'Cuidar la vista',
    he: 'שְׁמִירַת עֵינַיִם',
    blurb:
      'Shemirat einayim: cuidar lo que miras en la calle y en las pantallas. Cada día que cuidas, cuenta; y si caes, lo que sigue es el regreso.',
    days: 40,
    area: 'kedushah',
    kavana: 'Cuidar mis ojos para que lo que veo me acerque a Hashem.',
  },
  {
    id: 'tehilim-por-alguien',
    for: 'mujer',
    kind: 'hacer',
    es: 'Un Tehilim diario por alguien',
    he: 'תְּהִלִּים',
    blurb:
      'Decir cada día un capítulo de Tehilim por una persona con la que te cuesta la relación, pidiendo que le vaya bien. Limpia el corazón y cambia la forma de mirarla.',
    days: 40,
    area: 'tefillah',
    kavana: 'Que a esa persona le vaya muy bien, y que mi corazón esté limpio con ella.',
    subject: {
      label: '¿Por quién? (opcional)',
      hint: 'Puedes escribir un nombre o solo "una amiga". Solo tú lo ves.',
      kavanaFor: (name) =>
        `Que a ${name} le vaya muy bien en todo, y que mi corazón esté limpio con ella.`,
    },
  },
  {
    id: 'tehilim-diario',
    kind: 'hacer',
    es: 'Un capítulo de Tehilim al día',
    he: 'תְּהִלִּים',
    blurb: 'Un capítulo de Tehilim cada día, a la hora que te quede bien.',
    days: 30,
    area: 'tefillah',
    kavana: 'Acercarme a Hashem cada día con las palabras de David HaMélej.',
  },
  {
    id: 'cuidar-habla',
    kind: 'cuidar',
    es: 'Cuidar mi habla',
    he: 'שְׁמִירַת הַלָּשׁוֹן',
    blurb: 'Un día limpio es un día sin lashón hará: ni hablarlo ni escucharlo sin frenarlo.',
    days: 30,
    area: 'speech',
    kavana: 'Que mi boca sea para bendecir y construir.',
  },
  {
    id: 'jesed-diario',
    kind: 'hacer',
    es: 'Un acto de jésed al día',
    he: 'גְּמִילוּת חֲסָדִים',
    blurb: 'Una cosa concreta cada día por otra persona, aunque sea pequeña.',
    days: 30,
    area: 'ben_adam',
    kavana: 'Que mis manos sirvan a los demás cada día.',
  },
];

/** Las sugerencias que le corresponden a esta persona; la primera es la recomendada para su género. */
export function presetsFor(gender: Gender): KabalaPreset[] {
  return KABALA_PRESETS.filter((p) => !p.for || p.for === gender);
}

export const PRESET_BY_ID: Record<string, KabalaPreset> = Object.fromEntries(
  KABALA_PRESETS.map((p) => [p.id, p]),
);

// ───────────────────────── Textos según el tipo ─────────────────────────

export interface KindCopy {
  /** Botón de "hoy sí". */
  done: string;
  /** Botón de "hoy no". */
  miss: string;
  /** Aviso cuando hoy está marcado como cumplido. */
  doneToday: string;
  /** Aviso cuando hoy está marcado como no cumplido. */
  missToday: string;
  /** Cómo se llama un día que cuenta. */
  unit: string;
  unitPlural: string;
  /** Pregunta al confirmar. */
  confirmDone: string;
  /** Texto del cuadro de apoyo, con su título. */
  supportTitle: string;
  support: string[];
  /** Explicación del cuadro de "hoy no". */
  missSheet: string;
}

export const KIND_COPY: Record<KabalaKind, KindCopy> = {
  cuidar: {
    done: 'שמרתי · Cuidé hoy',
    miss: 'Caí',
    doneToday: 'שָׁמַרְתִּי הַיּוֹם · Hoy cuidaste. חזק ואמץ.',
    missToday:
      'Registraste una caída hoy. El regreso ya empezó al escribirlo. Mañana de nuevo, sin arrastrar la culpa.',
    unit: 'día cuidado',
    unitPlural: 'días cuidados',
    confirmDone: '¿Marcar hoy como día cuidado?',
    supportTitle: 'Cuando pega el momento',
    support: [
      'Párate. Cambia de cuarto, mira hacia otro lado, suelta el teléfono.',
      'Un capítulo de Tehilim — el 51: "Lev tahor bará li Elokim".',
      'Dos minutos de hitbodedut: pídele ayuda a Hashem con tus propias palabras.',
    ],
    missSheet:
      'Registrar la caída no es castigo: es la verdad, y la verdad es el principio del regreso. Levántate ahora, sin arrastrar la culpa.',
  },
  hacer: {
    done: 'Lo hice hoy',
    miss: 'Hoy no pude',
    doneToday: 'Hoy lo hiciste. חזק ואמץ.',
    missToday: 'Hoy no llegaste. No pasa nada: mañana de nuevo, sin arrastrar culpa.',
    unit: 'día cumplido',
    unitPlural: 'días cumplidos',
    confirmDone: '¿Marcar hoy como cumplido?',
    supportTitle: 'Si el día se complica',
    support: [
      'Aunque sea un versículo o un minuto: poco es mejor que nada.',
      'Ponle una hora fija (después de Shajarit, antes de dormir) y se vuelve costumbre.',
      'Si un día no llegas, no lo arrastres: retómalo mañana.',
    ],
    missSheet:
      'Anotar que hoy no pudiste no es un fracaso: es solo la verdad del día. Mañana empiezas de nuevo.',
  },
};

export const kindOf = (k: Pick<Kabala, 'kind'>): KabalaKind => k.kind ?? 'cuidar';

/** Metas que se ofrecen como atajos; la persona puede escribir cualquier número entre 1 y 365. */
export const TARGET_SHORTCUTS = [7, 18, 30, 40, 90];
