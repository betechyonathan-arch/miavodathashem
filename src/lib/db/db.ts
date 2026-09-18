import Dexie, { type Table } from 'dexie';
import { emitDbChange } from '../sync/bus';
import { dbNameForSession } from '../auth/session';
import type {
  ApiToken,
  AuditLog,
  CapiWriteRecord,
  DayRecord,
  Entry,
  Goal,
  Kabala,
  LifeStage,
  Pattern,
  Settings,
} from './schema';

/**
 * Instancia Dexie. NO se usa directamente desde la UI: todo pasa por repo.ts.
 * Cambiar de motor (a un backend con RLS + API de Capi) solo debería tocar repo.ts.
 */
export class ZuryDB extends Dexie {
  settings!: Table<Settings, string>;
  days!: Table<DayRecord, string>;
  entries!: Table<Entry, string>;
  goals!: Table<Goal, string>;
  stages!: Table<LifeStage, string>;
  patterns!: Table<Pattern, string>;
  apiTokens!: Table<ApiToken, string>;
  auditLogs!: Table<AuditLog, string>;
  capiWrites!: Table<CapiWriteRecord, string>;
  kabalot!: Table<Kabala, string>;

  constructor() {
    super(dbNameForSession());
    this.version(1).stores({
      settings: 'id',
      days: 'id, hebrewYear, isShabbat, isYomTov',
      entries: 'id, dayId, createdAt, area, valence, *areasSecondary, *tags, deletedAt',
      goals: 'id, level, parentId, status, area',
      patterns: 'id, area, tag, lastSeen',
      apiTokens: 'id, revokedAt',
      auditLogs: 'id, at, actor',
    });
    // v2: etapas de vida (upgrade aditivo, no toca los datos existentes)
    this.version(2).stores({
      stages: 'id, isCurrent, startDate, order',
    });
    // v3: traza de escrituras de Capi (idempotencia + auditoría). Aditivo.
    this.version(3).stores({
      capiWrites: 'idempotencyKey, at, entryId',
    });
    // v4: kabalot con fecha (p. ej. 40 días de kedushá). Aditivo.
    this.version(4).stores({
      kabalot: 'id, status, startDayId',
    });

    // Cualquier escritura local marca el estado como "sucio" para sincronizar.
    for (const t of [this.settings, this.days, this.entries, this.goals, this.stages, this.patterns, this.apiTokens, this.capiWrites, this.kabalot]) {
      t.hook('creating', () => emitDbChange());
      t.hook('updating', () => emitDbChange());
      t.hook('deleting', () => emitDbChange());
    }
  }
}

export const db = new ZuryDB();
