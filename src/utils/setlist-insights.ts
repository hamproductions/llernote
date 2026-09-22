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

const performanceTimeSortKey = (performance: Performance) => {
  const explicitTime = performance.startTime ?? performance.openTime;
  if (explicitTime) return explicitTime;
  const label = [performance.performanceName, performance.concertName].filter(Boolean).join(' ');
  if (/夜|evening|night/i.test(label)) return '18:00';
  if (/昼|matinee/i.test(label)) return '12:00';
  return '';
};

export const comparePerformancesChronologically = (a: Performance, b: Performance) =>
  a.date.localeCompare(b.date) ||
  performanceTimeSortKey(a).localeCompare(performanceTimeSortKey(b)) ||
  a.id.localeCompare(b.id);

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
    .sort(comparePerformancesChronologically);

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
      comparePerformancesChronologically(candidate, performance) < 0
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
    .sort(comparePerformancesChronologically)[0];

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
    .sort(comparePerformancesChronologically)[0];

export const isPerformanceAtOrBefore = (candidate: Performance, current: Performance) =>
  comparePerformancesChronologically(candidate, current) <= 0;

export interface SongWitness {
  /** How many attended performances up to and including this one played the song. */
  count: number;
  /** The earliest attended performance that played it — drives the "first witness" badge. */
  firstPerformanceId: string;
  /** Date of the most recent earlier attended performance that played it. */
  prevSeenDate?: string;
}

/**
 * Per-song witness tally as of `performance`: how many times the viewer had seen each of
 * its songs live, counting only performances they attended at or before this one.
 *
 * Distinct from `buildSongPerformanceOrdinals`, which counts every performance by anyone.
 */
export const buildWitnessBySong = (
  performance: Performance,
  records: AttendanceRecord[],
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>
): Map<string, SongWitness> => {
  const map = new Map<string, SongWitness>();

  for (const record of records) {
    if (record.status !== 'attended' || record.deleted) continue;
    const attended = performanceById.get(record.performanceId);
    const setlist = setlists[record.performanceId];
    if (!attended || !setlist) continue;
    if (!isPerformanceAtOrBefore(attended, performance)) continue;

    // A song played twice in one show still counts as one witnessing of that show.
    for (const songId of new Set(songIdsForSetlist(setlist))) {
      const previous = map.get(songId);
      if (!previous) {
        map.set(songId, { count: 1, firstPerformanceId: attended.id });
        continue;
      }
      previous.count += 1;
      const firstPerformance = performanceById.get(previous.firstPerformanceId);
      if (!firstPerformance || isPerformanceAtOrBefore(attended, firstPerformance)) {
        previous.firstPerformanceId = attended.id;
      }
      if (attended.id !== performance.id && attended.date < performance.date) {
        if (!previous.prevSeenDate || attended.date > previous.prevSeenDate) {
          previous.prevSeenDate = attended.date;
        }
      }
    }
  }

  return map;
};

/** Shape `buildWitnessBySong` output into the badge props `SetlistItemRow` expects. */
export const songWitnessInfo = (
  witnessBySong: Map<string, SongWitness> | null | undefined,
  songId: string | undefined,
  performance: Performance
) => {
  if (!witnessBySong || !songId) return undefined;
  const witness = witnessBySong.get(songId);
  return {
    count: witness?.count ?? 0,
    isFirst: witness?.firstPerformanceId === performance.id,
    daysSinceSeen: witness?.prevSeenDate
      ? daysBetween(witness.prevSeenDate, performance.date)
      : undefined
  };
};

/**
 * For every performance, how many *earlier* performances had already played each song.
 *
 * This is a global "performed N times before" figure, distinct from
 * `getSongWitnessCountAtPerformance`, which counts only performances the user attended.
 * Pass the unfiltered performance list so the count stays a property of the live itself
 * rather than of the viewer's `inPersonOnly` setting.
 *
 * Single chronological pass over every setlist item (~11.6k), so a caller can memoise
 * the result once per dataset rather than recomputing per render.
 */
export const buildSongPerformanceOrdinals = (
  performances: Performance[],
  setlists: Record<string, Setlist>
): Map<string, Map<string, number>> => {
  const ordinals = new Map<string, Map<string, number>>();
  const runningCount = new Map<string, number>();

  for (const performance of datedPerformancesWithSetlists(performances, setlists)) {
    const songIds = songIdsForSetlist(setlists[performance.id]);
    const forPerformance = new Map<string, number>();
    for (const songId of songIds) {
      forPerformance.set(songId, runningCount.get(songId) ?? 0);
    }
    // Bump only after the whole setlist is recorded, so two plays of the same song
    // within one performance both report the same "before this live" count.
    for (const songId of songIds) {
      runningCount.set(songId, (runningCount.get(songId) ?? 0) + 1);
    }
    ordinals.set(performance.id, forPerformance);
  }

  return ordinals;
};

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
