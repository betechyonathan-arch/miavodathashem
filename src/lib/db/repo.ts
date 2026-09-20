/*
  Capa de repositorio: única puerta de entrada a los datos desde la UI.
  Si mañana se añade un backend con RLS + API para Capi, solo cambia este archivo.
*/
import { db } from './db';
import { defaultWatchedFalls } from '../watchedFalls';
import {
  curatedZoneLocation,
  deviceInIsrael,
  guessLocationFromEnv,
  isIsraelLocation,
} from '../geo';
import { normalizeBoletaList } from '../boleta';
import {
  SCHEMA_VERSION,
  type AreaId,
  type AuditLog,
  type CapiWriteRecord,
  type DayRecord,
  type Entry,
  type EntrySource,
  type Goal,
  type Kabala,
  type KabalaDayStatus,
  type LifeStage,
  type Settings,
  type Valence,
} from './schema';

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const nowIso = () => new Date().toISOString();

/**
 * Ubicación por defecto de la app hasta que el usuario cambió a detección por zona
 * horaria. Se conserva para reconocer una ubicación "sin tocar" y migrarla sola.
 */
const LEGACY_DEFAULT_LOCATION = {
  label: 'ירושלים · Jerusalén',
  latitude: 31.7683,
  longitude: 35.2137,
  tzid: 'Asia/Jerusalem',
  israel: true,
  elevation: 754,
} as const;

function locationUntouched(l: Settings['location'] | undefined): boolean {
  if (!l) return true;
  return (
    l.tzid === LEGACY_DEFAULT_LOCATION.tzid &&
    Math.abs((l.latitude ?? 0) - LEGACY_DEFAULT_LOCATION.latitude) < 1e-6 &&
    Math.abs((l.longitude ?? 0) - LEGACY_DEFAULT_LOCATION.longitude) < 1e-6 &&
    l.israel === true
  );
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  displayName: '',
  // Instalación nueva: se deduce de la zona horaria del dispositivo, para que el
  // día judío cambie al anochecer LOCAL y no al de Jerusalén.
  location: guessLocationFromEnv(),
  boundaryMode: 'tzeit',
  tzeitAngle: 8.5,
  dayBoundaryOverrides: {},
  // La fecha hebrea mostrada no cambia hasta la medianoche civil local. El día
  // judío "real" (Shabat, festivos, tema, día de los registros) sí cambia al
  // anochecer; esto es solo qué número de fecha se ve en pantalla.
  dateDisplayMode: 'anochecer',
  wakeHour: 5,
  splashAcknowledgedAt: null,
  themeOverride: 'auto',
  shabbatMode: true,
  mission: {
    lifeMission: 'לעבוד את ה׳',
    vision: '',
    values: [],
    becomingWho: '',
    currentStage: '',
    spiritualGoals: '',
  },
  trackedMitzvot: [],
  watchedFalls: defaultWatchedFalls(),
  primaryMiddah: '',
  strictness: 'firm',
  capiConnected: false,
  capiToken: '',
  capiScopes: ['READ_DAILY', 'READ_WEEKLY', 'READ_MONTHLY', 'READ_ALL'],
  capiLastPublishedAt: null,
  capiWriteEnabled: false,
  capiWriteToken: '',
  capiWriteScopes: [],
  capiWriteConnectedAt: null,
  reminders: { enabled: false, morning: '07:30', afternoon: '15:00', evening: '21:30' },
  musar: { density: 'clave', themes: [], favorites: [], densityBumpedV1: true, sefariaParashaEnabled: true },
  yehudi: { onboardedAt: null, items: {}, kabalot: [] },
  boleta: {
    autoOnNewWeek: true,
    autoOnNewMonth: true,
    autoOnRoshHashana: true,
    lastGeneratedWeekKey: null,
    lastGeneratedMonthKey: null,
    lastGeneratedYearKey: null,
    boletas: [],
  },
  welcomeDoneAt: null,
  aiEnabled: false,
  aiProvider: 'anthropic',
  aiModel: 'claude-opus-5',
  aiAutoClassify: true,
  aiAutoSummary: true,
  schemaVersion: SCHEMA_VERSION,
  createdAt: '',
  updatedAt: '',
};

// ---------- Settings ----------

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('singleton');
  if (existing) {
    // Corrección de la ubicación. Dos casos:
    //  1) DISPOSITIVO FUERA DE ISRAEL + ubicación guardada EN Israel → se corrige
    //     SIEMPRE a la zona del dispositivo. Esto pasa con el default viejo
    //     (Jerusalén) y también cuando una copia de la nube reintroduce Jerusalén.
    //     Sin esta corrección el día judío cambia al anochecer de Jerusalén y la
    //     fecha hebrea (y los yahrzeits) salen ~un día adelantados. Se re-evalúa
    //     en cada carga, así que la nube ya no puede volver a romperlo.
    //  2) (Compat) Jerusalén "sin tocar" en un dispositivo con zona conocida.
    const curated = curatedZoneLocation();
    const guess = guessLocationFromEnv();
    let autoLoc: Settings['location'] | null = null;
    if (!deviceInIsrael() && isIsraelLocation(existing.location)) {
      autoLoc = curated ?? guess;
    } else if (
      curated &&
      curated.tzid !== 'Asia/Jerusalem' &&
      locationUntouched(existing.location)
    ) {
      autoLoc = curated;
    }
    // Subida única de la densidad de musar: el usuario pidió "más musar, más
    // seguido". Se sube a 'maximo' una sola vez; si luego la cambia a mano, la
    // marca `densityBumpedV1` evita volver a forzarla.
    const mergedMusar = { ...DEFAULT_SETTINGS.musar, ...(existing.musar ?? {}) };
    const musarBumped = !mergedMusar.densityBumpedV1;
    if (musarBumped) {
      mergedMusar.density = 'maximo';
      mergedMusar.densityBumpedV1 = true;
    }
    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...existing,
      mission: { ...DEFAULT_SETTINGS.mission, ...existing.mission },
      location: autoLoc ?? { ...LEGACY_DEFAULT_LOCATION, ...existing.location },
      reminders: { ...DEFAULT_SETTINGS.reminders, ...(existing.reminders ?? {}) },
      musar: mergedMusar,
      yehudi: { ...DEFAULT_SETTINGS.yehudi, ...(existing.yehudi ?? {}) },
      boleta: {
        ...DEFAULT_SETTINGS.boleta,
        ...(existing.boleta ?? {}),
        boletas: normalizeBoletaList(existing.boleta?.boletas),
      },
    };
    if (autoLoc || musarBumped) {
      await db.settings.put(merged);
      if (autoLoc) await audit('system', 'location.autodetect', { tzid: autoLoc.tzid, label: autoLoc.label });
    }
    return merged;
  }
  const fresh: Settings = { ...DEFAULT_SETTINGS, createdAt: nowIso(), updatedAt: nowIso() };
  await db.settings.put(fresh);
  return fresh;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch, id: 'singleton', updatedAt: nowIso() };
  await db.settings.put(next);
  return next;
}

// ---------- Días ----------

export async function getDay(dayId: string): Promise<DayRecord | undefined> {
  return db.days.get(dayId);
}

export async function upsertDay(day: DayRecord): Promise<DayRecord> {
  const existing = await db.days.get(day.id);
  const merged: DayRecord = {
    ...day,
    ...(existing ?? {}),
    // los campos "de estructura" (fecha hebrea, zmanim, festivos) siempre se refrescan
    hebrewDate: day.hebrewDate,
    hebrewDateHe: day.hebrewDateHe,
    hebrewYear: day.hebrewYear,
    startsAt: day.startsAt,
    endsAt: day.endsAt,
    boundaryMode: day.boundaryMode,
    isShabbat: day.isShabbat,
    isYomTov: day.isYomTov,
    isErevShabbat: day.isErevShabbat,
    holidays: day.holidays,
    createdAt: existing?.createdAt ?? day.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  await db.days.put(merged);
  return merged;
}

export async function patchDay(dayId: string, patch: Partial<DayRecord>): Promise<void> {
  const existing = await db.days.get(dayId);
  if (!existing) return;
  await db.days.put({ ...existing, ...patch, id: dayId, updatedAt: nowIso() });
}

export async function listDays(limit = 400): Promise<DayRecord[]> {
  const all = await db.days.orderBy('id').reverse().limit(limit).toArray();
  return all;
}

// ---------- Entries ----------

export interface NewEntry {
  dayId: string;
  hebrewDate: string;
  area: AreaId;
  areasSecondary?: AreaId[];
  tags?: string[];
  text: string;
  fields?: Record<string, unknown>;
  source?: EntrySource;
  valence?: Valence;
  intensity?: number | null;
  autoClassified?: boolean;
  createdAt?: string;
  /** Quién origina el registro. `api` = Capi vía la Write API. Por defecto `user`. */
  actor?: AuditLog['actor'];
}

export async function addEntry(input: NewEntry): Promise<Entry> {
  const entry: Entry = {
    id: uid(),
    dayId: input.dayId,
    createdAt: input.createdAt ?? nowIso(),
    hebrewDate: input.hebrewDate,
    area: input.area,
    areasSecondary: input.areasSecondary ?? [],
    tags: dedupe(input.tags ?? []),
    text: input.text,
    fields: input.fields ?? {},
    source: input.source ?? 'quick',
    valence: input.valence ?? 'neutral',
    intensity: input.intensity ?? null,
    autoClassified: input.autoClassified ?? false,
    revisions: [],
    deletedAt: null,
  };
  await db.entries.put(entry);
  await audit(input.actor ?? 'user', 'entry.add', {
    id: entry.id,
    area: entry.area,
    valence: entry.valence,
    source: entry.source,
  });
  return entry;
}

/** Editar un registro CONSERVANDO el original como revisión (historial inmutable). */
export async function reviseEntry(
  id: string,
  patch: Partial<Pick<Entry, 'text' | 'fields' | 'tags' | 'area' | 'areasSecondary' | 'valence' | 'intensity' | 'pinned'>>,
  reason?: string,
): Promise<void> {
  const cur = await db.entries.get(id);
  if (!cur) return;
  const textChanged = patch.text !== undefined && patch.text !== cur.text;
  const fieldsChanged = patch.fields !== undefined && JSON.stringify(patch.fields) !== JSON.stringify(cur.fields);
  const tagsChanged = patch.tags !== undefined && JSON.stringify(patch.tags) !== JSON.stringify(cur.tags);
  const next: Entry = {
    ...cur,
    ...patch,
    tags: patch.tags ? dedupe(patch.tags) : cur.tags,
    revisions:
      textChanged || fieldsChanged || tagsChanged
        ? [...cur.revisions, { at: nowIso(), prevText: cur.text, prevFields: cur.fields, prevTags: cur.tags, reason }]
        : cur.revisions,
  };
  await db.entries.put(next);
  await audit('user', 'entry.revise', { id, reason: reason ?? null });
}

/** Archivar (nunca se borra físicamente una caída u otro registro). */
export async function archiveEntry(id: string): Promise<void> {
  const cur = await db.entries.get(id);
  if (!cur) return;
  await db.entries.put({ ...cur, deletedAt: nowIso() });
  await audit('user', 'entry.archive', { id });
}

export async function restoreEntry(id: string): Promise<void> {
  const cur = await db.entries.get(id);
  if (!cur) return;
  await db.entries.put({ ...cur, deletedAt: null });
}

export interface EntryQuery {
  dayId?: string;
  area?: AreaId;
  valence?: Valence;
  tag?: string;
  from?: string; // ISO
  to?: string; // ISO
  text?: string;
  includeArchived?: boolean;
  limit?: number;
}

export async function listEntries(q: EntryQuery = {}): Promise<Entry[]> {
  let coll = q.dayId
    ? db.entries.where('dayId').equals(q.dayId)
    : q.area
      ? db.entries.where('area').equals(q.area)
      : db.entries.orderBy('createdAt');

  let rows = await coll.toArray();
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (!q.includeArchived) rows = rows.filter((r) => !r.deletedAt);
  if (q.area && q.dayId) rows = rows.filter((r) => r.area === q.area || r.areasSecondary.includes(q.area!));
  if (q.valence) rows = rows.filter((r) => r.valence === q.valence);
  if (q.tag) rows = rows.filter((r) => r.tags.includes(q.tag!));
  if (q.from) rows = rows.filter((r) => r.createdAt >= q.from!);
  if (q.to) rows = rows.filter((r) => r.createdAt <= q.to!);
  if (q.text) {
    const needle = q.text.toLowerCase();
    rows = rows.filter(
      (r) => r.text.toLowerCase().includes(needle) || r.tags.some((t) => t.includes(needle)),
    );
  }
  if (q.limit) rows = rows.slice(-q.limit);
  return rows;
}

export async function countEntriesByArea(from: string, to: string): Promise<Record<string, number>> {
  const rows = await listEntries({ from, to });
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.area] = (out[r.area] ?? 0) + 1;
    for (const a of r.areasSecondary) out[a] = (out[a] ?? 0) + 1;
  }
  return out;
}

// ---------- Goals ----------

export async function listGoals(): Promise<Goal[]> {
  return db.goals.toArray();
}

export async function upsertGoal(g: Partial<Goal> & { id?: string }): Promise<Goal> {
  const id = g.id ?? uid();
  const existing = g.id ? await db.goals.get(g.id) : undefined;
  const next: Goal = {
    id,
    level: g.level ?? existing?.level ?? 'year',
    parentId: g.parentId ?? existing?.parentId ?? null,
    title: g.title ?? existing?.title ?? '',
    description: g.description ?? existing?.description ?? '',
    area: g.area ?? existing?.area ?? null,
    status: g.status ?? existing?.status ?? 'active',
    progress: g.progress ?? existing?.progress ?? 0,
    startDate: g.startDate ?? existing?.startDate ?? null,
    targetDate: g.targetDate ?? existing?.targetDate ?? null,
    notes: g.notes ?? existing?.notes ?? '',
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    archivedAt: g.archivedAt ?? existing?.archivedAt ?? null,
  };
  await db.goals.put(next);
  return next;
}

export async function archiveGoal(id: string): Promise<void> {
  const g = await db.goals.get(id);
  if (!g) return;
  await db.goals.put({ ...g, archivedAt: g.archivedAt ? null : nowIso(), updatedAt: nowIso() });
}

// ---------- Life stages ----------

export async function listStages(): Promise<LifeStage[]> {
  const all = await db.stages.toArray();
  return all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.startDate.localeCompare(b.startDate));
}

export async function upsertStage(s: Partial<LifeStage> & { id?: string }): Promise<LifeStage> {
  const id = s.id ?? uid();
  const existing = s.id ? await db.stages.get(s.id) : undefined;
  const next: LifeStage = {
    id,
    name: s.name ?? existing?.name ?? 'Nueva etapa',
    he: s.he ?? existing?.he ?? '',
    description: s.description ?? existing?.description ?? '',
    startDate: s.startDate ?? existing?.startDate ?? nowIso().slice(0, 10),
    endDate: s.endDate !== undefined ? s.endDate : existing?.endDate ?? null,
    primaryMiddah: s.primaryMiddah ?? existing?.primaryMiddah ?? '',
    focus: s.focus ?? existing?.focus ?? '',
    isCurrent: s.isCurrent ?? existing?.isCurrent ?? false,
    order: s.order ?? existing?.order ?? (await db.stages.count()),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    archivedAt: s.archivedAt ?? existing?.archivedAt ?? null,
  };
  await db.stages.put(next);
  return next;
}

export async function setCurrentStage(id: string): Promise<void> {
  const all = await db.stages.toArray();
  await db.transaction('rw', db.stages, async () => {
    for (const s of all) {
      const shouldBe = s.id === id;
      if (s.isCurrent !== shouldBe) await db.stages.put({ ...s, isCurrent: shouldBe, updatedAt: nowIso() });
    }
  });
}

export async function archiveStage(id: string): Promise<void> {
  const s = await db.stages.get(id);
  if (!s) return;
  await db.stages.put({ ...s, archivedAt: s.archivedAt ? null : nowIso(), isCurrent: false, updatedAt: nowIso() });
}

// ---------- Kabalot (compromisos con fecha, p. ej. 40 días de kedushá) ----------

export async function listKabalot(): Promise<Kabala[]> {
  const all = await db.kabalot.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listActiveKabalot(): Promise<Kabala[]> {
  const all = await db.kabalot.where('status').equals('activa').toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getActiveKabala(): Promise<Kabala | undefined> {
  const all = await db.kabalot.where('status').equals('activa').toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function createKabala(
  input: Omit<Kabala, 'id' | 'status' | 'days' | 'milestonesSeen' | 'createdAt'> & {
    seedStartDay?: KabalaDayStatus | null; // marca el día 1 al crear; null = no marcar nada
  },
): Promise<Kabala> {
  // Solo una kabalá activa a la vez: si hay otra, se cierra como completada/abandonada
  // según haya llegado o no a la meta (no se borra: el pasado se conserva).
  // Se pueden llevar varias kabalot a la vez: crear una nueva NO cierra las demás.
  const seed = input.seedStartDay === undefined ? 'limpio' : input.seedStartDay;
  const targetDays = Math.min(365, Math.max(1, Math.round(input.targetDays)));
  const k: Kabala = {
    id: uid(),
    he: input.he,
    es: input.es,
    kavana: input.kavana,
    kind: input.kind ?? 'cuidar',
    ...(input.presetId ? { presetId: input.presetId } : {}),
    area: input.area,
    targetDays,
    mode: input.mode,
    onFall: input.onFall,
    startDayId: input.startDayId,
    startHebrewDate: input.startHebrewDate,
    status: 'activa',
    days: seed ? { [input.startDayId]: { status: seed, at: nowIso() } } : {},
    milestonesSeen: [],
    createdAt: nowIso(),
    completedAt: null,
    abandonedAt: null,
  };
  await db.kabalot.put(k);
  await audit('user', 'kabala.create', { id: k.id, target: k.targetDays, mode: k.mode });
  return k;
}

/**
 * Marca el día `dayId` de la kabalá. En una kabalá de tipo 'cuidar', una caída crea además
 * un `Entry` real en el área de caídas (tag `kabala`) para que fluya al tablero, la boleta y
 * las métricas — sin base paralela. En una de tipo 'hacer', un día que no se pudo solo queda
 * anotado: no es una caída. Nunca borra ni "reinicia" en modo acumulativo.
 */
export async function markKabalaDay(args: {
  id: string;
  dayId: string;
  hebrewDate: string;
  status: KabalaDayStatus;
  note?: string;
}): Promise<Kabala | undefined> {
  const k = await db.kabalot.get(args.id);
  if (!k) return undefined;
  const next: Kabala = {
    ...k,
    days: {
      ...k.days,
      [args.dayId]: { status: args.status, at: nowIso(), ...(args.note ? { note: args.note } : {}) },
    },
  };
  await db.kabalot.put(next);
  if (args.status === 'caida' && (k.kind ?? 'cuidar') === 'cuidar') {
    await addEntry({
      dayId: args.dayId,
      hebrewDate: args.hebrewDate,
      area: 'fall',
      areasSecondary: k.area && k.area !== 'fall' ? [k.area] : [],
      tags: ['kabala'],
      text: args.note?.trim()
        ? args.note.trim()
        : `Caída registrada desde la kabalá "${k.es}". Lo que sigue ahora es el regreso.`,
      fields: { _kabala: { kabalaId: k.id } },
      source: 'quick',
      valence: 'fall',
    });
  }
  await audit('user', 'kabala.mark', { id: k.id, dayId: args.dayId, status: args.status });
  return next;
}

export async function updateKabala(id: string, patch: Partial<Kabala>): Promise<Kabala | undefined> {
  const k = await db.kabalot.get(id);
  if (!k) return undefined;
  const next = { ...k, ...patch, id };
  await db.kabalot.put(next);
  return next;
}

// ---------- Audit ----------

export async function audit(actor: AuditLog['actor'], action: string, detail: Record<string, unknown>): Promise<void> {
  await db.auditLogs.put({ id: uid(), at: nowIso(), actor, action, detail });
}

// ---------- Capi Write API (idempotencia + auditoría de escrituras) ----------

export async function getCapiWrite(idempotencyKey: string): Promise<CapiWriteRecord | undefined> {
  return db.capiWrites.get(idempotencyKey);
}

export async function recordCapiWrite(rec: CapiWriteRecord): Promise<void> {
  await db.capiWrites.put(rec);
}

export async function listCapiWrites(limit = 30): Promise<CapiWriteRecord[]> {
  const all = await db.capiWrites.orderBy('at').reverse().limit(limit).toArray();
  return all;
}

/** Nº de escrituras de Capi EXITOSAS desde `sinceIso` (para el rate limit). */
export async function countCapiWritesSince(sinceIso: string): Promise<number> {
  return db.capiWrites.where('at').aboveOrEqual(sinceIso).and((r) => r.ok).count();
}

// ---------- Export / import ----------

export async function exportAll(): Promise<Blob> {
  const [settings, days, entries, goals, stages, patterns, apiTokens, auditLogs, capiWrites, kabalot] = await Promise.all([
    db.settings.toArray(),
    db.days.toArray(),
    db.entries.toArray(),
    db.goals.toArray(),
    db.stages.toArray(),
    db.patterns.toArray(),
    db.apiTokens.toArray(),
    db.auditLogs.toArray(),
    db.capiWrites.toArray(),
    db.kabalot.toArray(),
  ]);
  const payload = {
    app: 'zury-avodah',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    data: { settings, days, entries, goals, stages, patterns, apiTokens, auditLogs, capiWrites, kabalot },
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function exportDay(dayId: string): Promise<Blob> {
  const [day, entries] = await Promise.all([db.days.get(dayId), listEntries({ dayId, includeArchived: true })]);
  const payload = { app: 'zury-avodah', kind: 'day', exportedAt: nowIso(), day, entries };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function importAll(json: string, mode: 'merge' | 'replace'): Promise<{ imported: number }> {
  const parsed = JSON.parse(json);
  if (parsed.app !== 'zury-avodah') throw new Error('Archivo no reconocido');
  const d = parsed.data ?? {};
  await db.transaction('rw', [db.settings, db.days, db.entries, db.goals, db.stages, db.patterns, db.apiTokens, db.auditLogs, db.capiWrites, db.kabalot], async () => {
    if (mode === 'replace') {
      await Promise.all([db.days.clear(), db.entries.clear(), db.goals.clear(), db.stages.clear(), db.patterns.clear(), db.kabalot.clear()]);
    }
    if (d.settings?.length) await db.settings.bulkPut(d.settings);
    if (d.days?.length) await db.days.bulkPut(d.days);
    if (d.entries?.length) await db.entries.bulkPut(d.entries);
    if (d.goals?.length) await db.goals.bulkPut(d.goals);
    if (d.stages?.length) await db.stages.bulkPut(d.stages);
    if (d.patterns?.length) await db.patterns.bulkPut(d.patterns);
    if (d.apiTokens?.length) await db.apiTokens.bulkPut(d.apiTokens);
    if (d.auditLogs?.length) await db.auditLogs.bulkPut(d.auditLogs);
    if (d.capiWrites?.length) await db.capiWrites.bulkPut(d.capiWrites);
    if (d.kabalot?.length) await db.kabalot.bulkPut(d.kabalot);
  });
  await audit('user', 'data.import', { mode, entries: d.entries?.length ?? 0 });
  return { imported: d.entries?.length ?? 0 };
}

export async function wipeAll(): Promise<void> {
  await Promise.all([
    db.days.clear(),
    db.entries.clear(),
    db.goals.clear(),
    db.stages.clear(),
    db.patterns.clear(),
    db.apiTokens.clear(),
    db.auditLogs.clear(),
    db.capiWrites.clear(),
    db.kabalot.clear(),
    db.settings.clear(),
  ]);
}

function dedupe(a: string[]): string[] {
  return [...new Set(a.map((s) => s.trim()).filter(Boolean))];
}
