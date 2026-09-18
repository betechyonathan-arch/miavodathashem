/*
  Tareas de IA (invisibles). Cada una degrada a null/undefined si algo falla,
  y la app sigue con reglas.
*/
import type { AreaId, DayRecord, Entry, Valence } from '../db/schema';
import { CATEGORIES, catLabel } from '../categories';
import type { Classification } from '../classify';
import type { JewishDayInfo } from '../jewishDay';
import { AiError, claudeText, parseJsonLoose } from './client';
import { GUARDRAILS } from './config';

const AREA_IDS = CATEGORIES.map((c) => c.id);
const VALENCES: Valence[] = ['victory', 'fall', 'recovery', 'neutral'];

const TAG_VOCAB = [
  'kaas', 'savlanut', 'gaava', 'anava', 'kina', 'simja', 'zerizut', 'atzlut',
  'emet', 'lashon_hara', 'shtika', 'stress', 'hashem', 'torah', 'tefillah',
  'emunah', 'bitachon', 'kedushah', 'gratitude',
];

// ---------------- Clasificación ----------------

interface RawClsf {
  area?: string;
  areasSecondary?: string[];
  tags?: string[];
  valence?: string;
  intensity?: number | null;
}

export async function aiClassify(text: string, model: string, forcedArea?: AreaId): Promise<Classification | null> {
  const system = [
    'Eres el clasificador interno de un diario personal de Avodat Hashem.',
    'Conviertes lo que la persona cuenta en datos estructurados. No conversas.',
    '',
    `Áreas válidas (elige de esta lista exacta): ${AREA_IDS.join(', ')}.`,
    `Etiquetas sugeridas (puedes usar otras en minúscula y con guion_bajo): ${TAG_VOCAB.join(', ')}.`,
    'valence: uno de victory | fall | recovery | neutral.',
    '  victory = venció una prueba / se controló. fall = cayó. recovery = regresó tras una caída. neutral = ninguna.',
    'intensity: 0..10 o null si no aplica.',
    '',
    'Devuelve SOLO este JSON, sin texto extra:',
    '{"area": "<id>", "areasSecondary": ["<id>", ...], "tags": ["..."], "valence": "<v>", "intensity": <0-10|null>}',
    '',
    GUARDRAILS,
  ].join('\n');

  try {
    const raw = await claudeText({ model, system, user: text, maxTokens: 400 });
    const j = parseJsonLoose<RawClsf>(raw);
    if (!j) return null;

    const area = (forcedArea ?? (AREA_IDS.includes(j.area as AreaId) ? (j.area as AreaId) : 'journal')) as AreaId;
    const areasSecondary = (j.areasSecondary ?? [])
      .filter((a): a is AreaId => AREA_IDS.includes(a as AreaId) && a !== area)
      .slice(0, 4);
    const tags = (j.tags ?? []).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 8);
    const valence: Valence = VALENCES.includes(j.valence as Valence) ? (j.valence as Valence) : 'neutral';
    const intensity = typeof j.intensity === 'number' ? Math.max(0, Math.min(10, Math.round(j.intensity))) : null;

    return { area, areasSecondary, tags, valence, intensity, why: ['clasificado por IA'] };
  } catch (e) {
    if (e instanceof AiError) return null;
    return null;
  }
}

// ---------------- Resumen del día ----------------

export async function aiDaySummary(
  info: JewishDayInfo,
  entries: Entry[],
  cheshbon: DayRecord['cheshbon'] | undefined,
  model: string,
  tone?: string,
): Promise<string | null> {
  if (!entries.length && !cheshbon) return null;
  const lines = entries.map((e) => {
    const parts = [`- [${catLabel(e.area)}]`];
    if (e.valence !== 'neutral') parts.push(`(${e.valence})`);
    parts.push(e.text.trim());
    return parts.join(' ');
  });
  const cheshbonText = cheshbon
    ? [
        cheshbon.answers.map((a) => `Q: ${a.q}\nA: ${a.a}`).join('\n'),
        cheshbon.learned ? `Aprendí: ${cheshbon.learned}` : '',
        cheshbon.doDifferent ? `Haría diferente: ${cheshbon.doDifferent}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const system = [
    'Resumes el día de Avodat Hashem de una persona a partir de sus registros.',
    'Español, 1er persona ("hoy..."). Entre 4 y 8 frases.',
    tone ?? 'Tono cálido y sobrio.',
    'Menciona: qué hizo, cómo rezó/estudió si aparece, victorias, caídas y recuperación, midot, gratitud, aprendizaje.',
    'Sin sermón, sin psak, sin afirmar causas. Correlación, no causalidad.',
    'Devuelve solo el texto del resumen.',
    '',
    GUARDRAILS,
  ].join('\n');

  const user = [
    `Día: ${info.hebrewDate}${info.isShabbat ? ' (Shabat)' : ''}${info.isYomTov ? ' (Yom Tov)' : ''}`,
    '',
    'Registros:',
    lines.join('\n') || '(ninguno)',
    cheshbonText ? `\nחשבון הנפש:\n${cheshbonText}` : '',
  ].join('\n');

  try {
    return await claudeText({ model, system, user, maxTokens: 700 });
  } catch {
    return null;
  }
}

// ---------------- Observaciones (tendencias / correlaciones) ----------------

const INSIGHTS_LS = 'zury.aiInsights';

interface InsightsCache {
  at: number;
  count: number;
  observations: string[];
}

export function readInsightsCache(): InsightsCache | null {
  try {
    const raw = localStorage.getItem(INSIGHTS_LS);
    return raw ? (JSON.parse(raw) as InsightsCache) : null;
  } catch {
    return null;
  }
}

export async function aiInsights(recent: Entry[], model: string, tone?: string): Promise<string[] | null> {
  if (recent.length < 5) return null;

  const digest = recent
    .slice(-120)
    .map((e) => {
      const d = e.dayId.slice(5); // MM-DD
      const h = new Date(e.createdAt).getHours();
      return `${d} ${String(h).padStart(2, '0')}h [${catLabel(e.area)}] ${e.valence !== 'neutral' ? e.valence + ' ' : ''}${e.tags.join(',')} :: ${e.text.trim().slice(0, 120)}`;
    })
    .join('\n');

  const system = [
    'Analizas registros de un diario personal de Avodat Hashem (últimas semanas).',
    'Devuelve un array JSON de 2 a 5 frases en español, cada una una OBSERVACIÓN.',
    'Empieza cada frase con "Tendencia observada:", "Correlación observada:" o "Patrón observado:".',
    'Ejemplos de lo que puedes notar: horas del día con más caídas, midá que reaparece,',
    'áreas que crecen o bajan, qué suele acompañar a las victorias.',
    tone ?? '',
    'PROHIBIDO: afirmar causas, dar consejo espiritual, dar psak, hablar de "Tikún", juzgar (llamar fracaso).',
    'Formato: ["...", "..."]',
    '',
    GUARDRAILS,
  ].join('\n');

  try {
    const raw = await claudeText({ model, system, user: digest, maxTokens: 600 });
    const arr = parseJsonLoose<string[]>(raw);
    if (!Array.isArray(arr)) return null;
    const observations = arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 5);
    try {
      localStorage.setItem(
        INSIGHTS_LS,
        JSON.stringify({ at: Date.now(), count: recent.length, observations } satisfies InsightsCache),
      );
    } catch {
      /* ignore */
    }
    return observations;
  } catch {
    return null;
  }
}

// ---------------- Boletas (semanal / mensual / anual) ----------------

interface BoletaAiInput {
  kind: 'week' | 'month' | 'year';
  label: string;
  totalDays: number;
  entries: number;
  victories: number;
  falls: number;
  watchedFalls: number;
  recoveries: number;
  torahDays: number;
  tefillahDays: number;
  cheshbonDays: number;
  checkinDays: number;
  topAreas: { area: string; count: number; prev: number }[];
  weakAreas: string[];
  fallsDetail: { name: string; count: number }[];
  goalsStalled: { title: string; progress: number; days: number }[];
  focusMissed: string[];
  kabalotSostenidas: number;
}

interface BoletaYearDetailInput {
  strongMonths: { label: string; score: number }[];
  hardMonths: { label: string; score: number }[];
  predominantMiddot: [string, number][];
  learnings: { dayId: string; text: string }[];
}

const PERIOD_NAME = { week: 'SEMANAL', month: 'MENSUAL', year: 'ANUAL' } as const;
const PERIOD_ENTRA = { week: 'la semana que entra', month: 'el mes que entra', year: 'el año que entra' } as const;
const PERIOD_ESTE = { week: 'esta semana', month: 'este mes', year: 'este año' } as const;

export async function aiPeriodBoleta(
  d: BoletaAiInput,
  model: string,
  strictness: 'gentle' | 'firm' | 'demanding',
  yearDetail?: BoletaYearDetailInput,
): Promise<{ bien: string; mal: string; refuerzo: string } | null> {
  const tone =
    strictness === 'demanding'
      ? 'Tono directo y exigente. No adules, no suavices. Nombra la autoindulgencia y las excusas si los datos las muestran.'
      : strictness === 'firm'
        ? 'Tono honesto y claro, sin adular.'
        : 'Tono cálido y alentador, pero honesto.';

  const system = [
    `Escribes la BOLETA ${PERIOD_NAME[d.kind]} de un diario personal de Avodat Hashem, en español, a partir de datos ya calculados.`,
    'Tres campos, cada uno en prosa con viñetas "· " (2 a 6 viñetas):',
    `  bien   = dónde estuvo bien ${PERIOD_ESTE[d.kind]}, a detalle y con los números.`,
    `  mal    = dónde estuvo mal, a detalle y con los números, sin rodeos.`,
    `  refuerzo = UNA sola cosa concreta para ${PERIOD_ENTRA[d.kind]} (una acción, no "esforzarse más").`,
    tone,
    d.kind === 'year'
      ? 'Si te doy meses fuertes/difíciles, midot predominantes o aprendizajes del año, apóyate en ellos para dar contexto real al año completo.'
      : '',
    'Usa SOLO los datos que te doy. No inventes hechos ni cifras. No felicites de más ni condenes.',
    'PROHIBIDO: decir que la persona es un fracaso, dar psak, hablar de castigo divino, afirmar causas. Una caída se responde con el regreso, no con culpa.',
    'Devuelve SOLO este JSON: {"bien": "...", "mal": "...", "refuerzo": "..."}',
    '',
    GUARDRAILS,
  ]
    .filter(Boolean)
    .join('\n');

  const user = JSON.stringify(yearDetail ? { ...d, ...yearDetail } : d, null, 1);

  try {
    const raw = await claudeText({ model, system, user, maxTokens: 1100 });
    const j = parseJsonLoose<{ bien?: string; mal?: string; refuerzo?: string }>(raw);
    if (!j || !j.bien || !j.mal || !j.refuerzo) return null;
    return { bien: String(j.bien).trim(), mal: String(j.mal).trim(), refuerzo: String(j.refuerzo).trim() };
  } catch {
    return null;
  }
}

// ---------------- Lectura directa del periodo (para el PDF) ----------------

export interface PeriodAssessmentInput {
  kind: 'week' | 'month' | 'year';
  label: string;
  spanDays: number;
  activeDays: number;
  totalEntries: number;
  victories: number;
  falls: number;
  recoveries: number;
  prevEntries: number;
  prevVictories: number;
  prevFalls: number;
  metrics: { group: string; label: string; value: string; tone?: string; delta?: number }[];
  predominantMiddot: [string, number][];
  learnings: string[];
  doDifferent: string[];
  strongMonths?: { label: string; score: number }[];
  hardMonths?: { label: string; score: number }[];
}

export interface PeriodAssessment {
  comoVoy: string;
  dondeFalle: string;
  queCorregir: string;
  enUnaFrase: string;
}

const PA_PERIODO = { week: 'la semana', month: 'el mes', year: 'el año' } as const;
const PA_ENTRA = { week: 'la semana que entra', month: 'el mes que entra', year: 'el año que entra' } as const;

/**
 * Redacta, para el PDF de resumen del periodo, una lectura DIRECTA y con opinión
 * de cómo va la persona: cómo voy, dónde fallé, qué corregir. Degrada a null.
 */
export async function aiPeriodAssessment(
  d: PeriodAssessmentInput,
  model: string,
  strictness: 'gentle' | 'firm' | 'demanding',
): Promise<PeriodAssessment | null> {
  const tone =
    strictness === 'demanding'
      ? 'Tono directo y exigente, sin rodeos. No adules, no suavices. Nombra la autoindulgencia, las excusas y lo que se dejó caer cuando los datos lo muestran.'
      : strictness === 'firm'
        ? 'Tono honesto y claro, sin adular.'
        : 'Tono cálido y honesto: alienta, pero no maquilla lo que los datos dicen.';

  const system = [
    `Escribes la LECTURA de cómo le fue a una persona en ${PA_PERIODO[d.kind]}, para su diario de Avodat Hashem.`,
    'Español, segunda persona ("vas…", "bajaste…", "no cerraste…"). Frases cortas y directas, con los números.',
    tone,
    'Cuatro campos:',
    `  comoVoy    = 2 a 4 frases: cómo va ${PA_PERIODO[d.kind]} en conjunto (constancia, cantidad, calidad, midot), citando cifras y la comparación con el periodo anterior.`,
    '  dondeFalle = viñetas "· " (2 a 5): dónde fallaste, qué dejaste caer, qué bajó. Concreto, con el dato. Sin rodeos.',
    `  queCorregir = viñetas "· " (1 a 3): acciones concretas para ${PA_ENTRA[d.kind]} (una acción medible, no "esforzarse más").`,
    '  enUnaFrase = UNA sola frase corta, al hueso, que resuma el periodo.',
    d.kind === 'year'
      ? 'Si te doy meses fuertes/difíciles, midot predominantes o aprendizajes, úsalos para dar contexto real al año.'
      : '',
    'Usa SOLO los datos que te doy. No inventes hechos ni cifras.',
    'PROHIBIDO: decir que la persona es un fracaso, dar psak, hablar de castigo divino, afirmar causas. Una caída se responde con el regreso, no con culpa.',
    'Devuelve SOLO este JSON: {"comoVoy": "...", "dondeFalle": "...", "queCorregir": "...", "enUnaFrase": "..."}',
    '',
    GUARDRAILS,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const raw = await claudeText({ model, system, user: JSON.stringify(d, null, 1), maxTokens: 1200 });
    const j = parseJsonLoose<Partial<PeriodAssessment>>(raw);
    if (!j || !j.comoVoy || !j.dondeFalle || !j.queCorregir) return null;
    return {
      comoVoy: String(j.comoVoy).trim(),
      dondeFalle: String(j.dondeFalle).trim(),
      queCorregir: String(j.queCorregir).trim(),
      enUnaFrase: String(j.enUnaFrase ?? '').trim(),
    };
  } catch {
    return null;
  }
}

// ---------------- Prueba de conexión ----------------

export async function aiPing(model: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = await claudeText({
      model,
      system: 'Responde solo con la palabra OK.',
      user: 'ping',
      maxTokens: 16,
    });
    return { ok: /ok/i.test(r), detail: r.slice(0, 80) };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}
