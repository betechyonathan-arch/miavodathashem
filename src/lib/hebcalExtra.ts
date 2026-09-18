/*
  Calendario hebreo completo: parashá, festivos con cuenta regresiva, zmanim del día,
  omer, y días especiales. Todo desde @hebcal/core.
*/
import { HDate, HebrewCalendar, Zmanim, flags } from '@hebcal/core';
import { keyToNoon, makeLocation } from './jewishDay';
import type { Settings } from './db/schema';

const DOW_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
const DOW_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Shabat'];

export const dowHe = (d: number) => DOW_HE[d] ?? '';
export const dowEs = (d: number) => DOW_ES[d] ?? '';

// ---------------- Parashá ----------------

export interface ParashaInfo {
  name: string; // "Nitzavim-Vayeilech"
  he: string; // "פָּרָשַׁת נִצָּבִים־וַיֵּלֶךְ"
  onDateKey: string; // YYYY-MM-DD del Shabat correspondiente
  daysUntil: number;
}

export function parashaFor(anchorKey: string, il: boolean): ParashaInfo | null {
  const start = keyToNoon(anchorKey);
  const end = keyToNoon(anchorKey);
  end.setDate(end.getDate() + 13);
  try {
    const evs = HebrewCalendar.calendar({ start, end, il, sedrot: true, noHolidays: true });
    const p = evs.find((e) => (e.getFlags() & flags.PARSHA_HASHAVUA) !== 0);
    if (!p) return null;
    const hd = p.getDate();
    const todayAbs = new HDate(keyToNoon(anchorKey)).abs();
    const dk = hd.greg();
    const gregKey = `${dk.getFullYear()}-${String(dk.getMonth() + 1).padStart(2, '0')}-${String(dk.getDate()).padStart(2, '0')}`;
    return {
      name: p.getDesc().replace(/^Parashat /, ''),
      he: p.render('he'),
      onDateKey: gregKey,
      daysUntil: hd.abs() - todayAbs,
    };
  } catch {
    return null;
  }
}

// ---------------- Festivos con cuenta regresiva ----------------

export type HolidayCategory = 'chag' | 'fast' | 'roshchodesh' | 'moed' | 'omer' | 'other';

export interface HolidayCountdown {
  desc: string; // clave en inglés
  he: string;
  emoji: string;
  hebrewDate: string; // "1 Tishrei 5787"
  gregKey: string;
  daysUntil: number;
  category: HolidayCategory;
}

function categorize(f: number, desc: string): HolidayCategory {
  if (f & flags.ROSH_CHODESH) return 'roshchodesh';
  if (f & (flags.MAJOR_FAST | flags.MINOR_FAST)) return 'fast';
  if (f & flags.CHOL_HAMOED) return 'moed';
  if (f & flags.CHAG) return 'chag';
  if (/Chanukah|Hanukkah/.test(desc)) return 'chag';
  return 'other';
}

const KEEP =
  /Rosh Hashana|Yom Kippur|Sukkot|Shmini Atzeret|Simchat Torah|Chanukah|Asara B'Tevet|Tu BiShvat|Purim|Ta'anit Esther|Pesach|Yom HaShoah|Yom HaZikaron|Yom HaAtzma|Lag BaOmer|Yom Yerushalayim|Shavuot|Tzom Tammuz|Tish'a B'Av|Tu B'Av|Selichot|Rosh Chodesh|Tzom Gedaliah|Erev /;

export function upcomingHolidays(settings: Settings, days = 400, limit = 40): HolidayCountdown[] {
  const il = settings.location.israel;
  const now = new Date();
  const todayHd = new HDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12));
  const todayAbs = todayHd.abs();
  const start = now;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);

  const evs = HebrewCalendar.calendar({ start, end, il, sedrot: false });
  const out: HolidayCountdown[] = [];
  const seen = new Set<string>();

  for (const e of evs) {
    const desc = e.getDesc();
    const f = e.getFlags();
    if (!KEEP.test(desc)) continue;
    if (f & flags.EREV && !/Erev Rosh Hashana|Erev Yom Kippur|Erev Sukkot|Erev Pesach/.test(desc)) continue;

    const hd = e.getDate();
    const daysUntil = hd.abs() - todayAbs;
    if (daysUntil < 0) continue;

    // agrupa Rosh Chodesh de 2 días y días repetidos
    const groupKey = desc.replace(/ (I{1,3}|IV|V|VI|VII|VIII|\d+)$/, '').replace(/: \d+ Candles?.*/, '');
    if (/Rosh Chodesh/.test(desc) && seen.has(groupKey + daysUntil)) continue;
    seen.add(groupKey + daysUntil);

    const dk = hd.greg();
    out.push({
      desc,
      he: e.render('he'),
      emoji: (e as unknown as { getEmoji?: () => string }).getEmoji?.() ?? '•',
      hebrewDate: hd.toString(),
      gregKey: `${dk.getFullYear()}-${String(dk.getMonth() + 1).padStart(2, '0')}-${String(dk.getDate()).padStart(2, '0')}`,
      daysUntil,
      category: categorize(f, desc),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** La próxima ocurrencia de un festivo por regex (para las tarjetas destacadas). */
export function nextHoliday(settings: Settings, re: RegExp): HolidayCountdown | null {
  const all = upcomingHolidays(settings, 400, 200);
  return all.find((h) => re.test(h.desc)) ?? null;
}

// ---------------- Omer ----------------

export interface OmerInfo {
  day: number; // 1..49
  he: string;
  weeks: number;
  daysInWeek: number;
}

export function omerFor(settings: Settings): OmerInfo | null {
  const il = settings.location.israel;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6);
  try {
    const evs = HebrewCalendar.calendar({ start, end, il, omer: true, noHolidays: true });
    const o = evs.find((e) => (e.getFlags() & flags.OMER_COUNT) !== 0) as unknown as
      | { omer?: number; render: (l: string) => string }
      | undefined;
    if (!o?.omer) return null;
    return {
      day: o.omer,
      he: o.render('he'),
      weeks: Math.floor(o.omer / 7),
      daysInWeek: o.omer % 7,
    };
  } catch {
    return null;
  }
}

// ---------------- Días especiales (para el banner) ----------------

export function specialToday(anchorKey: string, settings: Settings): string[] {
  const il = settings.location.israel;
  const hd = new HDate(keyToNoon(anchorKey));
  const evs = HebrewCalendar.getHolidaysOnDate(hd, il) || [];
  const tags: string[] = [];

  for (const e of evs) {
    const f = e.getFlags();
    if (f & flags.CHOL_HAMOED) tags.push('חול המועד · Jol HaMoed');
    else if (f & flags.ROSH_CHODESH) tags.push(e.render('he'));
    else if (f & flags.CHAG) tags.push(e.render('he'));
    else if (f & (flags.MAJOR_FAST | flags.MINOR_FAST)) tags.push(`${e.render('he')} · día de ayuno`);
    else if (f & flags.EREV) tags.push(e.render('he'));
    else if (f & flags.SPECIAL_SHABBAT) tags.push(e.render('he'));
  }

  // Aseret Yemei Teshuva: 1 Tishrei .. 10 Tishrei
  if (hd.getMonth() === 7 && hd.getDate() >= 1 && hd.getDate() <= 10) {
    tags.push('עשרת ימי תשובה · Diez días de Teshuvá');
  }
  // Mes de Elul
  if (hd.getMonth() === 6) tags.push('חודש אלול · mes de cuentas del alma');

  return [...new Set(tags)];
}

// ---------------- Zmanim del día ----------------

export interface ZmanRow {
  key: string;
  label: string;
  he: string;
  time: Date;
}

export function zmanimRows(anchorKey: string, settings: Settings): ZmanRow[] {
  const loc = makeLocation(settings);
  const z = new Zmanim(loc, keyToNoon(anchorKey), false);
  const rows: [string, string, string, () => Date][] = [
    ['alot', 'Alot haShajar', 'עלות השחר', () => z.alotHaShachar()],
    ['misheyakir', 'Misheyakir (talit/tefilín)', 'משיכיר', () => z.misheyakir()],
    ['netz', 'Salida del sol (haNetz)', 'הנץ החמה', () => z.sunrise()],
    ['shma', 'Sof zman Shemá (GRA)', 'סוף זמן ק״ש', () => z.sofZmanShma()],
    ['tfila', 'Sof zman Tefilá (GRA)', 'סוף זמן תפילה', () => z.sofZmanTfilla()],
    ['chatzot', 'Jatzot (mediodía)', 'חצות', () => z.chatzot()],
    ['minchaG', 'Minjá Guedolá', 'מנחה גדולה', () => z.minchaGedola()],
    ['minchaK', 'Minjá Ketaná', 'מנחה קטנה', () => z.minchaKetana()],
    ['plag', 'Plag haMinjá', 'פלג המנחה', () => z.plagHaMincha()],
    ['shkia', 'Puesta del sol (Shkiá)', 'שקיעה', () => z.sunset()],
    ['tzeit', `Tzet haKojavim (${settings.tzeitAngle}°)`, 'צאת הכוכבים', () => z.tzeit(settings.tzeitAngle || 8.5)],
    ['chatzotL', 'Jatzot haLaila', 'חצות הלילה', () => z.chatzotNight()],
  ];
  return rows
    .map(([key, label, he, fn]) => {
      try {
        return { key, label, he, time: fn() };
      } catch {
        return null;
      }
    })
    .filter((r): r is ZmanRow => !!r && r.time instanceof Date && !Number.isNaN(r.time.getTime()));
}
