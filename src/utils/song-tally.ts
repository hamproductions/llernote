import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist } from '~/types';
import { isWitnessed } from './attendance/witness';

export interface SongTallyEntry {
  songId: string;
  count: number;
  performances: Performance[];
}

export const tallySongs = (
  records: AttendanceRecord[],
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>,
  keep: (record: AttendanceRecord, performance: Performance) => boolean = isWitnessed
): SongTallyEntry[] => {
  const tally = new Map<string, { count: number; performances: Map<string, Performance> }>();

  for (const record of records) {
    const performance = performanceById.get(record.performanceId);
    const setlist = setlists[record.performanceId];
    if (!performance || !setlist) continue;
    if (!keep(record, performance)) continue;

    for (const item of setlist.items) {
      if (item.type !== 'song' || !item.songId) continue;
      const entry = tally.get(item.songId) ?? { count: 0, performances: new Map() };
      entry.count += 1;
      entry.performances.set(performance.id, performance);
      tally.set(item.songId, entry);
    }
  }

  return [...tally.entries()]
    .map(([songId, { count, performances }]) => ({
      songId,
      count,
      performances: [...performances.values()].sort((a, b) => a.date.localeCompare(b.date))
    }))
    .sort((a, b) => b.count - a.count);
};

export const tallyAllSongPerformances = (
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>
): SongTallyEntry[] => {
  const tally = new Map<string, { count: number; performances: Map<string, Performance> }>();

  for (const setlist of Object.values(setlists)) {
    const performance = performanceById.get(setlist.performanceId);
    if (!performance) continue;

    for (const item of setlist.items) {
      if (item.type !== 'song' || !item.songId) continue;
      const entry = tally.get(item.songId) ?? { count: 0, performances: new Map() };
      entry.count += 1;
      entry.performances.set(performance.id, performance);
      tally.set(item.songId, entry);
    }
  }

  return [...tally.entries()]
    .map(([songId, { count, performances }]) => ({
      songId,
      count,
      performances: [...performances.values()].sort((a, b) => b.date.localeCompare(a.date))
    }))
    .sort((a, b) => b.count - a.count);
};
