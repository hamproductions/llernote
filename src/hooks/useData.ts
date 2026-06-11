import { useMemo } from 'react';
import performanceInfo from '../../data/performance-info.json';
import eventExtra from '../../data/event-extra.json';
import setlistInfo from '../../data/performance-setlists.json';
import songInfo from '../../data/song-info.json';
import characterInfo from '../../data/character-info.json';
import artistsInfo from '../../data/artists-info.json';
import seriesInfo from '../../data/series-info.json';
import unitsInfo from '../../data/units.json';
import type { Artist, Character, Performance, Series, Setlist, Song, Unit } from '~/types';

const extraById = eventExtra as Record<string, Partial<Performance>>;

const deriveCategory = (p: Partial<Performance>): Performance['category'] => {
  if (p.tourType === 'TV出演') return 'tv';
  if (p.tourType === 'バーチャルライブ' || p.tourType === '収録配信') return 'online';
  if (p.audience === false) return 'online';
  return 'live';
};

const performances: Performance[] = (performanceInfo as Omit<Performance, 'category'>[]).map(
  (p) => {
    const merged = { ...p, ...extraById[p.id] };
    return { ...merged, category: deriveCategory(merged) };
  }
);
const setlists = setlistInfo as unknown as Record<string, Setlist>;
const songs = songInfo as unknown as Song[];
const characters = characterInfo as unknown as Character[];
const artists = artistsInfo as unknown as Artist[];
const series = seriesInfo as Series[];
const units = unitsInfo as unknown as Unit[];

const sortedPerformances = [...performances].sort((a, b) => b.date.localeCompare(a.date));
const performanceById = new Map(performances.map((p) => [p.id, p]));
const songById = new Map(songs.map((s) => [s.id, s]));
const artistById = new Map(artists.map((a) => [a.id, a]));
const seriesById = new Map(series.map((s) => [s.id, s]));

export const usePerformances = () => sortedPerformances;
export const usePerformanceById = () => performanceById;
export const usePerformance = (id: string | undefined) =>
  id !== undefined ? performanceById.get(id) : undefined;
export const useSetlists = () => setlists;
export const useSetlist = (performanceId: string | undefined) =>
  performanceId !== undefined ? setlists[performanceId] : undefined;
export const useSongs = () => songs;
export const useSongById = () => songById;
export const useCharacters = () => characters;
export const useArtists = () => artists;
export const useArtistById = () => artistById;
export const useSeries = () => series;
export const useSeriesById = () => seriesById;
export const useUnits = () => units;

export const useEventYears = () =>
  useMemo(() => {
    const years = new Set(performances.map((p) => p.date.slice(0, 4)));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, []);
