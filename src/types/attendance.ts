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

export interface MyPick {
  eventIds: string[];
  artistIds: string[];
  songIds: string[];
  year?: number | null;
  updatedAt: string;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  attendance: Record<string, AttendanceRecord>;
  myPick?: MyPick | null;
}
