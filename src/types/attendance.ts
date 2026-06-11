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

export type MyPickSlot = 'cast' | 'song' | 'event';

export type MyPickRow = { type: 'series'; id: string } | { type: 'artist'; id: string };

export type MyPickColumn =
  | { type: 'slot'; slot: MyPickSlot }
  | { type: 'year'; year: number; slot: MyPickSlot };

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
  col.type === 'slot' ? `slot:${col.slot}` : `year:${col.year}:${col.slot}`;
export const cellKey = (row: MyPickRow, col: MyPickColumn) => `${rowKey(row)}|${columnKey(col)}`;

export interface BackupData {
  version: number;
  exportedAt: string;
  attendance: Record<string, AttendanceRecord>;
  myPick?: MyPick | null;
}
