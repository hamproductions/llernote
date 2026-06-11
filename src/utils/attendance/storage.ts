import { LocalStorage } from '~/hooks/useLocalStorage';
import type {
  AttendanceRecord,
  AttendanceStatus,
  BackupData,
  MyPick,
  MyPickConfig
} from '~/types/attendance';

const BACKUP_VERSION = 1;

type Listener = () => void;

class SyncedStore<T> {
  private storage: LocalStorage<T>;
  private listeners = new Set<Listener>();
  private cache: T | null = null;
  private loaded = false;

  constructor(
    key: string,
    private empty: T
  ) {
    this.storage = new LocalStorage<T>(key);
  }

  get(): T {
    if (typeof window === 'undefined') return this.empty;
    if (!this.loaded) {
      this.cache = this.storage.value ?? this.empty;
      this.loaded = true;
    }
    return this.cache ?? this.empty;
  }

  set(value: T) {
    this.cache = value;
    this.storage.value = value;
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export type AttendanceMap = Record<string, AttendanceRecord>;

export const attendanceStore = new SyncedStore<AttendanceMap>('llernote-attendance', {});
export const myPickStore = new SyncedStore<MyPick | null>('llernote-mypick', null);

export const setAttendance = (
  performanceId: string,
  status: AttendanceStatus,
  extra: Partial<Pick<AttendanceRecord, 'watchType' | 'rating' | 'memo'>> = {}
) => {
  const map = attendanceStore.get();
  const now = new Date().toISOString();
  const prev = map[performanceId];
  attendanceStore.set({
    ...map,
    [performanceId]: {
      ...prev,
      ...extra,
      performanceId,
      status,
      deleted: false,
      createdAt: prev && !prev.deleted ? prev.createdAt : now,
      updatedAt: now
    }
  });
};

export const updateAttendance = (
  performanceId: string,
  patch: Partial<Pick<AttendanceRecord, 'status' | 'watchType' | 'rating' | 'memo'>>
) => {
  const map = attendanceStore.get();
  const prev = map[performanceId];
  if (!prev || prev.deleted) return;
  attendanceStore.set({
    ...map,
    [performanceId]: { ...prev, ...patch, updatedAt: new Date().toISOString() }
  });
};

export const removeAttendance = (performanceId: string) => {
  const map = attendanceStore.get();
  const prev = map[performanceId];
  if (!prev) return;
  attendanceStore.set({
    ...map,
    [performanceId]: { ...prev, deleted: true, updatedAt: new Date().toISOString() }
  });
};

export const getActiveRecords = (map: AttendanceMap): AttendanceRecord[] =>
  Object.values(map).filter((r) => !r.deleted);

export const setMyPick = (patch: Partial<Omit<MyPick, 'updatedAt'>>) => {
  const prev = myPickStore.get();
  myPickStore.set({
    cells: {},
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString()
  });
};

export const setMyPickConfig = (config: MyPickConfig) => {
  setMyPick({ config });
};

export const setMyPickCell = (key: string, id: string | null) => {
  const prev = myPickStore.get();
  setMyPick({ cells: { ...prev?.cells, [key]: id } });
};

export const exportBackup = (): BackupData => ({
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  attendance: attendanceStore.get(),
  myPick: myPickStore.get()
});

export const importBackup = (data: BackupData) => {
  if (typeof data !== 'object' || data === null || typeof data.attendance !== 'object') {
    throw new Error('Invalid backup data');
  }
  const current = attendanceStore.get();
  const merged: AttendanceMap = { ...current };
  for (const [id, record] of Object.entries(data.attendance)) {
    const existing = merged[id];
    if (!existing || record.updatedAt > existing.updatedAt) {
      merged[id] = record;
    }
  }
  attendanceStore.set(merged);

  const incomingPick = data.myPick;
  const currentPick = myPickStore.get();
  if (incomingPick && (!currentPick || incomingPick.updatedAt > currentPick.updatedAt)) {
    myPickStore.set(incomingPick);
  }
};
