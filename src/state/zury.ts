import { create } from 'zustand';
import type { DayRecord, Settings } from '../lib/db/schema';
import {
  getSettings as repoGetSettings,
  saveSettings as repoSaveSettings,
  getDay,
  importAll,
  upsertDay,
} from '../lib/db/repo';
import { resolveJewishDay, resolveTheme, type JewishDayInfo, type ThemeMode } from '../lib/jewishDay';

interface ZuryStore {
  ready: boolean;
  now: Date;
  settings: Settings | null;
  day: JewishDayInfo | null;
  dayRecord: DayRecord | null;
  theme: ThemeMode;
  newDayAt: number | null; // timestamp del último rollover en caliente
  _timer: number | null;

  init: () => Promise<void>;
  tick: () => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  reloadSettings: () => Promise<void>;
  reloadDayRecord: () => Promise<void>;
  applyRemoteImport: (json: string) => Promise<void>;
  dismissNewDay: () => void;
}

function dayInfoToRecord(info: JewishDayInfo): DayRecord {
  const iso = new Date().toISOString();
  return {
    id: info.dayId,
    hebrewDate: info.hebrewDate,
    hebrewDateHe: info.hebrewDateHe,
    hebrewYear: info.hebrewYear,
    civilAnchor: info.civilAnchor,
    startsAt: info.startsAt,
    endsAt: info.endsAt,
    boundaryMode: info.boundaryMode,
    isShabbat: info.isShabbat,
    isYomTov: info.isYomTov,
    isErevShabbat: info.isErevShabbat,
    holidays: info.holidays,
    moodEnd: null,
    createdAt: iso,
    updatedAt: iso,
  };
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.mode = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'night' ? '#12141f' : '#f4efe4');
}

/** Carga settings + día judío + registro del día desde la base local a la store. */
async function bootstrapLocal(set: (partial: Partial<ZuryStore>) => void) {
  const settings = await repoGetSettings();
  const now = new Date();
  const day = resolveJewishDay(now, settings);
  const existing = await getDay(day.dayId);
  const dayRecord = await upsertDay(existing ?? dayInfoToRecord(day));
  const theme = resolveTheme(now, settings);
  applyTheme(theme);
  set({ ready: true, settings, now, day, dayRecord, theme });
}

export const useZury = create<ZuryStore>((set, get) => ({
  ready: false,
  now: new Date(),
  settings: null,
  day: null,
  dayRecord: null,
  theme: 'night',
  newDayAt: null,
  _timer: null,

  dismissNewDay: () => set({ newDayAt: null }),

  init: async () => {
    await bootstrapLocal(set);
    if (get()._timer == null) {
      const t = window.setInterval(() => get().tick(), 30_000);
      set({ _timer: t });
    }
  },

  applyRemoteImport: async (json: string) => {
    await importAll(json, 'replace');
    await bootstrapLocal(set);
  },

  tick: async () => {
    const { settings, day: prevDay } = get();
    if (!settings) return;
    const now = new Date();
    const day = resolveJewishDay(now, settings);
    const theme = resolveTheme(now, settings);
    if (theme !== get().theme) applyTheme(theme);

    if (!prevDay || day.dayId !== prevDay.dayId) {
      const existing = await getDay(day.dayId);
      const dayRecord = await upsertDay(existing ?? dayInfoToRecord(day));
      // rollover en caliente (la app estaba abierta cuando cambió el día judío)
      set({ now, day, dayRecord, theme, newDayAt: prevDay ? Date.now() : get().newDayAt });
    } else {
      set({ now, theme });
    }
  },

  saveSettings: async (patch) => {
    const settings = await repoSaveSettings(patch);
    const now = new Date();
    const day = resolveJewishDay(now, settings);
    const theme = resolveTheme(now, settings);
    applyTheme(theme);
    const existing = await getDay(day.dayId);
    const dayRecord = await upsertDay(existing ?? dayInfoToRecord(day));
    set({ settings, day, dayRecord, theme, now });
  },

  reloadSettings: async () => {
    const settings = await repoGetSettings();
    set({ settings });
  },

  reloadDayRecord: async () => {
    const { day } = get();
    if (!day) return;
    const dayRecord = await getDay(day.dayId);
    if (dayRecord) set({ dayRecord });
  },
}));
