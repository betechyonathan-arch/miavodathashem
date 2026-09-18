/*
  Motor de sincronización con Firebase Realtime Database.

  Modelo: la base local (IndexedDB) es la copia de trabajo. En la nube guardamos UN
  único nodo `/state` con { payload: <JSON completo exportado>, updatedAt, deviceId }.
  - Al arrancar: se lee `/state`. Si la nube es más nueva y viene de otro dispositivo,
    se importa (reemplazando lo local). Si lo local tiene cambios sin subir, se sube.
  - En cada cambio local (con rebote de ~2.5 s): se exporta todo y se sube.
  - Suscripción en vivo: si otro dispositivo escribe, se importa aquí.
  Resolución de conflictos: gana la última escritura por marca de tiempo (nivel de archivo
  completo). Suficiente para un único usuario con varios dispositivos.

  Si no hay configuración (`.env.local`), no se hace nada: la app es 100% local.
*/
import { db } from '../db/db';
import { exportAll } from '../db/repo';
import { SCHEMA_VERSION } from '../db/schema';
import { onDbChange } from './bus';
import { firebaseConfig, isConfigured, stateKey } from './config';
import { useSync, type SyncStatus } from '../../state/sync';

type ApplyRemote = (json: string) => Promise<void>;

const DEVICE_KEY = 'zury.deviceId';
const REMOTE_SEEN_KEY = 'zury.remoteSeenAt';
const LOCAL_REV_KEY = 'zury.localRev';
const SYNCED_REV_KEY = 'zury.syncedRev';

function ls(key: string): number {
  return Number(localStorage.getItem(key) ?? '0');
}
function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? String(Math.random())).slice(0, 12);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

let started = false;
let applyingRemote = false;
let pushTimer: number | undefined;
let applyRemoteFn: ApplyRemote = async () => {};

// Referencias a funciones/objetos de firebase (cargados de forma perezosa).
let fb: {
  set: (ref: unknown, value: unknown) => Promise<void>;
  get: (ref: unknown) => Promise<{ exists: () => boolean; val: () => RemoteState | null }>;
  onValue: (ref: unknown, cb: (snap: { val: () => RemoteState | null }) => void) => void;
  stateRef: unknown;
} | null = null;

interface RemoteState {
  payload: string;
  updatedAt: number;
  deviceId: string;
  schemaVersion?: number;
}

function setStatus(status: SyncStatus, extra?: { lastSyncAt?: number; error?: string | null }) {
  useSync.getState().set({ status, ...(extra ?? {}) });
}

export function markLocalChange(): void {
  if (applyingRemote) return;
  localStorage.setItem(LOCAL_REV_KEY, String(Date.now()));
  schedulePush();
}

function schedulePush(): void {
  if (!started || !fb) return;
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => void push(), 2500);
}

async function push(): Promise<void> {
  if (!fb) return;
  try {
    setStatus('syncing');
    const json = await (await exportAll()).text();
    const updatedAt = Date.now();
    await fb.set(fb.stateRef, {
      payload: json,
      updatedAt,
      deviceId: deviceId(),
      schemaVersion: SCHEMA_VERSION,
    });
    localStorage.setItem(REMOTE_SEEN_KEY, String(updatedAt));
    localStorage.setItem(SYNCED_REV_KEY, localStorage.getItem(LOCAL_REV_KEY) ?? '0');
    setStatus('online', { lastSyncAt: updatedAt, error: null });
  } catch (e) {
    setStatus('error', { error: (e as Error).message });
  }
}

async function applyRemote(remote: RemoteState): Promise<void> {
  applyingRemote = true;
  try {
    await applyRemoteFn(remote.payload);
    localStorage.setItem(REMOTE_SEEN_KEY, String(remote.updatedAt));
    localStorage.setItem(SYNCED_REV_KEY, localStorage.getItem(LOCAL_REV_KEY) ?? '0');
    setStatus('online', { lastSyncAt: remote.updatedAt, error: null });
  } finally {
    applyingRemote = false;
  }
}

export async function startCloudSync(apply: ApplyRemote): Promise<void> {
  applyRemoteFn = apply;
  if (!isConfigured) {
    setStatus('disabled');
    return;
  }
  if (started) return;
  started = true;
  setStatus('connecting');

  try {
    const [{ initializeApp }, dbMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/database'),
    ]);
    const app = initializeApp(firebaseConfig);
    const database = dbMod.getDatabase(app);
    const stateRef = dbMod.ref(database, `state/${stateKey}`);
    fb = {
      set: dbMod.set as never,
      get: dbMod.get as never,
      onValue: dbMod.onValue as never,
      stateRef,
    };

    // --- Reconciliación inicial ---
    const snap = await fb.get(fb.stateRef);
    const remote = snap.exists() ? snap.val() : null;
    const localRev = ls(LOCAL_REV_KEY);
    const syncedRev = ls(SYNCED_REV_KEY);
    const remoteSeen = ls(REMOTE_SEEN_KEY);

    // Si nunca se ha sincronizado en este dispositivo pero YA hay datos locales
    // (se usó la app antes de conectar la nube), esos datos cuentan como "sin subir"
    // para no perderlos frente a un nodo remoto vacío o antiguo.
    const localCount = (await db.entries.count()) + (await db.days.count());
    const neverSynced = syncedRev === 0 && remoteSeen === 0;
    const hasLocalUnsynced = localRev > syncedRev || (neverSynced && localCount > 1);
    const effectiveLocalRev = hasLocalUnsynced && localRev === 0 ? Date.now() : localRev;

    const remoteHasRealData = (() => {
      try {
        const p = JSON.parse(remote?.payload ?? 'null');
        return !!p && Array.isArray(p?.data?.entries) && (p.data.entries.length > 0 || (p.data.days?.length ?? 0) > 0);
      } catch {
        return false;
      }
    })();

    if (!remote || !remote.payload) {
      await push(); // primera vez: sembrar la nube con lo local
    } else if (remote.deviceId !== deviceId() && remote.updatedAt > remoteSeen) {
      if (hasLocalUnsynced && (effectiveLocalRev > remote.updatedAt || !remoteHasRealData)) {
        await push(); // lo local es más reciente o el remoto está vacío
      } else {
        await applyRemote(remote);
      }
    } else if (hasLocalUnsynced) {
      await push();
    } else {
      setStatus('online', { lastSyncAt: remote.updatedAt, error: null });
    }

    // --- Suscripción en vivo (otros dispositivos) ---
    fb.onValue(fb.stateRef, (s) => {
      const r = s.val();
      if (!r || !r.payload || applyingRemote) return;
      if (r.deviceId === deviceId()) return;
      if (r.updatedAt <= ls(REMOTE_SEEN_KEY)) return;
      void applyRemote(r);
    });

    onDbChange(markLocalChange);
    window.addEventListener('online', () => schedulePush());
    window.addEventListener('offline', () => setStatus('offline'));
  } catch (e) {
    started = false;
    setStatus('error', { error: (e as Error).message });
  }
}

export async function syncNow(): Promise<void> {
  if (!isConfigured) return;
  await push();
}
