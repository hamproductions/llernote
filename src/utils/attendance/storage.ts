import { LocalStorage } from '~/hooks/useLocalStorage';
import type {
  AttendanceRecord,
  AttendanceStatus,
  BackupData,
  MyPick,
  MyPickConfig
} from '~/types/attendance';
import { columnKey, rowKey } from '~/types/attendance';

const BACKUP_VERSION = 1;

type Listener = () => void;

class SyncedStore<T> {
  private storage: LocalStorage<T>;
  private listeners = new Set<Listener>();
  private cache: T | null = null;
  private loaded = false;

  constructor(
    public key: string,
    private empty: T
  ) {
    this.storage = new LocalStorage<T>(key);
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key !== key) return;
        this.cache = this.storage.value ?? this.empty;
        this.loaded = true;
        this.notify();
      });
    }
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
  const base = prev && !prev.deleted ? prev : undefined;
  attendanceStore.set({
    ...map,
    [performanceId]: {
      ...base,
      watchType: status === 'attended' ? (base?.watchType ?? 'live') : base?.watchType,
      ...extra,
      performanceId,
      status,
      deleted: false,
      createdAt: base?.createdAt ?? now,
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
  if (typeof patch.memo === 'string') {
    patch = { ...patch, memo: patch.memo.trim() || undefined };
  }
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
    [performanceId]: {
      performanceId,
      status: prev.status,
      deleted: true,
      createdAt: prev.createdAt,
      updatedAt: new Date().toISOString()
    }
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
  const prev = myPickStore.get();
  const validKeys = new Set(
    config.rows.flatMap((row) => config.columns.map((col) => `${rowKey(row)}|${columnKey(col)}`))
  );
  const cells = Object.fromEntries(
    Object.entries(prev?.cells ?? {}).filter(([key, value]) => value != null && validKeys.has(key))
  );
  setMyPick({ config, cells });
};

export const setMyPickCell = (key: string, id: string | null) => {
  const prev = myPickStore.get();
  const cells = { ...prev?.cells };
  if (id == null) delete cells[key];
  else cells[key] = id;
  setMyPick({ cells });
};

const VALID_STATUS = new Set<AttendanceStatus>(['attended', 'interested']);

const isValidRecord = (record: unknown): record is AttendanceRecord => {
  if (typeof record !== 'object' || record === null) return false;
  const r = record as AttendanceRecord;
  return (
    typeof r.performanceId === 'string' &&
    VALID_STATUS.has(r.status) &&
    typeof r.updatedAt === 'string' &&
    typeof r.createdAt === 'string'
  );
};

export const exportBackup = (): BackupData => ({
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  attendance: attendanceStore.get(),
  myPick: myPickStore.get()
});

export const importBackup = (data: BackupData) => {
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof data.attendance !== 'object' ||
    data.attendance === null ||
    typeof data.version !== 'number' ||
    data.version > BACKUP_VERSION
  ) {
    throw new Error('Invalid backup data');
  }
  const current = attendanceStore.get();
  const merged: AttendanceMap = { ...current };
  for (const [id, record] of Object.entries(data.attendance)) {
    if (!isValidRecord(record)) continue;
    const existing = merged[id];
    if (!existing || record.updatedAt > existing.updatedAt) {
      merged[id] = record;
    }
  }
  attendanceStore.set(merged);

  const incomingPick = data.myPick;
  const currentPick = myPickStore.get();
  if (
    incomingPick &&
    typeof incomingPick === 'object' &&
    typeof incomingPick.cells === 'object' &&
    incomingPick.cells !== null
  ) {
    if (!currentPick) {
      myPickStore.set(incomingPick);
    } else {
      const newer = incomingPick.updatedAt > currentPick.updatedAt ? incomingPick : currentPick;
      const older = newer === incomingPick ? currentPick : incomingPick;
      myPickStore.set({
        ...newer,
        cells: { ...older.cells, ...newer.cells }
      });
    }
  }
};
