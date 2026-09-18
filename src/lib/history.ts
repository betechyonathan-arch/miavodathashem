/*
  "MI HISTORIA" — comparación temporal (§46).
  Comparar hoy con hace 7 / 30 / 90 días / 1 / 2 / 5 años, y una línea de vida
  con la actividad por mes en todo el historial.
*/
import { db } from './db/db';
import type { Entry } from './db/schema';
import { civilDateKey, keyToNoon } from './jewishDay';

function addDaysKey(key: string, delta: number): string {
  const d = keyToNoon(key);
  d.setDate(d.getDate() + delta);
  return civilDateKey(d);
}

export interface DaySnapshot {
  offsetDays: number;
  label: string;
  dayId: string;
  exists: boolean;
  hebrewDate?: string;
  hebrewDateHe?: string;
  entries: number;
  victories: number;
  falls: number;
  torahMin: number;
  moodEnd: number | null;
  summary?: string;
  cheshbon: boolean;
}

const OFFSETS: { d: number; label: string }[] = [
  { d: 0, label: 'Hoy' },
  { d: 7, label: 'Hace 1 semana' },
  { d: 30, label: 'Hace 1 mes' },
  { d: 90, label: 'Hace 3 meses' },
  { d: 365, label: 'Hace 1 año' },
  { d: 365 * 2, label: 'Hace 2 años' },
  { d: 365 * 5, label: 'Hace 5 años' },
];

function statFor(entries: Entry[]) {
  let torahMin = 0;
  for (const e of entries) {
    if ((e.area === 'torah' || e.areasSecondary.includes('torah')) && typeof e.fields.minutes === 'number')
      torahMin += e.fields.minutes as number;
  }
  return {
    entries: entries.length,
    victories: entries.filter((e) => e.valence === 'victory').length,
    falls: entries.filter((e) => e.valence === 'fall').length,
    torahMin,
  };
}

export async function daySnapshots(todayKey: string): Promise<DaySnapshot[]> {
  const allEntries = (await db.entries.toArray()).filter((e) => !e.deletedAt);
  const days = await db.days.toArray();
  const dayById = new Map(days.map((d) => [d.id, d]));
  const byDay = new Map<string, Entry[]>();
  for (const e of allEntries) {
    const arr = byDay.get(e.dayId) ?? [];
    arr.push(e);
    byDay.set(e.dayId, arr);
  }

  return OFFSETS.map(({ d, label }) => {
    const dayId = d === 0 ? todayKey : addDaysKey(todayKey, -d);
    const rec = dayById.get(dayId);
    const es = byDay.get(dayId) ?? [];
    const s = statFor(es);
    return {
      offsetDays: d,
      label,
      dayId,
      exists: !!rec || es.length > 0,
      hebrewDate: rec?.hebrewDate,
      hebrewDateHe: rec?.hebrewDateHe,
      moodEnd: rec?.moodEnd ?? null,
      summary: rec?.autoSummary?.text,
      cheshbon: !!rec?.cheshbon,
      ...s,
    };
  });
}

export interface MonthPoint {
  ym: string; // YYYY-MM
  entries: number;
  victories: number;
  falls: number;
}

export async function lifeline(): Promise<MonthPoint[]> {
  const allEntries = (await db.entries.toArray()).filter((e) => !e.deletedAt);
  const m = new Map<string, MonthPoint>();
  for (const e of allEntries) {
    const ym = e.dayId.slice(0, 7);
    const p = m.get(ym) ?? { ym, entries: 0, victories: 0, falls: 0 };
    p.entries++;
    if (e.valence === 'victory') p.victories++;
    if (e.valence === 'fall') p.falls++;
    m.set(ym, p);
  }
  return [...m.values()].sort((a, b) => a.ym.localeCompare(b.ym));
}

// ---- Tiempo de recuperación (§38) ----

export interface RecoveryPair {
  fallAt: string;
  recAt: string;
  hours: number;
}
export interface RecoveryStats {
  pairs: RecoveryPair[];
  avgHours: number | null;
  medianHours: number | null;
  fallsWithoutRecovery: number;
  trend: 'mejora' | 'empeora' | 'estable' | null;
}

export function recoveryStats(entries: Entry[]): RecoveryStats {
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const falls = sorted.filter((e) => e.valence === 'fall');
  const recs = sorted.filter((e) => e.valence === 'recovery');
  const pairs: RecoveryPair[] = [];
  let ri = 0;
  const usedRec = new Set<string>();
  for (const f of falls) {
    // primera recuperación posterior no usada
    let match: Entry | undefined;
    for (let i = ri; i < recs.length; i++) {
      if (recs[i].createdAt > f.createdAt && !usedRec.has(recs[i].id)) {
        match = recs[i];
        break;
      }
    }
    if (match) {
      usedRec.add(match.id);
      const hours = (new Date(match.createdAt).getTime() - new Date(f.createdAt).getTime()) / 3.6e6;
      if (hours >= 0 && hours <= 24 * 90)
        pairs.push({ fallAt: f.createdAt, recAt: match.createdAt, hours: +hours.toFixed(1) });
    }
  }
  const hrs = pairs.map((p) => p.hours);
  const avg = hrs.length ? +(hrs.reduce((a, b) => a + b, 0) / hrs.length).toFixed(1) : null;
  const sortedH = [...hrs].sort((a, b) => a - b);
  const median = sortedH.length ? sortedH[Math.floor(sortedH.length / 2)] : null;

  let trend: RecoveryStats['trend'] = null;
  if (pairs.length >= 4) {
    const half = Math.floor(pairs.length / 2);
    const older = hrs.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const newer = hrs.slice(half).reduce((a, b) => a + b, 0) / (pairs.length - half);
    trend = newer < older * 0.85 ? 'mejora' : newer > older * 1.15 ? 'empeora' : 'estable';
  }

  const recoveredFallIds = new Set(pairs.map((p) => p.fallAt));
  return {
    pairs,
    avgHours: avg,
    medianHours: median,
    fallsWithoutRecovery: falls.filter((f) => !recoveredFallIds.has(f.createdAt)).length,
    trend,
  };
}
