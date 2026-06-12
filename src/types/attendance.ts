export type AttendanceStatus = 'attended' | 'interested';
export type WatchType = 'live' | 'stream' | 'delay';

export interface AttendanceRecord {
  performanceId: string;
  status: AttendanceStatus;
  watchType?: WatchType;
  rating?: number;
  memo?: string;
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MyPickYearSlot = 'event' | 'song';
export type MyPickLegacySlot = 'cast' | 'song' | 'event';
export type MyPickSlot = MyPickYearSlot | 'member';

export type MyPickRow =
  | { type: 'series'; id: string }
  | { type: 'artist'; id: string }
  | { type: 'category'; id: 'group' | 'unit' | 'solo' | 'others' };

export type MyPickColumn =
  | { type: 'member' }
  | { type: 'year'; year: number; slot: MyPickYearSlot }
  | { type: 'slot'; slot: MyPickLegacySlot };

export interface MyPickConfig {
  rows: MyPickRow[];
  columns: MyPickColumn[];
}

export interface MyPick {
  config?: MyPickConfig;
  cells: Record<string, string | null>;
  updatedAt: string;
}

export const rowKey = (row: MyPickRow) => `${row.type}:${row.id}`;
export const columnKey = (col: MyPickColumn) =>
  col.type === 'year'
    ? `year:${col.year}:${col.slot}`
    : col.type === 'slot'
      ? `slot:${col.slot}`
      : col.type;
export const cellKey = (row: MyPickRow, col: MyPickColumn) => `${rowKey(row)}|${columnKey(col)}`;

export interface BackupData {
  version: number;
  exportedAt: string;
  attendance: Record<string, AttendanceRecord>;
  myPick?: MyPick | null;
}
