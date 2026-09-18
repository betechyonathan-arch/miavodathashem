/*
  Motor de DÍA JUDÍO.
  El día NO es 00:00–23:59. El día hebreo cambia al anochecer (shkiá o tzet,
  configurable) según la ubicación. Todos los cálculos halájicos vienen de
  @hebcal/core (fuente confiable) — aquí no se inventan horarios.
  Se permite corrección manual por día (settings.dayBoundaryOverrides).
*/
import { HDate, HebrewCalendar, Location, Zmanim, flags } from '@hebcal/core';
import type { Settings } from './db/schema';

export interface Zmanei {
  alotHaShachar: Date;
  sunrise: Date;
  sunset: Date;
  tzeit: Date;
}

export interface JewishDayInfo {
  dayId: string; // ancla civil ISO (YYYY-MM-DD) — identificador estable del día
  hebrewDate: string; // "17 Elul 5786"
  hebrewDateHe: string; // "י״ז אֱלוּל תשפ״ו"
  hebrewYear: number;
  hebrewMonth: string;
  hebrewDay: number;
  civilAnchor: string;
  startsAt: string; // ISO — anochecer previo
  endsAt: string; // ISO — anochecer
  boundaryMode: 'shkia' | 'tzeit';
  dowAnchor: number; // 0=Dom .. 6=Sáb (día civil de la parte diurna, halájico)
  /**
   * Estamos DESPUÉS del anochecer local y ANTES de la medianoche civil: el día
   * judío "real" (dayId, Shabat, festivos, tema) ya avanzó, pero el reloj civil
   * todavía marca el día anterior.
   */
  eveningPhase: boolean;
  /** Rótulo hebreo de la noche: "מוצאי שבת" o "אור ליום …". Vacío si no aplica. */
  nightLabelHe: string;
  /** Rótulo en español de la noche. Vacío si no aplica. */
  nightLabelEs: string;
  // ---- Fecha que se MUESTRA (calendario, encabezado, yahrzeits). Según
  //      settings.dateDisplayMode. Con 'anochecer' es idéntica a la halájica.
  //      No cambia dayId ni la lógica de Shabat/festivos/registros.
  displayHebrewDate: string; // "23 Elul 5786"
  displayHebrewDateHe: string; // "כ״ג אֱלוּל תשפ״ו"
  displayHebrewYear: number;
  displayHebrewMonth: string;
  displayHebrewDay: number;
  displayDow: number; // 0=Dom .. 6=Sáb del día mostrado
  displayCivilKey: string; // YYYY-MM-DD civil del día mostrado
  /** true si la fecha mostrada difiere de la halájica (estás en la franja de noche). */
  displayLagsHalacha: boolean;
  isShabbat: boolean;
  isErevShabbat: boolean;
  isMotzaeiShabbat: boolean; // primeras ~2h tras el fin del Shabat
  isYomTov: boolean;
  holidays: string[]; // rótulos en hebreo
  omerDay: number | null;
}

/** Clave de fecha civil LOCAL (no UTC): YYYY-MM-DD. */
export function civilDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Date a mediodía local de una clave YYYY-MM-DD (evita bordes de zona horaria). */
export function keyToNoon(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addDaysKey(key: string, delta: number): string {
  const n = keyToNoon(key);
  n.setDate(n.getDate() + delta);
  return civilDateKey(n);
}

export function makeLocation(s: Settings): Location {
  const l = s.location;
  return new Location(
    l.latitude,
    l.longitude,
    l.israel,
    l.tzid,
    l.label,
    l.israel ? 'IL' : undefined,
    undefined,
    l.elevation || 0,
  );
}

export function zmanimForKey(key: string, s: Settings): Zmanei {
  const loc = makeLocation(s);
  const z = new Zmanim(loc, keyToNoon(key), false);
  return {
    alotHaShachar: z.alotHaShachar(),
    sunrise: z.sunrise(),
    sunset: z.sunset(),
    tzeit: z.tzeit(s.tzeitAngle || 8.5),
  };
}

/** Instante en que termina el día civil `key` como día judío (anochecer). */
export function boundaryForKey(key: string, s: Settings): Date {
  const override = s.dayBoundaryOverrides?.[key];
  if (override) return new Date(override);
  const z = zmanimForKey(key, s);
  return s.boundaryMode === 'shkia' ? z.sunset : z.tzeit;
}

/** Resuelve qué día judío corre en el instante `now`. */
export function resolveJewishDay(now: Date, s: Settings): JewishDayInfo {
  const nowKey = civilDateKey(now);
  const boundaryToday = boundaryForKey(nowKey, s);

  // Tras el anochecer, el ancla diurna es el día civil siguiente.
  const anchorKey = now.getTime() >= boundaryToday.getTime() ? addDaysKey(nowKey, 1) : nowKey;

  const anchorNoon = keyToNoon(anchorKey);
  const hd = new HDate(anchorNoon);
  const israel = s.location.israel;

  const startsAt = boundaryForKey(addDaysKey(anchorKey, -1), s);
  const endsAt = boundaryForKey(anchorKey, s);

  const evs = HebrewCalendar.getHolidaysOnDate(hd, israel) || [];
  const holidays = evs.map((e) => e.render('he'));
  const isYomTov = evs.some((e) => (e.getFlags() & flags.CHAG) !== 0);

  const dow = anchorNoon.getDay();
  const omer = evs.find((e) => (e.getFlags() & flags.OMER_COUNT) !== 0);

  // Franja de noche: ya pasó el anochecer del día civil `nowKey`, así que el día
  // judío saltó al siguiente aunque el reloj civil siga en `nowKey`.
  const eveningPhase = now.getTime() >= boundaryToday.getTime();

  // Qué FECHA se muestra. 'anochecer' = halájico; 'medianoche' = el día civil
  // hasta las 00:00; 'despertar' = el día civil hasta wakeHour.
  const mode = s.dateDisplayMode ?? 'anochecer';
  let displayKey = anchorKey;
  if (mode === 'medianoche') {
    displayKey = nowKey;
  } else if (mode === 'despertar') {
    const wake = Number.isFinite(s.wakeHour) ? (s.wakeHour as number) : 5;
    displayKey = now.getHours() < wake ? addDaysKey(nowKey, -1) : nowKey;
  }
  const displayNoon = keyToNoon(displayKey);
  const dhd = new HDate(displayNoon);
  const displayLagsHalacha = displayKey !== anchorKey;
  const DOW_HE_DAY = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
  const DOW_ES_DAY = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const nightLabelHe = !eveningPhase ? '' : dow === 0 ? 'מוצאי שבת' : `אור ל${DOW_HE_DAY[dow] ?? ''}`;
  const nightLabelEs = !eveningPhase
    ? ''
    : dow === 0
      ? 'Motzaei Shabat · noche'
      : `noche (víspera de ${DOW_ES_DAY[dow] ?? ''})`;

  // Motzaei Shabat: el día judío es domingo y estamos dentro de las ~2h del tzet.
  let isMotzaeiShabbat = false;
  if (dow === 0) {
    const shabbatEnd = startsAt; // el día domingo empezó al terminar el Shabat
    isMotzaeiShabbat = now.getTime() >= shabbatEnd.getTime() && now.getTime() < shabbatEnd.getTime() + 2 * 3600 * 1000;
  }

  return {
    dayId: anchorKey,
    hebrewDate: hd.toString(),
    hebrewDateHe: hd.renderGematriya(),
    hebrewYear: hd.getFullYear(),
    hebrewMonth: hd.getMonthName(),
    hebrewDay: hd.getDate(),
    civilAnchor: anchorKey,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    boundaryMode: s.boundaryMode,
    dowAnchor: dow,
    eveningPhase,
    nightLabelHe,
    nightLabelEs,
    displayHebrewDate: dhd.toString(),
    displayHebrewDateHe: dhd.renderGematriya(),
    displayHebrewYear: dhd.getFullYear(),
    displayHebrewMonth: dhd.getMonthName(),
    displayHebrewDay: dhd.getDate(),
    displayDow: displayNoon.getDay(),
    displayCivilKey: displayKey,
    displayLagsHalacha,
    isShabbat: dow === 6,
    isErevShabbat: dow === 5,
    isMotzaeiShabbat,
    isYomTov,
    holidays,
    omerDay: omer ? (omer as unknown as { omer?: number }).omer ?? null : null,
  };
}

export type ThemeMode = 'day' | 'night';

/** Ambiente visual: DÍA (marfil) tras el amanecer, NOCHE (azul) tras el anochecer. */
export function resolveTheme(now: Date, s: Settings): ThemeMode {
  if (s.themeOverride === 'day') return 'day';
  if (s.themeOverride === 'night') return 'night';
  const key = civilDateKey(now);
  const z = zmanimForKey(key, s);
  const boundary = boundaryForKey(key, s);
  const isDay = now.getTime() >= z.sunrise.getTime() && now.getTime() < boundary.getTime();
  return isDay ? 'day' : 'night';
}

/** Progreso (0..1) dentro del día judío actual — para el arco del dashboard. */
export function dayProgress(now: Date, info: JewishDayInfo): number {
  const start = new Date(info.startsAt).getTime();
  const end = new Date(info.endsAt).getTime();
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

export function nextDayBoundary(now: Date, s: Settings): Date {
  const key = civilDateKey(now);
  const b = boundaryForKey(key, s);
  if (now.getTime() < b.getTime()) return b;
  return boundaryForKey(addDaysKey(key, 1), s);
}
