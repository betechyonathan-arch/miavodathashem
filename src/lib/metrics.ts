/*
  FASE 3 — Motor de MÉTRICAS con fórmula transparente.
  Cada métrica trae `formula` e `inputs` para el "¿Por qué?" de la UI.
  Se separan las dimensiones del spec: cumplimiento / constancia / cantidad /
  calidad / esfuerzo / recuperación. NUNCA una única "nota de religiosidad".
*/
import type { AreaId, DayRecord, Entry } from './db/schema';
import { catLabel } from './categories';

export interface Metric {
  id: string;
  label: string;
  he?: string;
  value: string; // texto para mostrar
  ratio?: number; // 0..1 para la barra (opcional)
  delta?: number; // vs periodo anterior (opcional, en las unidades del valor numérico)
  tone?: 'good' | 'bad' | 'neutral';
  formula: string;
  inputs: { k: string; v: string }[];
}

export interface MetricGroup {
  title: string;
  he?: string;
  /** Qué mide este grupo y por qué importa, en clave de musar. Con fuente. */
  meaning?: string;
  metrics: Metric[];
}

export interface PeriodReport {
  totalEntries: number;
  activeDays: number;
  spanDays: number;
  groups: MetricGroup[];
  strongMonths: { label: string; score: number }[];
  hardMonths: { label: string; score: number }[];
  predominantMiddot: [string, number][];
  learnings: { dayId: string; text: string }[];
  doDifferent: { dayId: string; text: string }[];
}

const MIDDOT_TAGS = [
  'kaas', 'savlanut', 'gaava', 'anava', 'kina', 'simja', 'zerizut', 'atzlut',
  'emet', 'lashon_hara', 'shtika', 'stress',
];

const num = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);
const avg = (xs: number[]): number | null => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null);

function daysWith(entries: Entry[], pred: (e: Entry) => boolean): number {
  return new Set(entries.filter(pred).map((e) => e.dayId)).size;
}

function collectField(entries: Entry[], keys: string[]): number[] {
  const out: number[] = [];
  for (const e of entries) for (const k of keys) {
    const n = num(e.fields[k]);
    if (n != null) out.push(n);
  }
  return out;
}

interface BuildArgs {
  entries: Entry[];
  prevEntries: Entry[];
  days: DayRecord[];
  spanDays: number;
  monthBuckets?: { label: string; entries: Entry[] }[]; // solo para el año
}

export function buildReport({ entries, prevEntries, days, spanDays, monthBuckets }: BuildArgs): PeriodReport {
  const activeDays = new Set(entries.map((e) => e.dayId)).size;
  const inArea = (e: Entry, a: AreaId) => e.area === a || e.areasSecondary.includes(a);
  const filterArea = (list: Entry[], a: AreaId) => list.filter((e) => inArea(e, a));

  const groups: MetricGroup[] = [];

  // ---------- Cumplimiento / constancia ----------
  const cheshbonDays = days.filter((d) => d.cheshbon).length;
  const checkinDays = days.filter((d) => d.checkIn).length;
  const torahDays = daysWith(entries, (e) => inArea(e, 'torah'));
  const tefillahDays = daysWith(entries, (e) => inArea(e, 'tefillah'));
  const prevTorahDays = daysWith(prevEntries, (e) => inArea(e, 'torah'));

  groups.push({
    title: 'Constancia',
    he: 'עקביות',
    meaning:
      'Mide cada cuánto apareces, no cuánto brillas un día. En la avodá la regularidad vale más que el arranque: "más vale poco y sostenido" (Tur, Oraj Jaim 1). No es una nota; es un espejo de tu ritmo.',
    metrics: [
      {
        id: 'active',
        label: 'Días con registro',
        value: `${activeDays}/${spanDays}`,
        ratio: activeDays / spanDays,
        formula: 'días distintos con al menos un registro ÷ días del periodo',
        inputs: [{ k: 'días activos', v: String(activeDays) }, { k: 'días del periodo', v: String(spanDays) }],
        tone: activeDays / spanDays >= 0.7 ? 'good' : 'neutral',
      },
      {
        id: 'torah-const',
        label: 'Constancia en Torá',
        he: 'תורה',
        value: `${torahDays}/${spanDays}`,
        ratio: torahDays / spanDays,
        delta: torahDays - prevTorahDays,
        formula: 'días con algún registro de Torá ÷ días del periodo',
        inputs: [{ k: 'días con Torá', v: String(torahDays) }, { k: 'periodo anterior', v: String(prevTorahDays) }],
        tone: torahDays >= prevTorahDays ? 'good' : 'bad',
      },
      {
        id: 'tefillah-const',
        label: 'Constancia en Tefilá',
        he: 'תפילה',
        value: `${tefillahDays}/${spanDays}`,
        ratio: tefillahDays / spanDays,
        formula: 'días con algún registro de Tefilá ÷ días del periodo',
        inputs: [{ k: 'días con Tefilá', v: String(tefillahDays) }],
      },
      {
        id: 'cheshbon',
        label: 'חשבון הנפש hecho',
        value: `${cheshbonDays}/${spanDays}`,
        ratio: cheshbonDays / spanDays,
        formula: 'días con חשבון הנפש cerrado ÷ días del periodo',
        inputs: [{ k: 'días con jeshbón', v: String(cheshbonDays) }, { k: 'check-ins', v: String(checkinDays) }],
      },
    ],
  });

  // ---------- Cantidad ----------
  const torahMin = collectField(filterArea(entries, 'torah'), ['minutes']).reduce((a, b) => a + b, 0);
  const prevTorahMin = collectField(filterArea(prevEntries, 'torah'), ['minutes']).reduce((a, b) => a + b, 0);
  const tefillot = new Set(
    filterArea(entries, 'tefillah')
      .filter((e) => e.fields.done !== false)
      .map((e) => `${e.dayId}|${(e.fields.which as string) ?? '?'}`),
  ).size;
  groups.push({
    title: 'Cantidad',
    he: 'כמות',
    meaning:
      'Suma el volumen de lo que hiciste — minutos de Torá, tefilot, registros. La cantidad importa ("según el esfuerzo, la recompensa", Avot 5:23), pero por sí sola no dice nada de la calidad; míralas juntas.',
    metrics: [
      {
        id: 'torah-min',
        label: 'Minutos de Torá',
        value: torahMin ? `${torahMin} min` : '—',
        delta: torahMin - prevTorahMin,
        formula: 'suma de "duración" de los registros de Torá con ese campo',
        inputs: [
          { k: 'total', v: `${torahMin} min` },
          { k: 'media/día activo', v: torahDays ? `${Math.round(torahMin / torahDays)} min` : '—' },
          { k: 'periodo anterior', v: `${prevTorahMin} min` },
        ],
        tone: torahMin >= prevTorahMin ? 'good' : 'bad',
      },
      {
        id: 'tefillot',
        label: 'Tefilot registradas',
        value: String(tefillot),
        formula: 'nº de pares (día, tefilá) distintos marcados como realizados',
        inputs: [{ k: 'tefilot', v: String(tefillot) }],
      },
      {
        id: 'entries',
        label: 'Registros totales',
        value: String(entries.length),
        delta: entries.length - prevEntries.length,
        formula: 'nº de registros creados en el periodo (sin archivados)',
        inputs: [{ k: 'este periodo', v: String(entries.length) }, { k: 'anterior', v: String(prevEntries.length) }],
      },
    ],
  });

  // ---------- Calidad ----------
  const torahQ = avg(collectField(filterArea(entries, 'torah'), ['quality', 'concentration', 'understanding']));
  const kavana = avg(collectField(filterArea(entries, 'tefillah'), ['kavana', 'connection']));
  const hashemConn = avg(collectField(filterArea(entries, 'hashem'), ['connection', 'awareness']));
  groups.push({
    title: 'Calidad (cuando la registraste)',
    he: 'איכות',
    meaning:
      'Promedia lo que tú mismo calificaste: concentración en el estudio, kavaná en la tefilá, conexión. "El Misericordioso quiere el corazón" (Sanhedrín 106b). Solo cuenta lo que registraste; los días en blanco no bajan nada.',
    metrics: [
      qMetric('torah-q', 'Torá — concentración/comprensión', torahQ, 'תורה'),
      qMetric('kavana', 'Tefilá — kavaná/conexión', kavana, 'כוונה'),
      qMetric('hashem-conn', 'Conexión con Hashem', hashemConn, 'חיבור'),
    ],
  });

  // ---------- Midot: victorias vs. caídas ----------
  const wins = entries.filter((e) => e.valence === 'victory').length;
  const falls = entries.filter((e) => e.valence === 'fall').length;
  const recoveries = entries.filter((e) => e.valence === 'recovery').length;
  const prevWins = prevEntries.filter((e) => e.valence === 'victory').length;
  const prevFalls = prevEntries.filter((e) => e.valence === 'fall').length;
  const recHours = avg(collectField(filterArea(entries, 'recovery'), ['durationHours']));
  groups.push({
    title: 'Midot · victorias y caídas',
    he: 'מידות',
    meaning:
      'Cuenta las veces que venciste al yétzer y las que caíste, y con qué rapidez volviste. "Siete veces cae el tzadik y se levanta" (Mishlei 24:16): lo que se mide aquí no es la caída, es el regreso. Sin juicio, sin psak.',
    metrics: [
      {
        id: 'wins',
        label: 'Victorias',
        value: String(wins),
        delta: wins - prevWins,
        tone: wins >= prevWins ? 'good' : 'neutral',
        formula: 'registros marcados como victoria (manual o detectado)',
        inputs: [{ k: 'victorias', v: String(wins) }, { k: 'anterior', v: String(prevWins) }],
      },
      {
        id: 'falls',
        label: 'Caídas',
        value: String(falls),
        delta: falls - prevFalls,
        tone: falls <= prevFalls ? 'good' : 'bad',
        formula: 'registros marcados como caída. Sin juicio: son datos para aprender',
        inputs: [{ k: 'caídas', v: String(falls) }, { k: 'anterior', v: String(prevFalls) }],
      },
      {
        id: 'recovery',
        label: 'Recuperación',
        value: falls ? `${recoveries}/${falls}` : `${recoveries}`,
        ratio: falls ? Math.min(1, recoveries / falls) : undefined,
        formula: 'recuperaciones registradas ÷ caídas del periodo',
        inputs: [
          { k: 'recuperaciones', v: String(recoveries) },
          { k: 'caídas', v: String(falls) },
          { k: 'tiempo medio de vuelta', v: recHours != null ? `${recHours} h` : '—' },
        ],
        tone: falls && recoveries >= falls ? 'good' : 'neutral',
      },
    ],
  });

  // ---------- Simjá / bienestar ----------
  const simcha = avg(collectField(filterArea(entries, 'gratitude'), ['simcha', 'satisfaction']));
  const moodEnd = avg(days.map((d) => (typeof d.moodEnd === 'number' ? d.moodEnd : NaN)).filter((n) => !Number.isNaN(n)));
  const gratitudeDays = daysWith(entries, (e) => inArea(e, 'gratitude'));
  groups.push({
    title: 'Simjá y cierre del día',
    he: 'שמחה',
    meaning:
      'Sigue tu simjá y cómo terminaste los días. "Servid a Hashem con alegría" (Tehilim 100:2): la simjá no es un lujo, es parte de la avodá y su combustible. Y agradecer (הכרת הטוב) es la raíz de ser yehudí.',
    metrics: [
      qMetric('simcha', 'Nivel de Simjá', simcha, 'שמחה'),
      qMetric('mood-end', 'Cómo terminé los días', moodEnd),
      {
        id: 'gratitude-days',
        label: 'Días con gratitud',
        value: `${gratitudeDays}/${spanDays}`,
        ratio: gratitudeDays / spanDays,
        formula: 'días con algún registro de gratitud ÷ días del periodo',
        inputs: [{ k: 'días', v: String(gratitudeDays) }],
      },
    ],
  });

  // ---------- Mitzvot (constancia) ----------
  const mitzvahDays: Record<string, number> = {};
  for (const d of days) for (const id of d.mitzvot ?? []) mitzvahDays[id] = (mitzvahDays[id] ?? 0) + 1;
  const topMitzvot = Object.entries(mitzvahDays).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topMitzvot.length) {
    groups.push({
      title: 'Mitzvot (constancia)',
      he: 'מצוות',
      meaning:
        'Cada mitzvá que elegiste seguir y cada cuántos días la cumpliste. "Corre hacia la mitzvá liviana igual que hacia la grave" (Avot 4:2). Es un recordatorio de hábitos, no una lista de deudas.',
      metrics: topMitzvot.map(([id, n]) => ({
        id: `mitzvah-${id}`,
        label: id,
        value: `${n}/${spanDays}`,
        ratio: n / spanDays,
        formula: 'días en que la marcaste como hecha ÷ días del periodo',
        inputs: [{ k: 'días', v: String(n) }],
        tone: n / spanDays >= 0.8 ? 'good' : n / spanDays >= 0.4 ? 'neutral' : 'bad',
      })),
    });
  }

  // ---------- Midot predominantes ----------
  const tagBag: Record<string, number> = {};
  for (const e of entries) for (const t of e.tags) if (MIDDOT_TAGS.includes(t)) tagBag[t] = (tagBag[t] ?? 0) + 1;
  const predominantMiddot = Object.entries(tagBag).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // ---------- Aprendizajes (de חשבון הנפש) ----------
  const learnings: { dayId: string; text: string }[] = [];
  const doDifferent: { dayId: string; text: string }[] = [];
  for (const d of days) {
    if (d.cheshbon?.learned) learnings.push({ dayId: d.id, text: d.cheshbon.learned });
    if (d.cheshbon?.doDifferent) doDifferent.push({ dayId: d.id, text: d.cheshbon.doDifferent });
  }

  // ---------- Meses fuertes / difíciles (año) ----------
  const scored = (monthBuckets ?? []).map((b) => {
    const w = b.entries.filter((e) => e.valence === 'victory').length;
    const f = b.entries.filter((e) => e.valence === 'fall').length;
    return { label: b.label, score: +(w - f + b.entries.length / 12).toFixed(1) };
  });
  const nonEmpty = scored.filter((s) => Math.abs(s.score) > 0.001);
  const strongMonths = [...nonEmpty].sort((a, b) => b.score - a.score).slice(0, 3);
  const hardMonths = [...nonEmpty].sort((a, b) => a.score - b.score).slice(0, 3).filter((s) => s.score < strongMonths[strongMonths.length - 1]?.score);

  return {
    totalEntries: entries.length,
    activeDays,
    spanDays,
    groups,
    strongMonths,
    hardMonths,
    predominantMiddot,
    learnings: learnings.slice(-40).reverse(),
    doDifferent: doDifferent.slice(-40).reverse(),
  };
}

function qMetric(id: string, label: string, value: number | null, he?: string): Metric {
  return {
    id,
    label,
    he,
    value: value != null ? `${value}/10` : '—',
    ratio: value != null ? value / 10 : undefined,
    formula: 'promedio de los valores 0–10 que registraste en ese campo (los que dejaste vacíos no cuentan)',
    inputs: [{ k: 'promedio', v: value != null ? `${value}/10` : 'sin datos' }],
    tone: value == null ? 'neutral' : value >= 6 ? 'good' : value >= 4 ? 'neutral' : 'bad',
  };
}

/** Áreas que más crecen / bajan comparando dos listas de registros. */
export function areaTrend(
  cur: Entry[],
  prev: Entry[],
  areas: AreaId[],
): { growing: { a: AreaId; now: number; before: number }[]; falling: { a: AreaId; now: number; before: number }[] } {
  const count = (list: Entry[], a: AreaId) => list.filter((e) => e.area === a || e.areasSecondary.includes(a)).length;
  const growing: { a: AreaId; now: number; before: number }[] = [];
  const falling: { a: AreaId; now: number; before: number }[] = [];
  for (const a of areas) {
    const now = count(cur, a);
    const before = count(prev, a);
    if (now > before) growing.push({ a, now, before });
    else if (now < before) falling.push({ a, now, before });
  }
  growing.sort((x, y) => y.now - y.before - (x.now - x.before));
  falling.sort((x, y) => x.now - x.before - (y.now - y.before));
  return { growing, falling };
}

export { catLabel };
