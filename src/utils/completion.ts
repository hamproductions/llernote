import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Performance, Setlist, Song } from '~/types';
import type { AttendanceRecord, WatchType } from '~/types/attendance';
import { isWatched, isWitnessed } from './attendance/witness';

export interface CompletionShare {
  v: 1;
  seriesId: string;
  includeRemote: boolean;
  date: string;
  attendance: [string, WatchType][];
}

export const encodeCompletion = (value: CompletionShare) =>
  compressToEncodedURIComponent(JSON.stringify(value));

export const decodeCompletion = (encoded: string): CompletionShare | null => {
  if (encoded.length > 30000) return null;
  try {
    const value = JSON.parse(decompressFromEncodedURIComponent(encoded));
    if (
      value?.v !== 1 ||
      typeof value.seriesId !== 'string' ||
      value.seriesId.length > 80 ||
      typeof value.includeRemote !== 'boolean' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
      !Array.isArray(value.attendance) ||
      value.attendance.length > 3000 ||
      !value.attendance.every(
        (entry: unknown) =>
          Array.isArray(entry) &&
          entry.length === 2 &&
          typeof entry[0] === 'string' &&
          entry[0].length <= 80 &&
          ['live', 'stream', 'delay'].includes(entry[1])
      )
    )
      return null;
    return value;
  } catch {
    return null;
  }
};

export const completionRecords = (share: CompletionShare): AttendanceRecord[] =>
  [...new Map(share.attendance).entries()].map(([performanceId, watchType]) => ({
    performanceId,
    watchType,
    status: 'attended',
    createdAt: '',
    updatedAt: ''
  }));

export const computeCompletion = (
  songs: Song[],
  records: AttendanceRecord[],
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>,
  seriesId: string,
  includeRemote: boolean,
  date: string
) => {
  const catalog = songs.filter(
    (song) =>
      (!seriesId || song.seriesIds.some((id) => String(id) === seriesId)) &&
      (!song.releasedOn || song.releasedOn <= date)
  );
  const catalogIds = new Set(catalog.map((song) => song.id));
  const heard = new Map<string, number>();
  const includedRecords: AttendanceRecord[] = [];
  let shows = 0;
  let missingSetlists = 0;
  let plays = 0;
  for (const record of records) {
    const performance = performanceById.get(record.performanceId);
    if (!performance || performance.canceled || performance.date > date) continue;
    if (!isWitnessed(record, performance) && !(includeRemote && isWatched(record, performance)))
      continue;
    const setlist = setlists[performance.id];
    if (!setlist || !setlist.isActual) {
      if (!seriesId || performance.seriesIds.includes(seriesId)) {
        missingSetlists += 1;
        includedRecords.push(record);
      }
      continue;
    }
    const items = setlist.items.filter(
      (item) => item.type === 'song' && item.songId && catalogIds.has(item.songId)
    );
    if (!items.length) continue;
    shows += 1;
    includedRecords.push(record);
    for (const item of items) {
      heard.set(item.songId!, (heard.get(item.songId!) ?? 0) + 1);
      plays += 1;
    }
  }
  return {
    catalog,
    heard,
    shows,
    plays,
    includedRecords,
    missingSetlists,
    percent: catalog.length ? Math.round((heard.size / catalog.length) * 1000) / 10 : 0
  };
};
