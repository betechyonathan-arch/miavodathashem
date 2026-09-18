import { create } from 'zustand';

export type SyncStatus =
  | 'disabled' // sin configurar → solo local
  | 'connecting'
  | 'online'
  | 'syncing'
  | 'offline'
  | 'error';

interface SyncStore {
  status: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
  set: (patch: Partial<Pick<SyncStore, 'status' | 'lastSyncAt' | 'error'>>) => void;
}

export const useSync = create<SyncStore>((set) => ({
  status: 'disabled',
  lastSyncAt: null,
  error: null,
  set: (patch) => set(patch),
}));
