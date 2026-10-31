import { buildPerformanceCharacterMap } from '~/utils/performance-cast';
import { filterEvents, type EventFilters } from '~/utils/event-filter';
import { filterSongs, type SongFilters } from '~/utils/song-filter';
import { groupByTour, type TourGroup } from '~/utils/tour';
import { computeStats, type StatsSummary } from '~/utils/stats';
import { tallyAllSongPerformances, tallySongs, type SongTallyEntry } from '~/utils/song-tally';
import {
  artistById,
  livePerformanceById,
  livePerformances,
  performanceById,
  remotePerformanceById,
  remotePerformances,
  sortedPerformances,
  venueById
} from '~/data/core';
import { loadSongData } from '~/data/songs';
import { loadSetlists } from '~/data/setlists';
import { isWatched, type Scope } from '~/utils/attendance/witness';
import type { Performance, Song } from '~/types';
import type { AttendanceMap } from '~/utils/attendance/storage';
import type { AttendanceRecord } from '~/types/attendance';

type WorkerRequest =
  | {
      id: number;
      type: 'events';
      payload: {
        filters: EventFilters;
        attendanceMap: AttendanceMap;
        scope: Scope;
      };
    }
  | {
      id: number;
      type: 'stats';
      payload: {
        records: AttendanceRecord[];
        year: string;
        seriesId: string;
        category: string;
        multiSeries: boolean;
        scope: Scope;
      };
    }
  | {
      id: number;
      type: 'songs';
      payload: {
        records: AttendanceRecord[];
        filters: SongFilters;
        scope: Scope;
      };
    };

type WorkerResponse =
  | { id: number; type: 'events'; result: { filtered: Performance[]; tours: TourGroup[] } }
  | { id: number; type: 'stats'; result: StatsSummary & { totalSongs: number } }
  | {
      id: number;
      type: 'songs';
      result: {
        tally: SongTallyEntry[];
        watchedTally: SongTallyEntry[];
        allPerformanceTally: SongTallyEntry[];
        filtered: Song[];
        heardInScope: number;
        scopeTotal: number;
        percent: number;
      };
    };

const performancesForScope = (scope: Scope) =>
  scope === 'inperson'
    ? livePerformances
    : scope === 'remote'
      ? remotePerformances
      : sortedPerformances;
const performanceByIdForScope = (scope: Scope) =>
  scope === 'inperson'
    ? livePerformanceById
    : scope === 'remote'
      ? remotePerformanceById
      : performanceById;

const statsPerformanceFilter = (
  performance: Performance,
  filters: { year: string; seriesId: string; category: string; multiSeries: boolean }
) => {
  if (filters.year && !performance.date.startsWith(filters.year)) return false;
  if (filters.multiSeries || filters.seriesId) {
    const matchesMulti = filters.multiSeries && performance.seriesIds.length > 1;
    const matchesSingle =
      !!filters.seriesId &&
      performance.seriesIds.length === 1 &&
      performance.seriesIds[0] === filters.seriesId;
    if (!matchesMulti && !matchesSingle) return false;
  }
  if (filters.category && performance.category !== filters.category) return false;
  return true;
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const setlistData = await loadSetlists();
  const { songById } = await loadSongData();
  const setlistsForScope = (scope: Scope) =>
    scope === 'inperson'
      ? setlistData.live
      : scope === 'remote'
        ? setlistData.remote
        : setlistData.all;

  if (request.type === 'events') {
    const { filters, attendanceMap, scope } = request.payload;
    const performanceCharacters = buildPerformanceCharacterMap(
      setlistsForScope(scope),
      songById,
      artistById
    );
    const filtered = filterEvents(
      performancesForScope(scope),
      filters,
      attendanceMap,
      performanceCharacters
    );
    const response: WorkerResponse = {
      id: request.id,
      type: request.type,
      result: { filtered, tours: groupByTour(filtered) }
    };
    self.postMessage(response);
    return;
  }

  if (request.type === 'stats') {
    const { records, year, seriesId, category, multiSeries, scope } = request.payload;
    const perfById = performanceByIdForScope(scope);
    const filteredRecords = records.filter((record) => {
      const performance = perfById.get(record.performanceId);
      return performance
        ? statsPerformanceFilter(performance, { year, seriesId, category, multiSeries })
        : false;
    });
    const filteredPerformances = performancesForScope(scope).filter((performance) =>
      statsPerformanceFilter(performance, { year, seriesId, category, multiSeries })
    );
    const response: WorkerResponse = {
      id: request.id,
      type: request.type,
      result: {
        ...computeStats(
          filteredRecords,
          perfById,
          setlistsForScope(scope),
          filteredPerformances,
          venueById
        ),
        totalSongs: songById.size
      }
    };
    self.postMessage(response);
    return;
  }

  const { records, filters, scope } = request.payload;
  const perfById = performanceByIdForScope(scope);
  const sls = setlistsForScope(scope);
  // Personal tallies span ALL performances and split into witnessed (in-person) vs
  // watched (remote), so both counts show independent of the performed-population scope.
  const tally = tallySongs(records, performanceById, setlistData.all);
  const watchedTally = tallySongs(records, performanceById, setlistData.all, isWatched);
  const tallyById = new Map(tally.map((entry) => [entry.songId, entry]));
  const allPerformanceTally = tallyAllSongPerformances(perfById, sls);
  const performedById = new Map(allPerformanceTally.map((entry) => [entry.songId, entry]));
  const heardCount = (songId: string) => tallyById.get(songId)?.count ?? 0;
  const performedCount = (songId: string) => performedById.get(songId)?.count ?? 0;
  const allSongs = [...songById.values()];
  const filtered = filterSongs(allSongs, filters, artistById, heardCount).sort(
    (a, b) =>
      performedCount(b.id) - performedCount(a.id) ||
      (b.releasedOn ?? '').localeCompare(a.releasedOn ?? '')
  );
  const scopeSongs = filterSongs(
    allSongs,
    { ...filters, heard: undefined },
    artistById,
    heardCount
  );
  const heardInScope = scopeSongs.filter((song) => heardCount(song.id) > 0).length;
  const response: WorkerResponse = {
    id: request.id,
    type: request.type,
    result: {
      tally,
      watchedTally,
      allPerformanceTally,
      filtered,
      heardInScope,
      scopeTotal: scopeSongs.length,
      percent: scopeSongs.length ? Math.round((heardInScope / scopeSongs.length) * 100) : 0
    }
  };
  self.postMessage(response);
};

export type { WorkerRequest, WorkerResponse };
