import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist } from '~/types';

export interface SongSetlistInsight {
  isDebut: boolean;
  previousPerformance?: Performance;
  daysSincePreviousPerformance?: number;
}

export interface SetlistInsights {
  previousPerformance?: Performance;
  daysSincePreviousPerformance?: number;
  addedSongIds: string[];
  removedSongIds: string[];
  songInsights: Map<string, SongSetlistInsight>;
}

const songIdsForSetlist = (setlist: Setlist | undefined) => {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of setlist?.items ?? []) {
    if (item.type !== 'song' || !item.songId || seen.has(item.songId)) continue;
    seen.add(item.songId);
    ids.push(item.songId);
  }
  return ids;
};

const daysBetween = (fromDate: string, toDate: string) => {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return undefined;
  return Math.round((to - from) / 86_400_000);
};

const datedPerformancesWithSetlists = (
  performances: Performance[],
  setlists: Record<string, Setlist>
) =>
  performances
    .filter((performance) => setlists[performance.id])
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

export const buildSetlistInsights = (
  performance: Performance,
  performances: Performance[],
  setlists: Record<string, Setlist>
): SetlistInsights => {
  const currentSetlist = setlists[performance.id];
  const currentSongIds = songIdsForSetlist(currentSetlist);
  const currentSongIdSet = new Set(currentSongIds);
  const ordered = datedPerformancesWithSetlists(performances, setlists);
  const previousPerformances = ordered.filter(
    (candidate) =>
      candidate.id !== performance.id &&
      (candidate.date < performance.date ||
        (candidate.date === performance.date && candidate.id.localeCompare(performance.id) < 0))
  );
  const previousPerformance = previousPerformances.at(-1);
  const previousSongIds = songIdsForSetlist(
    previousPerformance ? setlists[previousPerformance.id] : undefined
  );
  const previousSongIdSet = new Set(previousSongIds);
  const addedSongIds = currentSongIds.filter((songId) => !previousSongIdSet.has(songId));
  const removedSongIds = previousSongIds.filter((songId) => !currentSongIdSet.has(songId));
  const songInsights = new Map<string, SongSetlistInsight>();

  for (const songId of currentSongIds) {
    const previousSongPerformance = previousPerformances
      .filter((candidate) => songIdsForSetlist(setlists[candidate.id]).includes(songId))
      .at(-1);
    songInsights.set(songId, {
      isDebut: previousSongPerformance === undefined,
      previousPerformance: previousSongPerformance,
      daysSincePreviousPerformance: previousSongPerformance
        ? daysBetween(previousSongPerformance.date, performance.date)
        : undefined
    });
  }

  return {
    previousPerformance,
    daysSincePreviousPerformance: previousPerformance
      ? daysBetween(previousPerformance.date, performance.date)
      : undefined,
    addedSongIds,
    removedSongIds,
    songInsights
  };
};

export const getSongDebutPerformance = (
  songId: string,
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>
) =>
  [...performanceById.values()]
    .filter((performance) => songIdsForSetlist(setlists[performance.id]).includes(songId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0];

export const getSongFirstWitnessPerformance = (
  songId: string,
  records: AttendanceRecord[],
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>
) =>
  records
    .filter((record) => record.status === 'attended' && !record.deleted)
    .map((record) => performanceById.get(record.performanceId))
    .filter((performance): performance is Performance => performance !== undefined)
    .filter((performance) => songIdsForSetlist(setlists[performance.id]).includes(songId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0];
