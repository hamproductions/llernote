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
  sortedPerformances,
  venueById
} from '~/data/core';
import { loadSongData } from '~/data/songs';
import { loadSetlists } from '~/data/setlists';
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
        inPersonOnly: boolean;
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
        inPersonOnly: boolean;
      };
    }
  | {
      id: number;
      type: 'songs';
      payload: {
        records: AttendanceRecord[];
        filters: SongFilters;
        inPersonOnly: boolean;
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
        allPerformanceTally: SongTallyEntry[];
        filtered: Song[];
        heardInScope: number;
        scopeTotal: number;
        percent: number;
      };
    };

const performancesFor = (inPersonOnly: boolean) =>
  inPersonOnly ? livePerformances : sortedPerformances;
const performanceByIdFor = (inPersonOnly: boolean) =>
  inPersonOnly ? livePerformanceById : performanceById;

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
  const setlistsFor = (inPersonOnly: boolean) =>
    inPersonOnly ? setlistData.live : setlistData.all;

  if (request.type === 'events') {
    const { filters, attendanceMap, inPersonOnly } = request.payload;
    const performanceCharacters = buildPerformanceCharacterMap(
      setlistsFor(inPersonOnly),
      songById,
      artistById
    );
    const filtered = filterEvents(
      performancesFor(inPersonOnly),
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
    const { records, year, seriesId, category, multiSeries, inPersonOnly } = request.payload;
    const perfById = performanceByIdFor(inPersonOnly);
    const filteredRecords = records.filter((record) => {
      const performance = perfById.get(record.performanceId);
      return performance
        ? statsPerformanceFilter(performance, { year, seriesId, category, multiSeries })
        : false;
    });
    const filteredPerformances = performancesFor(inPersonOnly).filter((performance) =>
      statsPerformanceFilter(performance, { year, seriesId, category, multiSeries })
    );
    const response: WorkerResponse = {
      id: request.id,
      type: request.type,
      result: {
        ...computeStats(
          filteredRecords,
          perfById,
          setlistsFor(inPersonOnly),
          filteredPerformances,
          venueById
        ),
        totalSongs: songById.size
      }
    };
    self.postMessage(response);
    return;
  }

  const { records, filters, inPersonOnly } = request.payload;
  const perfById = performanceByIdFor(inPersonOnly);
  const sls = setlistsFor(inPersonOnly);
  const tally = tallySongs(records, perfById, sls);
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
