import { foldKana } from '~/utils/event-filter';
import {
  isGroupSong,
  isOtherSong,
  isSoloSong,
  isUnitSong,
  songArtistIds
} from '~/utils/mypick-options';
import type { Artist, Song } from '~/types';

export type SongCategory = 'group' | 'unit' | 'solo' | 'others';

export const SONG_CATEGORIES: SongCategory[] = ['group', 'unit', 'solo', 'others'];

export interface SongFilters {
  search: string;
  seriesIds: string[];
  categories: SongCategory[];
  multiSeries: boolean;
  yearFrom?: string;
  yearTo?: string;
  heard?: 'heard' | 'unheard';
}

export const EMPTY_SONG_FILTERS: SongFilters = {
  search: '',
  seriesIds: [],
  categories: [],
  multiSeries: false
};

export const songReleaseYears = (songs: Song[]) =>
  [
    ...new Set(
      songs.map((song) => song.releasedOn?.slice(0, 4)).filter((year): year is string => !!year)
    )
  ].sort();

export const songMatchesCategory = (
  song: Song,
  category: SongCategory,
  artistById: Map<string, Artist>
) => {
  const ids = songArtistIds(song, artistById);
  if (category === 'group') return isGroupSong(ids, artistById);
  if (category === 'unit') return isUnitSong(ids, artistById);
  if (category === 'solo') return isSoloSong(ids, artistById);
  return song.seriesIds.length > 1 || isOtherSong(ids, artistById);
};

export const filterSongs = (
  songs: Song[],
  filters: SongFilters,
  artistById: Map<string, Artist>,
  heardCount: (songId: string) => number
): Song[] => {
  const q = foldKana(filters.search.trim());

  return songs.filter((song) => {
    if (q) {
      const haystack = foldKana(
        `${song.name} ${song.phoneticName ?? ''} ${song.englishName ?? ''}`
      );
      if (!haystack.includes(q)) return false;
    }
    if (
      filters.seriesIds.length > 0 &&
      !song.seriesIds.some((id) => filters.seriesIds.includes(String(id)))
    ) {
      return false;
    }
    if (filters.multiSeries && song.seriesIds.length < 2) return false;
    if (
      filters.categories.length > 0 &&
      !filters.categories.some((category) => songMatchesCategory(song, category, artistById))
    ) {
      return false;
    }
    const year = song.releasedOn?.slice(0, 4);
    if (filters.yearFrom && (!year || year < filters.yearFrom)) return false;
    if (filters.yearTo && (!year || year > filters.yearTo)) return false;
    const heard = heardCount(song.id) > 0;
    if (filters.heard === 'heard' && !heard) return false;
    if (filters.heard === 'unheard' && heard) return false;
    return true;
  });
};
