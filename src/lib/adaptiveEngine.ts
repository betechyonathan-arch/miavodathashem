/*
  MOTOR AUTO-INTELIGENTE (reglas, sin IA).
  Decide qué preguntar en el check-in y en el חשבון הנפש según:
  lo registrado hoy, lo registrado recientemente, las metas, la midá principal,
  las caídas y victorias, y la información que falta.
  No repite preguntas que ya quedaron respondidas por un registro.
*/
import type { AreaId, DayRecord, Entry, Settings } from './db/schema';
import { getGender } from './gender';
import type { JewishDayInfo } from './jewishDay';
import { catHe, catLabel } from './categories';
import { count } from './format';

export interface EngineContext {
  today: JewishDayInfo;
  todayEntries: Entry[];
  recentEntries: Entry[]; // últimos ~14 días (sin hoy)
  settings: Settings;
  yesterday?: DayRecord;
}

export interface AskItem {
  id: string;
  q: string;
  area?: AreaId;
  kind: 'text' | 'scale' | 'choice';
  choices?: string[];
  why: string;
}

const has = (entries: Entry[], area: AreaId) =>
  entries.some((e) => e.area === area || e.areasSecondary.includes(area));

const daysWithout = (recent: Entry[], area: AreaId): number => {
  const byDay = new Set(recent.filter((e) => e.area === area).map((e) => e.dayId));
  // nº de días distintos recientes sin esa área (aprox: total días recientes - días con)
  const totalDays = new Set(recent.map((e) => e.dayId)).size || 0;
  return Math.max(0, totalDays - byDay.size);
};

// ---------------- CHECK-IN (inicio del día, máx ~60s) ----------------

export function buildCheckInQuestions(ctx: EngineContext): AskItem[] {
  const items: AskItem[] = [];
  const { recentEntries, settings, yesterday } = ctx;
  const strict = settings.strictness === 'demanding';

  items.push({
    id: 'focus',
    q: strict ? '¿Cuál es tu punto de Avodá hoy? Uno concreto, no una frase bonita.' : '¿Cuál es mi punto de Avodá hoy?',
    kind: 'text',
    why: 'Pregunta base del check-in',
  });
  items.push({
    id: 'goal',
    q: strict ? '¿Qué vas a hacer hoy que ayer evitaste?' : '¿Cuál es mi meta principal para hoy?',
    kind: 'text',
    why: 'Pregunta base del check-in',
  });
  if (strict) {
    items.push({
      id: 'excuse-guard',
      q: '¿Qué excusa vas a usar hoy para no cumplir? Nómbrala ahora y déjala sin efecto.',
      kind: 'text',
      why: 'Modo exigente',
    });
  }

  // Adaptación 1: Kaas ayer
  const kaasYesterday = yesterday
    ? recentEntries.filter((e) => e.dayId === yesterday.id && e.tags.includes('kaas')).length
    : 0;
  if (kaasYesterday > 0) {
    items.push({
      id: 'kaas-watch',
      q: 'Ayer apareció Kaas. ¿Qué quiero cuidar hoy con el enojo?',
      area: 'middot',
      kind: 'text',
      why: `Ayer registraste ${count(kaasYesterday, 'momento', 'momentos')} de Kaas`,
    });
  }

  // Adaptación 2: midá principal de la etapa
  if (settings.primaryMiddah && items.length < 4) {
    items.push({
      id: 'primary-middah',
      q: `Tu midá de esta etapa es "${settings.primaryMiddah}". ¿Dónde podría ponerse a prueba hoy?`,
      area: 'middot',
      kind: 'text',
      why: 'Definiste esta midá como principal de tu etapa',
    });
  }

  // Adaptación 3: Torá abandonada
  if (items.length < 4 && daysWithout(recentEntries, 'torah') >= 2) {
    items.push({
      id: 'torah-seder',
      q: '¿Cuándo y qué voy a estudiar hoy?',
      area: 'torah',
      kind: 'text',
      why: 'Llevas 2+ días recientes sin registrar Torá',
    });
  }

  // Adaptación 4: Bitajón en trabajo
  if (items.length < 4) {
    items.push({
      id: 'test-anticipate',
      q: '¿Qué prueba podría aparecer hoy?',
      kind: 'text',
      why: 'Pregunta base del check-in',
    });
  }

  // Adaptación 5: si hay racha de caídas en un área, cuidarla
  const fallAreas = countBy(recentEntries.filter((e) => e.valence === 'fall').flatMap((e) => [e.area, ...e.areasSecondary]));
  const worst = topKey(fallAreas) as AreaId | null;
  if (worst && items.length < 4) {
    items.push({
      id: 'guard-area',
      q: `Últimamente hubo caídas en ${catLabel(worst)}. ¿Qué estrategia uso hoy si aparece?`,
      area: worst,
      kind: 'text',
      why: `${count(fallAreas[worst], 'caída reciente', 'caídas recientes')} en ${catLabel(worst)}`,
    });
  }

  return items.slice(0, 4);
}

// ---------------- חשבון הנפש (fin del día) ----------------

const CORE_AREAS: { area: AreaId; q: string }[] = [
  { area: 'torah', q: '¿Cuánto y cómo estudié Torá hoy?' },
  { area: 'tefillah', q: '¿Cómo davené? ¿Estuve realmente presente delante de Hashem?' },
  { area: 'hashem', q: '¿Viví consciente de Hashem hoy?' },
  { area: 'emunah', q: '¿Dónde tuve Emuná hoy?' },
  { area: 'bitachon', q: '¿Dónde confié y dónde intenté controlar?' },
  { area: 'middot', q: '¿Dónde vencí y dónde caí en las midot?' },
  {
    area: 'kedushah',
    q: getGender() === 'mujer'
      ? '¿Cuidé mi tzniut hoy: vestimenta, conducta y trato?'
      : 'Kedushá hoy: ¿victoria, caída o normal?',
  },
  {
    area: 'speech',
    q: getGender() === 'mujer'
      ? '¿Dije lashón hará hoy, o lo escuché sin frenarlo?'
      : '¿Cómo cuidé mi boca hoy?',
  },
  { area: 'ben_adam', q: '¿Cómo traté a los demás hoy?' },
  { area: 'yerushalayim', q: '¿Recordé Yerushalayim y la Geulá hoy?' },
  { area: 'gratitude', q: '¿De qué estoy agradecido hoy?' },
];

export function buildCheshbonQuestions(ctx: EngineContext): AskItem[] {
  const items: AskItem[] = [];
  const { todayEntries, settings } = ctx;
  const strict = settings.strictness === 'demanding';

  for (const c of CORE_AREAS) {
    if (!has(todayEntries, c.area)) {
      items.push({
        id: `core-${c.area}`,
        q: c.q,
        area: c.area,
        kind: 'text',
        why: `No hay ningún registro de ${catLabel(c.area)} hoy`,
      });
    }
  }

  // Si hubo caída sin recuperación registrada
  const falls = todayEntries.filter((e) => e.valence === 'fall');
  const recoveries = todayEntries.filter((e) => e.valence === 'recovery');
  if (falls.length && !recoveries.length) {
    items.push({
      id: 'recovery-prompt',
      q: 'Hubo una caída hoy y no registraste recuperación. ¿Cómo regresaste (o cómo puedes empezar a regresar)?',
      area: 'recovery',
      kind: 'text',
      why: `${count(falls.length, 'caída', 'caídas')} sin recuperación registrada`,
    });
  }

  // Victoria del día
  items.push({
    id: 'biggest-victory',
    q: '¿Cuál fue mi mayor victoria hoy?',
    area: 'victory',
    kind: 'text',
    why: 'Pregunta de cierre',
  });

  // Cierre fijo
  if (strict) {
    items.push({
      id: 'honest-effort',
      q: 'Sé honesto: ¿te esforzaste de verdad hoy o te conformaste? ¿Dónde exactamente aflojaste?',
      kind: 'text',
      why: 'Modo exigente',
    });
  }
  items.push({ id: 'learned', q: '¿Qué aprendí hoy?', kind: 'text', why: 'Pregunta de cierre' });
  items.push({
    id: 'do-different',
    q: strict
      ? 'Si repites este día, ¿qué haces distinto? Concreto y accionable, no un buen deseo.'
      : 'Si pudiera repetir este día, ¿qué haría diferente?',
    kind: 'text',
    why: 'Pregunta de cierre',
  });
  items.push({ id: 'mood-end', q: '¿Cómo termino el día? (0–10)', kind: 'scale', why: 'Estado al cierre' });

  // Máximo razonable: 6 de área + 4 de cierre
  const core = items.filter((i) => i.id.startsWith('core-')).slice(0, 6);
  const rest = items.filter((i) => !i.id.startsWith('core-'));
  return [...core, ...rest];
}

// ---------------- ESTADÍSTICAS DEL DÍA ----------------

export interface DayStats {
  totalEntries: number;
  byArea: Record<string, number>;
  victories: number;
  falls: number;
  recoveries: number;
  torahMinutes: number;
  tefillotDone: string[];
  avgIntensity: number | null;
  topTags: [string, number][];
}

export function computeDayStats(entries: Entry[]): DayStats {
  const byArea: Record<string, number> = {};
  let torahMinutes = 0;
  const tefillot = new Set<string>();
  const intensities: number[] = [];
  const tagBag: Record<string, number> = {};

  for (const e of entries) {
    byArea[e.area] = (byArea[e.area] ?? 0) + 1;
    for (const a of e.areasSecondary) byArea[a] = (byArea[a] ?? 0) + 1;
    if (typeof e.fields.minutes === 'number') torahMinutes += e.fields.minutes as number;
    if (e.area === 'tefillah' && typeof e.fields.which === 'string') tefillot.add(e.fields.which as string);
    if (typeof e.intensity === 'number') intensities.push(e.intensity);
    for (const t of e.tags) tagBag[t] = (tagBag[t] ?? 0) + 1;
  }

  return {
    totalEntries: entries.length,
    byArea,
    victories: entries.filter((e) => e.valence === 'victory').length,
    falls: entries.filter((e) => e.valence === 'fall').length,
    recoveries: entries.filter((e) => e.valence === 'recovery').length,
    torahMinutes,
    tefillotDone: [...tefillot],
    avgIntensity: intensities.length ? +(intensities.reduce((a, b) => a + b, 0) / intensities.length).toFixed(1) : null,
    topTags: Object.entries(tagBag).sort((a, b) => b[1] - a[1]).slice(0, 6),
  };
}

// ---------------- RESUMEN AUTOMÁTICO DEL DÍA ----------------

export function generateDaySummary(
  info: JewishDayInfo,
  entries: Entry[],
  cheshbon?: DayRecord['cheshbon'],
  closing?: string,
): string {
  const s = computeDayStats(entries);
  const lines: string[] = [];
  lines.push(`יום ${info.hebrewDate}${info.isShabbat ? ' · שבת' : ''}${info.isYomTov ? ' · יום טוב' : ''}`);
  lines.push('');

  if (!entries.length) {
    lines.push('No hubo registros este día.');
  } else {
    const areas = Object.entries(s.byArea).sort((a, b) => b[1] - a[1]);
    lines.push(`Registros: ${s.totalEntries} · Áreas tocadas: ${areas.map(([a]) => catLabel(a as AreaId)).join(', ')}.`);
    if (s.torahMinutes) lines.push(`Torá: ${s.torahMinutes} min.`);
    if (s.tefillotDone.length) lines.push(`Tefilá: ${s.tefillotDone.join(', ')}.`);
    if (s.victories) lines.push(`Victorias: ${s.victories}.`);
    if (s.falls) lines.push(`Caídas: ${s.falls}${s.recoveries ? ` · Recuperaciones: ${s.recoveries}` : ''}.`);
    if (s.topTags.length) lines.push(`Temas frecuentes: ${s.topTags.map(([t, n]) => `${t}×${n}`).join(', ')}.`);
    if (s.avgIntensity != null) lines.push(`Intensidad media registrada: ${s.avgIntensity}/10.`);

    // Frases más significativas (victorias y aprendizajes)
    const highlights = entries
      .filter((e) => e.valence === 'victory' || e.pinned)
      .slice(0, 3)
      .map((e) => `• ${e.text.trim().slice(0, 160)}`);
    if (highlights.length) {
      lines.push('');
      lines.push('Momentos:');
      lines.push(...highlights);
    }
  }

  if (cheshbon?.learned) {
    lines.push('');
    lines.push(`Aprendí: ${cheshbon.learned}`);
  }
  if (cheshbon?.doDifferent) {
    lines.push(`Haría diferente: ${cheshbon.doDifferent}`);
  }

  if (closing) {
    lines.push('');
    lines.push(closing);
  }

  return lines.join('\n');
}

// ---------------- PATRONES (observación, nunca causalidad ni "Tikún") ----------------

export interface PatternObservation {
  area: AreaId | null;
  tag: string | null;
  observation: string;
  count: number;
  windowDays: number;
}

export function detectPatterns(recentEntries: Entry[], windowDays = 30): PatternObservation[] {
  const out: PatternObservation[] = [];
  const tagBag = countBy(recentEntries.flatMap((e) => e.tags));
  const fallTagBag = countBy(recentEntries.filter((e) => e.valence === 'fall').flatMap((e) => e.tags));

  for (const [tag, count] of Object.entries(tagBag).sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    if (count >= 3) {
      out.push({
        area: null,
        tag,
        observation: `La etiqueta "${tag}" aparece con frecuencia en tus registros recientes (${count} veces).`,
        count,
        windowDays,
      });
    }
  }

  for (const [tag, count] of Object.entries(fallTagBag)) {
    if (count >= 2) {
      out.push({
        area: null,
        tag,
        observation: `Tendencia observada: "${tag}" aparece junto a varias caídas recientes (${count}). Es una correlación, no una causa.`,
        count,
        windowDays,
      });
    }
  }

  // Hora del día de las caídas
  const fallHours = recentEntries
    .filter((e) => e.valence === 'fall')
    .map((e) => new Date(e.createdAt).getHours());
  if (fallHours.length >= 3) {
    const buckets: Record<string, number> = { mañana: 0, tarde: 0, noche: 0, madrugada: 0 };
    for (const h of fallHours) {
      if (h < 6) buckets.madrugada++;
      else if (h < 12) buckets.mañana++;
      else if (h < 19) buckets.tarde++;
      else buckets.noche++;
    }
    const top = topKey(buckets);
    if (top && buckets[top] / fallHours.length >= 0.5) {
      out.push({
        area: null,
        tag: null,
        observation: `Patrón observado: la mayoría de tus caídas recientes ocurren en la ${top}.`,
        count: buckets[top],
        windowDays,
      });
    }
  }

  return out;
}

// ---------------- helpers ----------------

function countBy(arr: string[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const x of arr) o[x] = (o[x] ?? 0) + 1;
  return o;
}
function topKey<T extends string>(o: Record<T, number>): T | null {
  const e = Object.entries(o) as [T, number][];
  if (!e.length) return null;
  return e.sort((a, b) => b[1] - a[1])[0][0];
}

export { catHe };
