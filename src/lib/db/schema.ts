/*
  ZURY AVODAH — modelo de datos
  Diseñado para durar décadas: entidades estables, historial inmutable,
  y una capa de repositorio (repo.ts) que aísla la UI de Dexie/IndexedDB
  para poder migrar a un backend + API de Capi sin reescribir pantallas.
*/

/** Áreas de Avodá. El identificador es estable; el rótulo puede cambiar. */
export type AreaId =
  | 'torah'
  | 'tefillah'
  | 'hashem'
  | 'emunah'
  | 'bitachon'
  | 'middot'
  | 'kedushah'
  | 'speech'
  | 'ben_adam'
  | 'yerushalayim'
  | 'mitzvot'
  | 'musar'
  | 'music'
  | 'clothing'
  | 'sleep'
  | 'phone'
  | 'exercise'
  | 'nature'
  | 'work'
  | 'emotion'
  | 'thought'
  | 'test'
  | 'decision'
  | 'gratitude'
  | 'victory'
  | 'fall'
  | 'recovery'
  | 'journal';

/** Valencia de un registro: victoria / caída / recuperación / neutral. */
export type Valence = 'victory' | 'fall' | 'recovery' | 'neutral';

/** Cómo se creó el registro. `capi` = escrito por Capi vía la Write API. */
export type EntrySource = 'quick' | 'text' | 'voice' | 'checkin' | 'cheshbon' | 'import' | 'capi';

/** Revisión: el texto/estructura previa se conserva, nunca se borra. */
export interface Revision {
  at: string; // ISO timestamp
  prevText: string;
  prevFields: Record<string, unknown>;
  prevTags: string[];
  reason?: string;
}

/**
 * Registro universal. TODO lo que el usuario "le cuenta al sistema" es un Entry:
 * Torá, Tefilá, una Midá, una victoria, una caída, un pensamiento, texto libre...
 */
export interface Entry {
  id: string;
  dayId: string; // id del día judío (ancla civil ISO, ver jewishDay.ts)
  createdAt: string; // timestamp real ISO
  hebrewDate: string; // fecha hebrea legible en el momento del registro
  area: AreaId; // área principal
  areasSecondary: AreaId[]; // áreas adicionales detectadas
  tags: string[]; // etiquetas libres + detectadas (kaas, savlanut, lashon_hara...)
  text: string; // TEXTO ORIGINAL — inmutable salvo revisión explícita
  fields: Record<string, unknown>; // datos estructurados específicos del área
  source: EntrySource;
  valence: Valence;
  intensity: number | null; // 0..10 cuando aplica (estrés, kavaná, conexión...)
  autoClassified: boolean; // true si el área/tags salieron del clasificador de reglas
  pinned?: boolean;
  revisions: Revision[];
  deletedAt?: string | null; // archivado (nunca se borra físicamente una caída)
}

/** Un día judío completo. dayId = fecha civil ancla en ISO (YYYY-MM-DD). */
export interface DayRecord {
  id: string; // dayId
  hebrewDate: string; // "17 Elul 5786"
  hebrewDateHe: string; // "י״ז אֱלוּל תשפ״ו"
  hebrewYear: number;
  civilAnchor: string; // ISO date (mismo que id)
  startsAt: string; // ISO: inicio del día judío (anochecer previo)
  endsAt: string; // ISO: fin del día judío (anochecer)
  boundaryMode: 'shkia' | 'tzeit';
  isShabbat: boolean;
  isYomTov: boolean;
  isErevShabbat: boolean;
  holidays: string[];
  // Check-in de inicio de día (máx ~60s)
  checkIn?: {
    at: string;
    answers: { q: string; a: string }[];
    focusAreas: AreaId[];
  };
  // חשבון הנפש de fin de día
  cheshbon?: {
    at: string;
    answers: { q: string; a: string; area?: AreaId }[];
    learned?: string;
    doDifferent?: string;
  };
  autoSummary?: {
    at: string;
    text: string;
    stats: Record<string, unknown>;
    by?: 'rules' | 'ai';
  };
  moodEnd?: number | null; // 0..10
  mitzvot?: string[]; // ids del catálogo marcados como hechos hoy
  createdAt: string;
  updatedAt: string;
}

/** Jerarquía de metas: misión → etapa → año → mes → semana → día. */
export type GoalLevel = 'mission' | 'stage' | 'year' | 'month' | 'week' | 'day';
export interface Goal {
  id: string;
  level: GoalLevel;
  parentId: string | null;
  title: string;
  description: string;
  area: AreaId | null;
  status: 'active' | 'paused' | 'done' | 'dropped';
  progress: number; // 0..100
  startDate: string | null;
  targetDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null; // el pasado no se borra
}

/** Etapa de vida: Yeshivá, Trabajo, Matrimonio, Familia… El usuario las crea. */
export interface LifeStage {
  id: string;
  name: string;
  he: string;
  description: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string | null; // null = en curso
  primaryMiddah: string; // midá principal de la etapa
  focus: string; // valores / enfoque de la etapa
  isCurrent: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null; // el pasado no se borra
}

/** Patrón observado por el motor de reglas. Nunca afirma causalidad ni Tikún. */
export interface Pattern {
  id: string;
  area: AreaId | null;
  tag: string | null;
  observation: string; // "Esta Midá aparece con frecuencia en tus registros"
  windowDays: number;
  count: number;
  firstSeen: string;
  lastSeen: string;
  updatedAt: string;
}

/**
 * Kabalá de crecimiento para el círculo יהודי שלם. Puede venir del catálogo
 * (`kind: 'catalog'`, con `catalogId`) o escrita por el usuario (`kind: 'own'`).
 * Una kabalá 'sostenida' sube el factor de su ítem en el círculo.
 */
export interface YehudiKabala {
  id: string;
  kind: 'catalog' | 'own';
  catalogId?: string;
  he?: string;
  es: string;
  area?: AreaId;
  level?: 'halacha' | 'jumra' | 'hiddur';
  status: 'aceptada' | 'sostenida' | 'rota' | 'archivada';
  acceptedAt: string;
  lastKeptAt?: string;
  brokenAt?: string;
  note?: string;
}

/**
 * Kabalá con fecha — un compromiso acotado en el tiempo (p. ej. "40 días de
 * kedushá / shemirat habrit, para que por ese zejut Hashem conceda el zivug
 * hagun"). Distinta de `YehudiKabala` (kabalot de crecimiento del círculo, sin
 * fecha de término). Se toma **bli neder**. §60: una caída se responde con el
 * regreso — nunca es un veredicto ni implica que Hashem retiene la yeshuá.
 */
export type KabalaDayStatus = 'limpio' | 'caida';

export interface Kabala {
  id: string;
  he: string; // "מ׳ יום של קדושה"
  es: string; // "40 días de kedushá"
  kavana: string; // p. ej. "לזכות למצוא במהרה את זיווגי ההגון" (texto libre)
  area: AreaId; // normalmente 'kedushah'
  targetDays: number; // 40
  // acumulativo: cuenta días limpios en total; una caída pausa, no borra.
  // racha: días seguidos; `onFall` decide si una caída la reinicia o la continúa.
  mode: 'acumulativo' | 'racha';
  onFall: 'pausa' | 'reinicia' | 'continua';
  startDayId: string; // dayId (ancla civil YYYY-MM-DD) del día 1
  startHebrewDate: string; // "24 Elul 5786" (halájica, la del dayId)
  status: 'activa' | 'completada' | 'abandonada';
  /** Marca diaria explícita: dayId -> estado. Privada, inequívoca. */
  days: Record<string, { status: KabalaDayStatus; at: string; note?: string }>;
  /** Hitos ya celebrados (7 / 18 / 30 / 40) para no repetir la brajá. */
  milestonesSeen: number[];
  createdAt: string;
  completedAt?: string | null;
  abandonedAt?: string | null;
}

/** Boleta: dónde estuvo bien / mal a detalle, un refuerzo y un musar — semanal, mensual o anual. */
export type BoletaKind = 'week' | 'month' | 'year';

export interface PeriodBoleta {
  id: string; // = `${kind}:${fromKey}`
  kind: BoletaKind;
  fromKey: string;
  toKey: string;
  label: string;
  createdAt: string;
  by: 'rules' | 'ai';
  bien: string;
  mal: string;
  refuerzo: string;
  musar: { he?: string; es: string; sourceEs?: string };
  stats: {
    entries: number;
    victories: number;
    falls: number;
    watchedFalls: number;
    torahDays: number;
    cheshbonDays: number;
    totalDays: number;
  };
  /** Solo boleta anual (se manda en Rosh Hashaná): meses fuertes/difíciles, midot
   *  predominantes y aprendizajes del año, a detalle. */
  detalle?: string;
}

export interface Settings {
  id: 'singleton';
  displayName: string;
  location: {
    label: string;
    latitude: number;
    longitude: number;
    tzid: string;
    israel: boolean;
    elevation: number;
  };
  boundaryMode: 'shkia' | 'tzeit';
  tzeitAngle: number; // grados bajo el horizonte para tzeit (def. 8.5)
  dayBoundaryOverrides: Record<string, string>; // dayId -> ISO time (corrección manual)
  // Qué FECHA HEBREA se muestra (en el calendario, el encabezado y los yahrzeits).
  //  'anochecer' — halájico: tras el tzet local ya corre la fecha del día siguiente.
  //  'medianoche' — la fecha mostrada no cambia hasta las 00:00 civiles de tu ciudad.
  //  'despertar'  — no cambia hasta tu hora de despertar (wakeHour).
  // NO afecta a Shabat / Yom Tov / festivos / tema ni al día bajo el que se guardan
  // los registros: eso siempre es halájico (anochecer).
  dateDisplayMode: 'anochecer' | 'medianoche' | 'despertar';
  wakeHour: number; // 0..23, hora local de "arranca mi jornada" (para 'despertar')
  splashAcknowledgedAt: string | null;
  themeOverride: 'auto' | 'day' | 'night';
  shabbatMode: boolean; // no forzar uso en Shabat
  // השליחות שלי — misión de vida
  mission: {
    lifeMission: string; // por defecto: לעבוד את ה׳
    vision: string;
    values: string[];
    becomingWho: string; // "¿En quién me estoy intentando convertir?"
    currentStage: string;
    spiritualGoals: string;
  };
  trackedMitzvot: string[];
  watchedFalls: string[]; // ids de src/lib/watchedFalls.ts que el usuario vigila
  primaryMiddah: string; // midá principal de la etapa
  // Exigencia del sistema. NUNCA implica llamarte fracaso ni dar psak (§60): confronta
  // la conducta y los datos, exige el regreso, mantiene el estándar alto.
  strictness: 'gentle' | 'firm' | 'demanding';
  // API para Capi (tu ChatGPT). Publica un feed de solo lectura con lo que autorizas.
  capiConnected: boolean;
  capiToken: string; // clave del feed (bearer). Vacío = desconectado.
  capiScopes: string[]; // READ_TORAH … READ_ALL
  capiLastPublishedAt: string | null;
  // Write API para Capi. Token SEPARADO del de lectura. Capi encola registros en
  // `capi_write/<capiWriteToken>/inbox`; esta app los valida y los crea como Entry real.
  capiWriteEnabled: boolean;
  capiWriteToken: string; // bearer de escritura. Vacío = escritura desconectada.
  capiWriteScopes: string[]; // WRITE_TORAH … WRITE_JOURNAL, WRITE_DAILY, WRITE_ALL
  capiWriteConnectedAt: string | null;
  // Recordatorios (3 al día). Horas locales HH:MM.
  reminders: {
    enabled: boolean;
    morning: string;
    afternoon: string;
    evening: string;
  };
  // מוסר — capa de frases. `density` gradúa dónde aparecen; `themes` sesga la
  // selección hacia lo que el usuario quiere oír; `favorites` son ids del corpus.
  musar: {
    density: 'pie' | 'clave' | 'maximo';
    themes: string[]; // MusarTheme[]: prioridad | exigencia | teshuva | zman | simja | anava
    favorites: string[];
    /** Marca de la subida única de densidad a 'maximo' (2026-09). No re-forzar tras esto. */
    densityBumpedV1?: boolean;
    /** מוסר הפרשה — trae en vivo un comentario de la API de Sefaria (Kli Yakar / Or HaChaim / Sforno / Rashi) sobre la parashá de la semana. Default true; si falla no rompe nada. */
    sefariaParashaEnabled?: boolean;
  };
  // יהודי שלם — el círculo "ser Yehudí al 100%": mezcla de cobertura del catálogo
  // de halajot + jumrot, constancia de por vida y caídas recientes (que lo encogen).
  // `items` es la línea base del cuestionario inicial (catalogId -> si|aveces|no).
  // Muy exigente, pero cada punto se explica (§60: nunca veredicto ni condena).
  yehudi: {
    onboardedAt: string | null;
    items: Record<string, 'si' | 'aveces' | 'no'>;
    kabalot: YehudiKabala[];
  };
  // Boletas (se generan solas al abrir la app): semanal al cerrar la semana hebrea,
  // mensual al cerrar el mes hebreo, anual al comenzar el año nuevo — en Rosh Hashaná,
  // con todo el año que cerró a detalle.
  boleta: {
    autoOnNewWeek: boolean;
    autoOnNewMonth: boolean;
    autoOnRoshHashana: boolean;
    lastGeneratedWeekKey: string | null;
    lastGeneratedMonthKey: string | null;
    lastGeneratedYearKey: string | null;
    boletas: PeriodBoleta[];
  };
  aiEnabled: boolean; // módulo IA opcional, off por defecto
  aiProvider: 'anthropic';
  aiModel: string; // p. ej. claude-opus-5 / claude-sonnet-5 / claude-haiku-4-5
  aiAutoClassify: boolean; // sugerir clasificación con IA al registrar
  aiAutoSummary: boolean; // usar IA para el resumen del día
  // La CLAVE de la API NO se guarda aquí (se quedaría en la exportación y en la nube).
  // Vive solo en localStorage de este dispositivo (ver src/lib/ai/config.ts).
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiToken {
  id: string;
  name: string; // "Capi"
  tokenHash: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/**
 * Traza de un intento de escritura de Capi (Write API). La clave primaria es
 * `idempotencyKey` para que un reintento de Capi no cree el registro dos veces.
 * Se incluye en la exportación/sincronización para que la idempotencia valga
 * entre dispositivos. Nunca guarda el token completo (solo un prefijo corto).
 */
export interface CapiWriteRecord {
  idempotencyKey: string;
  at: string; // ISO — cuándo lo procesó esta app
  type: string; // torah | tefillah | victory | fall | …
  entryId: string | null; // id del Entry creado (null si se rechazó)
  ok: boolean;
  code: string | null; // OK | SCOPE_DENIED | RATE_LIMITED | INVALID_PAYLOAD | …
  scopesUsed: string[];
  tokenPrefix: string; // primeros 6 chars del token, para auditoría
  timeSource: 'server' | 'client';
}

export interface AuditLog {
  id: string;
  at: string;
  actor: 'user' | 'system' | 'api';
  action: string;
  detail: Record<string, unknown>;
}

export const SCHEMA_VERSION = 4;
