import { buildPerformanceCharacterMap } from '~/utils/performance-cast';
import { filterEvents, type EventFilters } from '~/utils/event-filter';
import { filterSongs, type SongFilters } from '~/utils/song-filter';
import { groupByTour, type TourGroup } from '~/utils/tour';
import { computeStats, type StatsSummary } from '~/utils/stats';
import { tallyAllSongPerformances, tallySongs, type SongTallyEntry } from '~/utils/song-tally';
import type { Artist, EventCategory, Performance, Setlist, Song, VenueInfo } from '~/types';
import type { AttendanceMap } from '~/utils/attendance/storage';
import type { AttendanceRecord } from '~/types/attendance';

type WorkerRequest =
  | {
      id: number;
      type: 'events';
      payload: {
        performances: Performance[];
        filters: EventFilters;
        attendanceMap: AttendanceMap;
        setlists: Record<string, Setlist>;
        songs: Song[];
        artists: Artist[];
      };
    }
  | {
      id: number;
      type: 'stats';
      payload: {
        records: AttendanceRecord[];
        performances: Performance[];
        setlists: Record<string, Setlist>;
        year: string;
        seriesId: string;
        category: string;
        multiSeries: boolean;
        venueById: Map<string, VenueInfo>;
      };
    }
  | {
      id: number;
      type: 'songs';
      payload: {
        records: AttendanceRecord[];
        performances: Performance[];
        setlists: Record<string, Setlist>;
        songs: Song[];
        artists: Artist[];
        filters: SongFilters;
      };
    };

type WorkerResponse =
  | { id: number; type: 'events'; result: { filtered: Performance[]; tours: TourGroup[] } }
  | { id: number; type: 'stats'; result: StatsSummary }
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

const statsPerformanceFilter = (
  performance: Performance,
  filters: { year: string; seriesId: string; category: string; multiSeries: boolean }
) => {
  if (filters.year && !performance.date.startsWith(filters.year)) return false;
  if (
    filters.seriesId &&
    (performance.seriesIds.length > 1 || !performance.seriesIds.includes(filters.seriesId))
  ) {
    return false;
  }
  if (filters.multiSeries && performance.seriesIds.length < 2) return false;
  if (filters.category && performance.category !== (filters.category as EventCategory))
    return false;
  return true;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === 'events') {
    const { performances, filters, attendanceMap, setlists, songs, artists } = request.payload;
    const songById = new Map(songs.map((song) => [song.id, song]));
    const artistById = new Map(artists.map((artist) => [artist.id, artist]));
    const performanceCharacters = buildPerformanceCharacterMap(setlists, songById, artistById);
    const filtered = filterEvents(performances, filters, attendanceMap, performanceCharacters);
    const response: WorkerResponse = {
      id: request.id,
      type: request.type,
      result: { filtered, tours: groupByTour(filtered) }
    };
    self.postMessage(response);
    return;
  }

  if (request.type === 'stats') {
    const { records, performances, setlists, year, seriesId, category, multiSeries, venueById } =
      request.payload;
    const performanceById = new Map(
      performances.map((performance) => [performance.id, performance])
    );
    const filteredRecords = records.filter((record) => {
      const performance = performanceById.get(record.performanceId);
      return performance
        ? statsPerformanceFilter(performance, { year, seriesId, category, multiSeries })
        : false;
    });
    const filteredPerformances = performances.filter((performance) =>
      statsPerformanceFilter(performance, { year, seriesId, category, multiSeries })
    );
    const response: WorkerResponse = {
      id: request.id,
      type: request.type,
      result: computeStats(
        filteredRecords,
        performanceById,
        setlists,
        filteredPerformances,
        venueById
      )
    };
    self.postMessage(response);
    return;
  }

  const { records, performances, setlists, songs, artists, filters } = request.payload;
  const performanceById = new Map(performances.map((performance) => [performance.id, performance]));
  const artistById = new Map(artists.map((artist) => [artist.id, artist]));
  const tally = tallySongs(records, performanceById, setlists);
  const tallyById = new Map(tally.map((entry) => [entry.songId, entry]));
  const allPerformanceTally = tallyAllSongPerformances(performanceById, setlists);
  const performedById = new Map(allPerformanceTally.map((entry) => [entry.songId, entry]));
  const heardCount = (songId: string) => tallyById.get(songId)?.count ?? 0;
  const performedCount = (songId: string) => performedById.get(songId)?.count ?? 0;
  const filtered = filterSongs(songs, filters, artistById, heardCount).sort(
    (a, b) =>
      performedCount(b.id) - performedCount(a.id) ||
      (b.releasedOn ?? '').localeCompare(a.releasedOn ?? '')
  );
  const scopeSongs = filterSongs(songs, { ...filters, heard: undefined }, artistById, heardCount);
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
