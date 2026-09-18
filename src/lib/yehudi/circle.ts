/*
  יהודי שלם — el círculo "ser Yehudí al 100%".

  Mezcla de tres cosas, todas explícitas (cada punto tiene su "¿por qué?"):
   1. Cobertura del catálogo de halajot + jumrot (lo que sostienes de verdad,
      con actividad reciente en su área).  → hasta CATALOG_POINTS
   2. Constancia de por vida: el total de registros de TODA la app.  → hasta LIFE_POINTS
   3. Caídas recientes: recortan el avance en proporción ("lo encogen"), como
      mucho el 30%, y nunca lo mandan a cero.

  Es una vara alta a propósito. NUNCA es un veredicto ni una condena (§60): es el
  camino y lo que sigue. Determinista: mismos datos → mismo número.
*/
import type { AreaId, Entry, Settings, YehudiKabala } from '../db/schema';
import { catLabel } from '../categories';
import { WATCHED_FALLS_CATALOG } from '../watchedFalls';
import { YEHUDI_CATALOG, YEHUDI_TOTAL_WEIGHT, type YehudiItem } from './catalog';

const CATALOG_POINTS = 88;
const LIFE_POINTS = 12;
const LIFE_TARGET_ENTRIES = 600;
const STALE_DAYS = 60;
const FALL_WINDOW_DAYS = 30;
// Curvas < 1: el principio del camino cuenta más, para que el círculo se mueva
// desde el primer paso. El 100% sigue pidiéndolo todo.
const CATALOG_CURVE = 0.62;
const LIFE_CURVE = 0.7;
// Las caídas recientes recortan el avance en proporción; nunca lo mandan a cero.
const MAX_FALL_HAIRCUT = 0.3;
const STALE_MIN_HISTORY = 60; // no aplicar decaimiento por inactividad a cuentas nuevas
const STALE_FLOOR = 0.7;

const OWN_WEIGHT: Record<NonNullable<YehudiKabala['level']> | 'default', number> = {
  halacha: 2,
  jumra: 1.5,
  hiddur: 1,
  default: 1.5,
};

export interface YehudiPart {
  kind: 'catalog' | 'life' | 'penalty';
  label: string;
  points: number; // con signo
  detail: string;
}

export interface YehudiCircle {
  percent: number; // 0..100, 1 decimal
  raw: number;
  parts: YehudiPart[];
  catalogPct: number; // 0..1
  catalogKept: number;
  catalogPartial: number;
  catalogPending: number;
  catalogTotal: number;
  staleAreas: AreaId[];
  lifetimeEntries: number;
  recentFalls: number;
  watchedRecentFalls: number;
  ownKabalot: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const WATCHED_IDS = new Set(WATCHED_FALLS_CATALOG.map((w) => w.id));
const isWatchedFall = (e: Entry) => e.valence === 'fall' && e.tags.some((t) => WATCHED_IDS.has(t));

/** Días desde el último registro en cada área (Infinity si nunca). */
function lastActivityByArea(entries: Entry[]): Record<string, number> {
  const now = Date.now();
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (e.deletedAt) continue;
    const age = (now - new Date(e.createdAt).getTime()) / 86400000;
    for (const a of [e.area, ...e.areasSecondary]) {
      if (out[a] == null || age < out[a]) out[a] = age;
    }
  }
  return out;
}

function itemFactor(
  item: YehudiItem,
  base: number,
  kab: YehudiKabala | undefined,
  activityDays: number,
  applyStale: boolean,
  stale: Set<AreaId>,
): number {
  let f = base;
  if (kab) {
    if (kab.status === 'sostenida') f = Math.max(base, 0.9);
    else if (kab.status === 'aceptada') f = Math.max(base, 0.5);
    else if (kab.status === 'rota') f = Math.min(base, 0.3);
  }
  if (applyStale && f > STALE_FLOOR && activityDays > STALE_DAYS) {
    f = STALE_FLOOR;
    stale.add(item.area);
  }
  return f;
}

export function computeYehudiCircle(settings: Settings, entries: Entry[]): YehudiCircle {
  const alive = entries.filter((e) => !e.deletedAt);
  const items = settings.yehudi?.items ?? {};
  const kabalot = (settings.yehudi?.kabalot ?? []).filter((k) => k.status !== 'archivada');
  const activity = lastActivityByArea(alive);
  const stale = new Set<AreaId>();
  const applyStale = alive.length >= STALE_MIN_HISTORY;

  const kabByItem = new Map<string, YehudiKabala>();
  for (const k of kabalot) if (k.kind === 'catalog' && k.catalogId) kabByItem.set(k.catalogId, k);

  let N = 0;
  let D = YEHUDI_TOTAL_WEIGHT;
  let kept = 0;
  let partial = 0;
  let pending = 0;

  for (const item of YEHUDI_CATALOG) {
    const raw = items[item.id];
    const base = raw === 'si' ? 1 : raw === 'aveces' ? 0.4 : 0;
    const f = itemFactor(
      item,
      base,
      kabByItem.get(item.id),
      activity[item.area] ?? Infinity,
      applyStale,
      stale,
    );
    N += item.weight * f;
    if (f >= 0.85) kept++;
    else if (f >= 0.3) partial++;
    else pending++;
  }

  // Kabalot propias: suman al numerador y al denominador.
  let ownKabalot = 0;
  for (const k of kabalot) {
    if (k.kind !== 'own') continue;
    ownKabalot++;
    const w = OWN_WEIGHT[k.level ?? 'default'];
    D += w;
    const f = k.status === 'sostenida' ? 1 : k.status === 'aceptada' ? 0.5 : k.status === 'rota' ? 0.15 : 0;
    N += w * f;
  }

  const catalogPct = D > 0 ? N / D : 0;
  const catalogPoints = CATALOG_POINTS * Math.pow(catalogPct, CATALOG_CURVE);

  const lifetimeEntries = alive.length;
  const lifeFrac = clamp(lifetimeEntries / LIFE_TARGET_ENTRIES, 0, 1);
  const lifePoints = LIFE_POINTS * Math.pow(lifeFrac, LIFE_CURVE);

  const base = catalogPoints + lifePoints;

  // Caídas recientes: recortan el avance en proporción ("lo encogen"), pero nunca
  // lo mandan a cero.
  const now = Date.now();
  const recent = alive.filter(
    (e) => e.valence === 'fall' && (now - new Date(e.createdAt).getTime()) / 86400000 <= FALL_WINDOW_DAYS,
  );
  let pen = 0;
  let watched = 0;
  for (const f of recent) {
    const ageDays = (now - new Date(f.createdAt).getTime()) / 86400000;
    const w = isWatchedFall(f);
    if (w) watched++;
    const recency = 1 - ageDays / FALL_WINDOW_DAYS;
    pen += (w ? 3 : 1) * (0.4 + 0.6 * recency);
  }
  const haircut = clamp(pen / 45, 0, MAX_FALL_HAIRCUT);
  const removed = base * haircut;

  const raw = base - removed;
  const percent = Math.round(clamp(raw, 0, 100) * 10) / 10;

  const staleAreas = [...stale];
  const staleNote = staleAreas.length
    ? ` · sin actividad reciente en ${staleAreas.map((a) => catLabel(a)).join(', ')}`
    : '';

  const parts: YehudiPart[] = [
    {
      kind: 'catalog',
      label: 'Catálogo de halajot y jumrot',
      points: +catalogPoints.toFixed(1),
      detail: `${kept} sostenidas · ${partial} a medias · ${pending} pendientes de ${YEHUDI_CATALOG.length} ítems (${Math.round(
        catalogPct * 100,
      )}% del catálogo)${staleNote}`,
    },
    {
      kind: 'life',
      label: 'Constancia de por vida',
      points: +lifePoints.toFixed(1),
      detail: `${lifetimeEntries} registros en toda la app · meta ${LIFE_TARGET_ENTRIES} (${Math.round(
        lifeFrac * 100,
      )}%)`,
    },
    {
      kind: 'penalty',
      label: 'Caídas recientes',
      points: -+removed.toFixed(1),
      detail: recent.length
        ? `${recent.length} en ${FALL_WINDOW_DAYS} días${
            watched ? ` · ${watched} de vigilancia` : ''
          } · te quitan el ${Math.round(haircut * 100)}% del avance`
        : `sin caídas en ${FALL_WINDOW_DAYS} días`,
    },
  ];

  return {
    percent,
    raw: +raw.toFixed(1),
    parts,
    catalogPct,
    catalogKept: kept,
    catalogPartial: partial,
    catalogPending: pending,
    catalogTotal: YEHUDI_CATALOG.length,
    staleAreas,
    lifetimeEntries,
    recentFalls: recent.length,
    watchedRecentFalls: watched,
    ownKabalot,
  };
}

/**
 * Propone hasta 3 kabalot del catálogo: lo que aún no cuidas ('no' o sin marcar),
 * priorizando tu área más floja y, dentro de ella, lo más alcanzable (menos peso)
 * y el din antes que la jumrá.
 */
export function proposeKabalot(settings: Settings, max = 3): YehudiItem[] {
  const items = settings.yehudi?.items ?? {};
  const active = new Set(
    (settings.yehudi?.kabalot ?? [])
      .filter((k) => k.kind === 'catalog' && k.status !== 'archivada' && k.catalogId)
      .map((k) => k.catalogId as string),
  );

  // ratio de "cuidadas" por área
  const perArea = new Map<string, { kept: number; total: number }>();
  for (const it of YEHUDI_CATALOG) {
    const a = perArea.get(it.area) ?? { kept: 0, total: 0 };
    a.total++;
    if (items[it.id] === 'si') a.kept++;
    perArea.set(it.area, a);
  }
  const areaScore = (a: string) => {
    const s = perArea.get(a);
    return s && s.total ? s.kept / s.total : 1;
  };
  const levelRank = { halacha: 0, jumra: 1, hiddur: 2 } as const;

  return YEHUDI_CATALOG.filter((it) => items[it.id] !== 'si' && !active.has(it.id))
    .sort(
      (a, b) =>
        areaScore(a.area) - areaScore(b.area) ||
        levelRank[a.level] - levelRank[b.level] ||
        a.weight - b.weight,
    )
    .slice(0, max);
}

export interface LifetimeTotals {
  entries: number;
  victories: number;
  falls: number;
  recoveries: number;
  daysLogged: number;
  torahMinutes: number;
  kabalotSostenidas: number;
}

export function lifetimeTotals(entries: Entry[], settings: Settings): LifetimeTotals {
  const alive = entries.filter((e) => !e.deletedAt);
  let torah = 0;
  const days = new Set<string>();
  for (const e of alive) {
    days.add(e.dayId);
    if (
      (e.area === 'torah' || e.areasSecondary.includes('torah')) &&
      typeof e.fields.minutes === 'number'
    )
      torah += e.fields.minutes as number;
  }
  return {
    entries: alive.length,
    victories: alive.filter((e) => e.valence === 'victory').length,
    falls: alive.filter((e) => e.valence === 'fall').length,
    recoveries: alive.filter((e) => e.valence === 'recovery').length,
    daysLogged: days.size,
    torahMinutes: Math.round(torah),
    kabalotSostenidas: (settings.yehudi?.kabalot ?? []).filter((k) => k.status === 'sostenida').length,
  };
}

export { CATALOG_POINTS, LIFE_POINTS, LIFE_TARGET_ENTRIES, MAX_FALL_HAIRCUT };
