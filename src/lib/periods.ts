/*
  FASE 3 — Periodos para los dashboards semanal / mensual / anual.
  El periodo se calcula sobre el CALENDARIO HEBREO:
   - semana: domingo (yom rishon) → shabat, la que contiene el día judío de referencia
   - mes: mes hebreo completo (1 → 29/30)
   - año: año hebreo completo (1 Tishrei → 29 Elul)
  Las claves son fechas civiles ancla (YYYY-MM-DD), como en el resto de la app.
*/
import { HDate } from '@hebcal/core';
import { civilDateKey, keyToNoon } from './jewishDay';
import { hebrewDateEs } from './format';

export type PeriodKind = 'week' | 'month' | 'year';

export interface Period {
  kind: PeriodKind;
  fromKey: string;
  toKey: string;
  spanDays: number;
  label: string;
  labelHe: string;
}

function addKey(key: string, delta: number): string {
  const d = keyToNoon(key);
  d.setDate(d.getDate() + delta);
  return civilDateKey(d);
}

function daysBetween(a: string, b: string): number {
  return Math.round((keyToNoon(b).getTime() - keyToNoon(a).getTime()) / 86400000);
}

function hebMonthName(hd: HDate): string {
  // "17 Elul 5786" -> "Elul"
  const m = hd.toString().match(/^\d+\s+(.+?)\s+\d+$/);
  const raw = m ? m[1] : hd.getMonthName();
  return hebrewDateEs(`1 ${raw} ${hd.getFullYear()}`).replace(/^1 de (.+?) de \d+$/, '$1');
}

/** Periodo hebreo que contiene la fecha ancla `refKey`. */
export function periodFor(kind: PeriodKind, refKey: string): Period {
  if (kind === 'week') {
    const dow = keyToNoon(refKey).getDay(); // 0 = domingo
    const fromKey = addKey(refKey, -dow);
    const toKey = addKey(fromKey, 6);
    const fromHd = new HDate(keyToNoon(fromKey));
    const toHd = new HDate(keyToNoon(toKey));
    const sameMonth = fromHd.getMonth() === toHd.getMonth() && fromHd.getFullYear() === toHd.getFullYear();
    const label = sameMonth
      ? `Semana ${fromHd.getDate()}–${toHd.getDate()} ${hebMonthName(fromHd)}`
      : `Semana ${fromHd.getDate()} ${hebMonthName(fromHd)} – ${toHd.getDate()} ${hebMonthName(toHd)}`;
    return { kind, fromKey, toKey, spanDays: 7, label, labelHe: 'שבוע' };
  }

  if (kind === 'month') {
    const hd = new HDate(keyToNoon(refKey));
    const month = hd.getMonth();
    const year = hd.getFullYear();
    const firstHd = new HDate(1, month, year);
    const lastDay = HDate.daysInMonth(month, year);
    const lastHd = new HDate(lastDay, month, year);
    const fromKey = civilDateKey(firstHd.greg());
    const toKey = civilDateKey(lastHd.greg());
    return {
      kind,
      fromKey,
      toKey,
      spanDays: daysBetween(fromKey, toKey) + 1,
      label: `${hebMonthName(hd)} ${year}`,
      labelHe: 'חודש',
    };
  }

  // year
  const hd = new HDate(keyToNoon(refKey));
  const year = hd.getFullYear();
  const firstHd = new HDate(1, 7, year); // 1 Tishrei
  const lastHd = new HDate(29, 6, year); // 29 Elul
  const fromKey = civilDateKey(firstHd.greg());
  const toKey = civilDateKey(lastHd.greg());
  return {
    kind,
    fromKey,
    toKey,
    spanDays: daysBetween(fromKey, toKey) + 1,
    label: `Año ${year}`,
    labelHe: 'שנה',
  };
}

export function prevPeriod(p: Period): Period {
  if (p.kind === 'week') return periodFor('week', addKey(p.fromKey, -7));
  return periodFor(p.kind, addKey(p.fromKey, -1));
}

export function nextPeriod(p: Period): Period {
  if (p.kind === 'week') return periodFor('week', addKey(p.toKey, 1));
  return periodFor(p.kind, addKey(p.toKey, 1));
}

/** Sub-tramos para la mini-gráfica de evolución. */
export function buckets(p: Period): { label: string; fromKey: string; toKey: string }[] {
  if (p.kind === 'week') {
    const names = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return Array.from({ length: 7 }, (_, i) => {
      const k = addKey(p.fromKey, i);
      return { label: names[i], fromKey: k, toKey: k };
    });
  }
  if (p.kind === 'month') {
    const out: { label: string; fromKey: string; toKey: string }[] = [];
    let start = p.fromKey;
    let w = 1;
    while (keyToNoon(start).getTime() <= keyToNoon(p.toKey).getTime()) {
      const end = addKey(start, 6) <= p.toKey ? addKey(start, 6) : p.toKey;
      out.push({ label: `S${w}`, fromKey: start, toKey: end });
      start = addKey(end, 1);
      w++;
    }
    return out;
  }
  // year → 12 meses hebreos
  const out: { label: string; fromKey: string; toKey: string }[] = [];
  const firstHd = new HDate(keyToNoon(p.fromKey));
  const year = firstHd.getFullYear();
  const monthsInYear = HDate.monthsInYear(year);
  // orden desde Tishrei (7) dando la vuelta
  const order: number[] = [];
  for (let m = 7; m <= monthsInYear; m++) order.push(m);
  for (let m = 1; m < 7; m++) order.push(m);
  for (const m of order) {
    const fh = new HDate(1, m, year);
    const lh = new HDate(HDate.daysInMonth(m, year), m, year);
    out.push({
      label: hebMonthName(fh).slice(0, 3),
      fromKey: civilDateKey(fh.greg()),
      toKey: civilDateKey(lh.greg()),
    });
  }
  return out;
}
