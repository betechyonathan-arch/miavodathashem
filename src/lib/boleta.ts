/*
  Boletas. Cierra un periodo hebreo (semana, mes o año) y dice, a detalle:
   · dónde estuviste bien
   · dónde estuviste mal
   · un refuerzo concreto para el periodo que entra
   · un musar
  La boleta anual (se genera al comenzar el año nuevo, en Rosh Hashaná) suma además
  un `detalle`: meses fuertes/difíciles, midot predominantes y aprendizajes del año.

  El grueso es por reglas sobre los registros; si el módulo de IA está activo,
  la prosa de "bien / mal / refuerzo" la redacta la IA a partir de esos mismos
  datos (nunca inventa hechos, nunca da psak — §52/§60).
*/
import type { AreaId, DayRecord, Entry, Goal, PeriodBoleta, Settings } from './db/schema';
import { db } from './db/db';
import { buckets, periodFor, prevPeriod, type Period, type PeriodKind } from './periods';
import { buildReport } from './metrics';
import type { JewishDayInfo } from './jewishDay';
import { catLabel } from './categories';
import { WATCHED_FALLS_CATALOG } from './watchedFalls';
import { pickMusar } from './musar';
import { baseMusarContext } from './musar/context';
import { aiReady } from './ai/config';
import { aiPeriodBoleta } from './ai/tasks';

const CORE_AREAS: AreaId[] = ['torah', 'tefillah', 'middot', 'kedushah'];
const WATCHED = new Set(WATCHED_FALLS_CATALOG.map((w) => w.id));
const inArea = (e: Entry, a: AreaId) => e.area === a || e.areasSecondary.includes(a);
const distinctDays = (es: Entry[]) => new Set(es.map((e) => e.dayId)).size;
const watchedName = (e: Entry): string | null => {
  const id = e.tags.find((t) => WATCHED.has(t));
  return WATCHED_FALLS_CATALOG.find((w) => w.id === id)?.es ?? null;
};

interface PeriodWords {
  art: string; // 'La' | 'El'
  dem: string; // 'esta' | 'este'
  noun: string; // 'semana' | 'mes' | 'año'
  nounCap: string; // 'Semana' | 'Mes' | 'Año'
  entra: string; // 'la semana que entra' | 'el mes que entra' | 'el año que entra'
  pasado: string; // 'la semana pasada' | ...
  proximo: string; // 'la próxima semana' | ...
}

const PERIOD_WORDS: Record<PeriodKind, PeriodWords> = {
  week: {
    art: 'La', dem: 'esta', noun: 'semana', nounCap: 'Semana',
    entra: 'la semana que entra', pasado: 'la semana pasada', proximo: 'la próxima semana',
  },
  month: {
    art: 'El', dem: 'este', noun: 'mes', nounCap: 'Mes',
    entra: 'el mes que entra', pasado: 'el mes pasado', proximo: 'el próximo mes',
  },
  year: {
    art: 'El', dem: 'este', noun: 'año', nounCap: 'Año',
    entra: 'el año que entra', pasado: 'el año pasado', proximo: 'el próximo año',
  },
};

export interface BoletaData {
  kind: PeriodKind;
  label: string;
  fromKey: string;
  toKey: string;
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
  topAreas: { area: AreaId; count: number; prev: number }[];
  weakAreas: AreaId[];
  fallsDetail: { name: string; count: number }[];
  goalsStalled: { title: string; progress: number; days: number }[];
  kabalotSostenidas: number;
  focusMissed: AreaId[];
}

export function collectBoletaData(
  period: Period,
  deps: { entries: Entry[]; prevEntries: Entry[]; days: DayRecord[]; goals: Goal[]; settings: Settings },
): BoletaData {
  const { entries, prevEntries, days, goals, settings } = deps;

  const byAreaCount = (list: Entry[], a: AreaId) => list.filter((e) => inArea(e, a)).length;
  const areaIds = [...new Set(entries.map((e) => e.area))] as AreaId[];
  const topAreas = areaIds
    .map((a) => ({ area: a, count: byAreaCount(entries, a), prev: byAreaCount(prevEntries, a) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const weakAreas = CORE_AREAS.filter((a) => byAreaCount(entries, a) === 0);

  const fallsList = entries.filter((e) => e.valence === 'fall');
  const fallNames = new Map<string, number>();
  for (const f of fallsList) {
    const n = watchedName(f);
    if (n) fallNames.set(n, (fallNames.get(n) ?? 0) + 1);
  }
  const fallsDetail = [...fallNames.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const now = Date.now();
  const goalsStalled = goals
    .filter((g) => !g.archivedAt && g.status === 'active' && g.progress < 100)
    .map((g) => ({
      title: g.title || '(sin título)',
      progress: g.progress,
      days: Math.round((now - new Date(g.updatedAt).getTime()) / 86400000),
    }))
    .filter((g) => g.days >= 7)
    .sort((a, b) => b.days - a.days)
    .slice(0, 3);

  const focus = new Set<AreaId>();
  for (const d of days) for (const a of d.checkIn?.focusAreas ?? []) focus.add(a);
  const focusMissed = [...focus].filter((a) => byAreaCount(entries, a) === 0);

  const kabalotSostenidas = (settings.yehudi?.kabalot ?? []).filter((k) => {
    if (k.status !== 'sostenida' || !k.lastKeptAt) return false;
    return k.lastKeptAt >= period.fromKey; // marcada como sostenida dentro del periodo
  }).length;

  return {
    kind: period.kind,
    label: period.label,
    fromKey: period.fromKey,
    toKey: period.toKey,
    totalDays: period.spanDays,
    entries: entries.length,
    victories: entries.filter((e) => e.valence === 'victory').length,
    falls: fallsList.length,
    watchedFalls: fallsList.filter((e) => watchedName(e)).length,
    recoveries: entries.filter((e) => e.valence === 'recovery').length,
    torahDays: distinctDays(entries.filter((e) => inArea(e, 'torah'))),
    tefillahDays: distinctDays(entries.filter((e) => inArea(e, 'tefillah'))),
    cheshbonDays: days.filter((d) => d.cheshbon).length,
    checkinDays: days.filter((d) => d.checkIn).length,
    topAreas,
    weakAreas,
    fallsDetail,
    goalsStalled,
    kabalotSostenidas,
    focusMissed,
  };
}

/** Detalle adicional, solo para la boleta anual: meses fuertes/difíciles, midot
 *  predominantes y aprendizajes del año que cerró (recogidos de los חשבון הנפש). */
export interface YearDetail {
  strongMonths: { label: string; score: number }[];
  hardMonths: { label: string; score: number }[];
  predominantMiddot: [string, number][];
  learnings: { dayId: string; text: string }[];
}

export function buildYearDetail(
  period: Period,
  deps: { entries: Entry[]; prevEntries: Entry[]; days: DayRecord[] },
): YearDetail {
  const bk = buckets(period);
  const monthBuckets = bk.map((b) => ({
    label: b.label,
    entries: deps.entries.filter((e) => e.dayId >= b.fromKey && e.dayId <= b.toKey),
  }));
  const report = buildReport({
    entries: deps.entries,
    prevEntries: deps.prevEntries,
    days: deps.days,
    spanDays: period.spanDays,
    monthBuckets,
  });
  return {
    strongMonths: report.strongMonths,
    hardMonths: report.hardMonths,
    predominantMiddot: report.predominantMiddot,
    learnings: report.learnings.slice(0, 12),
  };
}

function renderYearDetail(y: YearDetail): string {
  const lines: string[] = [];
  if (y.strongMonths.length)
    lines.push(`Meses más fuertes: ${y.strongMonths.map((m) => m.label).join(', ')}.`);
  if (y.hardMonths.length)
    lines.push(`Meses más difíciles: ${y.hardMonths.map((m) => m.label).join(', ')}.`);
  if (y.predominantMiddot.length)
    lines.push(`Midot predominantes del año: ${y.predominantMiddot.map(([t]) => t).join(', ')}.`);
  if (y.learnings.length) {
    lines.push('Lo que aprendiste este año, en tus propias palabras:');
    for (const l of y.learnings) lines.push(`  ${l.dayId}: ${l.text}`);
  }
  return lines.map((x) => (x.startsWith('  ') ? x : '· ' + x)).join('\n');
}

export interface RulesBoleta {
  bien: string;
  mal: string;
  refuerzo: string;
}

type Strictness = Settings['strictness'];

export function buildRulesBoleta(d: BoletaData, s: Strictness): RulesBoleta {
  const hard = s === 'demanding';
  const pw = PERIOD_WORDS[d.kind];
  const ratio = (n: number) => Math.max(1, Math.round((n / 7) * d.totalDays));
  const bien: string[] = [];
  const mal: string[] = [];

  // ---- BIEN ----
  if (d.torahDays >= ratio(5)) bien.push(`Torá: ${d.torahDays} de ${d.totalDays} días con estudio registrado. Eso es constancia real.`);
  else if (d.torahDays >= ratio(3)) bien.push(`Torá: ${d.torahDays} días registrados. Hay base para construir.`);
  if (d.cheshbonDays >= ratio(5)) bien.push(`Cerraste el día con חשבון הנפש ${d.cheshbonDays} de ${d.totalDays} noches.`);
  if (d.checkinDays >= ratio(5)) bien.push(`Empezaste el día con כוונה (check-in) ${d.checkinDays} de ${d.totalDays} días.`);
  if (d.falls === 0) bien.push(`${pw.nounCap} sin ninguna caída registrada.`);
  else if (d.watchedFalls === 0) bien.push('Sin caídas de las que le pediste al sistema que vigile.');
  if (d.victories > 0)
    bien.push(`${d.victories} ${d.victories === 1 ? 'victoria' : 'victorias'} sobre pruebas concretas.`);
  if (d.recoveries > 0) bien.push(`${d.recoveries} ${d.recoveries === 1 ? 'regreso' : 'regresos'} tras una caída: no te quedaste caído.`);
  const grew = d.topAreas.find((a) => a.count >= Math.max(2, a.prev + 1));
  if (grew) bien.push(`${catLabel(grew.area)}: ${grew.count} registros, más que ${pw.pasado} (${grew.prev}).`);
  if (d.kabalotSostenidas > 0) bien.push(`${d.kabalotSostenidas} kabalá(s) sostenida(s) ${pw.dem} ${pw.noun}.`);
  if (!bien.length)
    bien.push(`Poco material ${pw.dem} ${pw.noun}. Lo poco que registraste cuenta; ${pw.proximo}, más registros y más honestidad.`);

  // ---- MAL ----
  if (d.torahDays <= ratio(2))
    mal.push(
      hard
        ? `Torá: solo ${d.torahDays} de ${d.totalDays} días. No es falta de tiempo; es una decisión que estás tomando. Cámbiala.`
        : `Torá: solo ${d.torahDays} de ${d.totalDays} días. Conviene fijar una hora.`,
    );
  if (d.tefillahDays <= ratio(2)) mal.push(`Tefilá: solo ${d.tefillahDays} de ${d.totalDays} días con algo registrado.`);
  if (d.cheshbonDays <= ratio(2))
    mal.push(
      hard
        ? `Solo ${d.cheshbonDays} de ${d.totalDays} noches con חשבון הנפש. Un día sin jeshbón es un día del que no aprendiste nada.`
        : `Solo ${d.cheshbonDays} de ${d.totalDays} noches con חשבון הנפש ${pw.dem} ${pw.noun}.`,
    );
  for (const f of d.fallsDetail) mal.push(`${f.name}: ${f.count} ${f.count === 1 ? 'vez' : 'veces'} ${pw.dem} ${pw.noun}.`);
  if (!d.fallsDetail.length && d.falls > 0) mal.push(`${d.falls} caídas registradas sin marcar de qué tipo.`);
  for (const a of d.focusMissed)
    mal.push(`Marcaste ${catLabel(a)} como foco en un check-in y no hubo ni un registro ahí. ¿Palabras o hechos?`);
  for (const g of d.goalsStalled) mal.push(`La meta "${g.title}" lleva ${g.days} días parada en ${g.progress}%.`);
  for (const a of d.weakAreas)
    if (!d.focusMissed.includes(a)) mal.push(`${catLabel(a)}: cero registros en todo ${pw.dem === 'esta' ? 'la' : 'el'} ${pw.noun}.`);
  if (!mal.length)
    mal.push(`Nada grave que señalar ${pw.dem} ${pw.noun}. Mantén el estándar; no bajes la guardia justo cuando vas bien.`);

  // ---- REFUERZO (una sola cosa concreta, el hueco más urgente) ----
  let refuerzo: string;
  if (d.fallsDetail.length) {
    refuerzo = `Foco de ${pw.entra}: ${d.fallsDetail[0].name}. Define hoy una acción concreta para el momento exacto en que empieza —no "tener más cuidado", una acción— y regístrala cuando la uses.`;
  } else if (d.torahDays <= ratio(3)) {
    refuerzo = `Refuerzo: fija una hora concreta para el seder de Torá y regístralo cada día. Meta mínima: ${ratio(6)} de ${d.totalDays} ${pw.proximo}.`;
  } else if (d.cheshbonDays <= ratio(3)) {
    refuerzo = `Refuerzo: חשבון הנפש todas las noches antes de dormir, aunque sea una línea. Meta: ${d.totalDays} de ${d.totalDays}.`;
  } else if (d.focusMissed.length) {
    refuerzo = `Refuerzo: lo que marques como foco en el check-in, regístralo ese mismo día. Cierra el círculo entre lo que dices y lo que haces.`;
  } else if (d.goalsStalled.length) {
    refuerzo = `Refuerzo: mueve "${d.goalsStalled[0].title}" ${pw.dem} ${pw.noun} aunque sea un 5%, o admite que la dejaste y archívala.`;
  } else {
    refuerzo = `Refuerzo: elige un área que va bien y súbele el estándar un escalón. ${pw.art} ${pw.noun} que estás bien es justo cuando no hay que aflojar.`;
  }

  return {
    bien: bien.map((x) => '· ' + x).join('\n'),
    mal: mal.map((x) => '· ' + x).join('\n'),
    refuerzo,
  };
}

/** Genera la boleta completa para un periodo (semana/mes/año hebreo). */
export async function generateBoleta(
  period: Period,
  deps: {
    entries: Entry[];
    prevEntries: Entry[];
    days: DayRecord[];
    goals: Goal[];
    settings: Settings;
    dayInfo: Parameters<typeof baseMusarContext>[1];
    yearDetail?: YearDetail;
  },
): Promise<PeriodBoleta> {
  const { settings, yearDetail } = deps;
  const data = collectBoletaData(period, deps);
  let body = buildRulesBoleta(data, settings.strictness);
  let by: PeriodBoleta['by'] = 'rules';

  if (aiReady(settings)) {
    const ai = await aiPeriodBoleta(data, settings.aiModel, settings.strictness, yearDetail);
    if (ai) {
      body = ai;
      by = 'ai';
    }
  }

  const m = pickMusar(
    { ...baseMusarContext(settings, deps.dayInfo), preferred: ['teshuva', 'exigencia'] },
    `boleta-${period.kind}-${period.fromKey}`,
  );

  return {
    id: `${period.kind}:${period.fromKey}`,
    kind: period.kind,
    fromKey: period.fromKey,
    toKey: period.toKey,
    label: period.label,
    createdAt: new Date().toISOString(),
    by,
    bien: body.bien,
    mal: body.mal,
    refuerzo: body.refuerzo,
    musar: { he: m.he, es: m.es, sourceEs: m.sourceEs },
    stats: {
      entries: data.entries,
      victories: data.victories,
      falls: data.falls,
      watchedFalls: data.watchedFalls,
      torahDays: data.torahDays,
      cheshbonDays: data.cheshbonDays,
      totalDays: data.totalDays,
    },
    ...(yearDetail ? { detalle: renderYearDetail(yearDetail) } : {}),
  };
}

export const MAX_BOLETAS_PER_KIND = 60;

async function periodDeps(period: Period, prev: Period) {
  const [pEntries, ppEntries, pDays] = await Promise.all([
    db.entries.where('dayId').between(period.fromKey, period.toKey, true, true).toArray(),
    db.entries.where('dayId').between(prev.fromKey, prev.toKey, true, true).toArray(),
    db.days.where('id').between(period.fromKey, period.toKey, true, true).toArray(),
  ]);
  const goals = await db.goals.toArray();
  return {
    entries: pEntries.filter((e) => !e.deletedAt),
    prevEntries: ppEntries.filter((e) => !e.deletedAt),
    days: pDays,
    goals,
  };
}

/**
 * Arma la boleta de un periodo concreto —semana, mes o año hebreo— (con IA si el
 * módulo está activo). Para el año agrega `detalle` (meses fuertes/difíciles, midot
 * predominantes, aprendizajes). NO la guarda — quien llama la mete en
 * `settings.boleta.boletas` por la store, para que se refleje en la UI y se suba a la nube.
 */
export async function buildBoletaForPeriod(
  period: Period,
  settings: Settings,
  dayInfo: JewishDayInfo | null,
): Promise<PeriodBoleta> {
  const deps = await periodDeps(period, prevPeriod(period));
  const yearDetail = period.kind === 'year' ? buildYearDetail(period, deps) : undefined;
  return generateBoleta(period, { ...deps, settings, dayInfo, yearDetail });
}

/** Inserta/reemplaza una boleta en la lista, ordenada y recortada — solo dentro de su
 *  propio tipo (semana/mes/año), sin desplazar boletas de los otros tipos. */
export function mergeBoleta(list: PeriodBoleta[] | undefined, b: PeriodBoleta): PeriodBoleta[] {
  const all = list ?? [];
  const sameKind = all.filter((x) => x.kind === b.kind && x.id !== b.id);
  const otherKinds = all.filter((x) => x.kind !== b.kind);
  const merged = [b, ...sameKind].sort((a, c) => c.fromKey.localeCompare(a.fromKey)).slice(0, MAX_BOLETAS_PER_KIND);
  return [...merged, ...otherKinds];
}

/** Normaliza una boleta guardada con el esquema viejo (solo semanal, sin `kind`). */
export function normalizeBoleta(raw: unknown): PeriodBoleta {
  const r = raw as Record<string, unknown> & Partial<PeriodBoleta> & { weekFromKey?: string; weekToKey?: string };
  if (r.kind && r.fromKey) return r as PeriodBoleta;
  const kind: PeriodKind = (r.kind as PeriodKind) ?? 'week';
  const fromKey = r.fromKey ?? r.weekFromKey ?? '';
  const toKey = r.toKey ?? r.weekToKey ?? fromKey;
  return {
    ...(r as PeriodBoleta),
    kind,
    fromKey,
    toKey,
    id: `${kind}:${fromKey}`,
    stats: { ...(r.stats as PeriodBoleta['stats']), totalDays: (r.stats as PeriodBoleta['stats'])?.totalDays ?? 7 },
  };
}

export function normalizeBoletaList(list: unknown): PeriodBoleta[] {
  return Array.isArray(list) ? list.map(normalizeBoleta) : [];
}

const AUTO_SETTINGS_KEY: Record<PeriodKind, 'autoOnNewWeek' | 'autoOnNewMonth' | 'autoOnRoshHashana'> = {
  week: 'autoOnNewWeek',
  month: 'autoOnNewMonth',
  year: 'autoOnRoshHashana',
};

/** El periodo cerrado más significativo (año en Rosh Hashaná > mes > semana) que aún
 *  no tiene boleta y cuya auto-generación está activada. Para el banner del Dashboard. */
export function pendingBoletaPeriod(
  settings: Settings,
  refDayKey: string,
): { kind: PeriodKind; period: Period } | null {
  for (const kind of ['year', 'month', 'week'] as PeriodKind[]) {
    if (!settings.boleta[AUTO_SETTINGS_KEY[kind]]) continue;
    const period = prevPeriod(periodFor(kind, refDayKey));
    const has = (settings.boleta.boletas ?? []).some((b) => b.id === `${kind}:${period.fromKey}`);
    if (!has) return { kind, period };
  }
  return null;
}
