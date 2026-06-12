import { buildPerformanceCharacterMap } from '~/utils/performance-cast';
import { filterEvents, foldKana, type EventFilters } from '~/utils/event-filter';
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
        search: string;
        seriesId: string;
        heardFilter: '' | 'heard' | 'unheard';
        sort: 'count' | 'release' | 'name';
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
  if (filters.seriesId && !performance.seriesIds.includes(filters.seriesId)) return false;
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

  const { records, performances, setlists, songs, search, seriesId, heardFilter, sort } =
    request.payload;
  const performanceById = new Map(performances.map((performance) => [performance.id, performance]));
  const tally = tallySongs(records, performanceById, setlists);
  const tallyById = new Map(tally.map((entry) => [entry.songId, entry]));
  const q = foldKana(search.trim());
  const filtered = songs.filter((song) => {
    if (q) {
      const haystack = foldKana(
        `${song.name} ${song.phoneticName ?? ''} ${song.englishName ?? ''}`
      );
      if (!haystack.includes(q)) return false;
    }
    if (seriesId && !song.seriesIds.map(String).includes(seriesId)) return false;
    const heard = (tallyById.get(song.id)?.count ?? 0) > 0;
    if (heardFilter === 'heard' && !heard) return false;
    if (heardFilter === 'unheard' && heard) return false;
    return true;
  });
  const count = (song: Song) => tallyById.get(song.id)?.count ?? 0;
  if (sort === 'count') {
    filtered.sort(
      (a, b) => count(b) - count(a) || (b.releasedOn ?? '').localeCompare(a.releasedOn ?? '')
    );
  } else if (sort === 'release') {
    filtered.sort((a, b) => (b.releasedOn ?? '').localeCompare(a.releasedOn ?? ''));
  } else {
    filtered.sort((a, b) =>
      (a.phoneticName ?? a.name).localeCompare(b.phoneticName ?? b.name, 'ja')
    );
  }
  const scopeSongs = seriesId
    ? songs.filter((song) => song.seriesIds.map(String).includes(seriesId))
    : songs;
  const heardInScope = scopeSongs.filter((song) => (tallyById.get(song.id)?.count ?? 0) > 0).length;
  const response: WorkerResponse = {
    id: request.id,
    type: request.type,
    result: {
      tally,
      allPerformanceTally: tallyAllSongPerformances(performanceById, setlists),
      filtered,
      heardInScope,
      scopeTotal: scopeSongs.length,
      percent: scopeSongs.length ? Math.round((heardInScope / scopeSongs.length) * 100) : 0
    }
  };
  self.postMessage(response);
};

export type { WorkerRequest, WorkerResponse };
