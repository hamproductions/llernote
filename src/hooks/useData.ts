import { useMemo } from 'react';
import { useAppSettings } from './useAppSettings';
import performanceInfo from '../../data/performance-info.json';
import eventExtra from '../../data/event-extra.json';
import setlistInfo from '../../data/performance-setlists.json';
import songInfo from '../../data/song-info.json';
import characterInfo from '../../data/character-info.json';
import artistsInfo from '../../data/artists-info.json';
import seriesInfo from '../../data/series-info.json';
import unitsInfo from '../../data/units.json';
import venueInfo from '../../data/venue-info.json';
import eventernoteMap from '../../data/eventernote-map.json';
import liveThumbInfo from '../../data/live-thumb-info.json';
import type {
  Artist,
  Character,
  LiveThumb,
  Performance,
  Series,
  Setlist,
  Song,
  Unit,
  VenueInfo
} from '~/types';

const extraById = eventExtra as Record<string, Partial<Performance>>;

const deriveCategory = (p: Partial<Performance>): Performance['category'] => {
  if (p.tourType === 'TV出演') return 'tv';
  if (p.tourType === 'バーチャルライブ' || p.tourType === '収録配信') return 'online';
  if (p.audience === false) return 'online';
  return 'live';
};

const tourTypeByName = new Map<string, string>();
for (const p of performanceInfo as Omit<Performance, 'category'>[]) {
  const extra = extraById[p.id];
  if (extra?.tourType && !tourTypeByName.has(p.tourName)) {
    tourTypeByName.set(p.tourName, extra.tourType);
  }
}

const performances: Performance[] = (performanceInfo as Omit<Performance, 'category'>[]).map(
  (p) => {
    const merged = { ...p, ...extraById[p.id] };
    if (!merged.tourType && tourTypeByName.has(p.tourName)) {
      merged.tourType = tourTypeByName.get(p.tourName);
      if (merged.audience === undefined) merged.audience = true;
    }
    return { ...merged, category: deriveCategory(merged) };
  }
);
const setlists = setlistInfo as unknown as Record<string, Setlist>;
const songs = songInfo as unknown as Song[];
const characters = characterInfo as unknown as Character[];
const artists = artistsInfo as unknown as Artist[];
const series = seriesInfo as Series[];
const units = unitsInfo as unknown as Unit[];
const venues = venueInfo as VenueInfo[];

const sortedPerformances = [...performances].sort((a, b) => b.date.localeCompare(a.date));
const performanceById = new Map(performances.map((p) => [p.id, p]));
const livePerformances = sortedPerformances.filter((p) => p.category === 'live');
const livePerformanceById = new Map(livePerformances.map((p) => [p.id, p]));
const liveSetlists = Object.fromEntries(
  Object.entries(setlistInfo as unknown as Record<string, Setlist>).filter(([id]) =>
    livePerformanceById.has(id)
  )
);
const songById = new Map(songs.map((s) => [s.id, s]));
const artistById = new Map(artists.map((a) => [a.id, a]));
const seriesById = new Map(series.map((s) => [s.id, s]));
const venueById = new Map(venues.map((v) => [v.id, v]));
const liveThumbs = Object.entries(liveThumbInfo as Record<string, LiveThumb>);
const liveThumbByPerformanceId = new Map(liveThumbs.filter(([key]) => !key.startsWith('tour:')));
const liveThumbByTourName = new Map(
  liveThumbs
    .filter(([key]) => key.startsWith('tour:'))
    .map(([key, thumb]) => [key.slice('tour:'.length), thumb])
);
const eventernoteIdByPerformanceId = new Map(
  Object.entries(eventernoteMap as Record<string, string>)
);
const performanceByEventernoteId = new Map(
  [...eventernoteIdByPerformanceId]
    .map(([performanceId, eventernoteId]) => [eventernoteId, performanceById.get(performanceId)])
    .filter((entry): entry is [string, Performance] => entry[1] !== undefined)
);

export const usePerformances = () =>
  useAppSettings().inPersonOnly ? livePerformances : sortedPerformances;
export const usePerformanceById = () =>
  useAppSettings().inPersonOnly ? livePerformanceById : performanceById;
export const usePerformance = (id: string | undefined) => {
  const byId = usePerformanceById();
  return id !== undefined ? byId.get(id) : undefined;
};
export const useSetlists = () => (useAppSettings().inPersonOnly ? liveSetlists : setlists);
export const useSetlist = (performanceId: string | undefined) => {
  const all = useSetlists();
  return performanceId !== undefined ? all[performanceId] : undefined;
};
export const useSongs = () => songs;
export const useSongById = () => songById;
export const useCharacters = () => characters;
export const useArtists = () => artists;
export const useArtistById = () => artistById;
export const useSeries = () => series;
export const useSeriesById = () => seriesById;
export const useUnits = () => units;
export const getLiveThumb = (performance: Performance | undefined, tourOnly = false) =>
  performance
    ? ((tourOnly ? undefined : liveThumbByPerformanceId.get(performance.id)) ??
      liveThumbByTourName.get(performance.tourName))
    : undefined;
export const useLiveThumb = (performance: Performance | undefined, tourOnly = false) =>
  getLiveThumb(performance, tourOnly);
export const useVenues = () => venues;
export const useVenueById = () => venueById;
export const useEventernoteIdByPerformanceId = () => eventernoteIdByPerformanceId;
export const usePerformanceByEventernoteId = () => performanceByEventernoteId;

export const useEventYears = () => {
  const visible = usePerformances();
  return useMemo(() => {
    const years = new Set(visible.map((p) => p.date.slice(0, 4)));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [visible]);
};
