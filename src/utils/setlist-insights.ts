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

export interface SetlistDiff {
  sharedSongIds: string[];
  addedSongIds: string[];
  removedSongIds: string[];
  rows: SetlistDiffRow[];
}

export interface SetlistDiffRow {
  type: 'same' | 'added' | 'removed';
  songId: string;
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

export const compareSetlists = (
  fromSetlist: Setlist | undefined,
  toSetlist: Setlist | undefined
): SetlistDiff => {
  const fromSongIds = songIdsForSetlist(fromSetlist);
  const toSongIds = songIdsForSetlist(toSetlist);
  const fromSongIdSet = new Set(fromSongIds);
  const toSongIdSet = new Set(toSongIds);
  const dp = Array.from({ length: fromSongIds.length + 1 }, () =>
    Array<number>(toSongIds.length + 1).fill(0)
  );

  for (let fromIndex = fromSongIds.length - 1; fromIndex >= 0; fromIndex -= 1) {
    for (let toIndex = toSongIds.length - 1; toIndex >= 0; toIndex -= 1) {
      dp[fromIndex]![toIndex] =
        fromSongIds[fromIndex] === toSongIds[toIndex]
          ? dp[fromIndex + 1]![toIndex + 1]! + 1
          : Math.max(dp[fromIndex + 1]![toIndex]!, dp[fromIndex]![toIndex + 1]!);
    }
  }

  const rows: SetlistDiffRow[] = [];
  let fromIndex = 0;
  let toIndex = 0;
  while (fromIndex < fromSongIds.length && toIndex < toSongIds.length) {
    if (fromSongIds[fromIndex] === toSongIds[toIndex]) {
      rows.push({ type: 'same', songId: fromSongIds[fromIndex]! });
      fromIndex += 1;
      toIndex += 1;
    } else if (dp[fromIndex + 1]![toIndex]! >= dp[fromIndex]![toIndex + 1]!) {
      rows.push({ type: 'removed', songId: fromSongIds[fromIndex]! });
      fromIndex += 1;
    } else {
      rows.push({ type: 'added', songId: toSongIds[toIndex]! });
      toIndex += 1;
    }
  }
  while (fromIndex < fromSongIds.length) {
    rows.push({ type: 'removed', songId: fromSongIds[fromIndex]! });
    fromIndex += 1;
  }
  while (toIndex < toSongIds.length) {
    rows.push({ type: 'added', songId: toSongIds[toIndex]! });
    toIndex += 1;
  }

  return {
    sharedSongIds: toSongIds.filter((songId) => fromSongIdSet.has(songId)),
    addedSongIds: toSongIds.filter((songId) => !fromSongIdSet.has(songId)),
    removedSongIds: fromSongIds.filter((songId) => !toSongIdSet.has(songId)),
    rows
  };
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
  const ordered = datedPerformancesWithSetlists(performances, setlists);
  const previousPerformances = ordered.filter(
    (candidate) =>
      candidate.id !== performance.id &&
      (candidate.date < performance.date ||
        (candidate.date === performance.date && candidate.id.localeCompare(performance.id) < 0))
  );
  const previousPerformance = previousPerformances.at(-1);
  const diff = compareSetlists(
    previousPerformance ? setlists[previousPerformance.id] : undefined,
    currentSetlist
  );
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
    addedSongIds: diff.addedSongIds,
    removedSongIds: diff.removedSongIds,
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

export const isPerformanceAtOrBefore = (candidate: Performance, current: Performance) =>
  candidate.date < current.date || (candidate.date === current.date && candidate.id <= current.id);

export const getSongWitnessCountAtPerformance = (
  songId: string,
  performance: Performance,
  records: AttendanceRecord[],
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>
) =>
  records
    .filter((record) => record.status === 'attended' && !record.deleted)
    .map((record) => performanceById.get(record.performanceId))
    .filter((candidate): candidate is Performance => candidate !== undefined)
    .filter((candidate) => isPerformanceAtOrBefore(candidate, performance))
    .reduce(
      (count, candidate) =>
        count + songIdsForSetlist(setlists[candidate.id]).filter((id) => id === songId).length,
      0
    );
