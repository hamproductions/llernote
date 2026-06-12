import { describe, expect, it } from 'vitest';
import { EMPTY_SONG_FILTERS, filterSongs, songReleaseYears } from '../song-filter';
import type { Artist, Song } from '~/types';

const artists: Artist[] = [
  { id: 'g1', name: 'Aqours', characters: ['c1', 'c2'], seriesIds: [2] },
  { id: 'u1', name: 'CYaRon!', characters: ['c1', 'c2'], seriesIds: [2] },
  { id: 's1', name: '高海千歌', characters: ['c1'], seriesIds: [2] },
  { id: 'o1', name: 'コラボ', characters: [], seriesIds: [1, 2] }
];
const artistById = new Map(artists.map((a) => [a.id, a]));

const song = (overrides: Partial<Song> & { id: string }): Song => ({
  name: `Song ${overrides.id}`,
  seriesIds: [2],
  ...overrides
});

const songs = [
  song({ id: '1', name: '青空Jumping Heart', artists: [{ id: 'g1' }], releasedOn: '2016-07-20' }),
  song({
    id: '2',
    name: '夜空はなんでも知ってるの？',
    artists: [{ id: 'u1' }],
    releasedOn: '2016-05-11'
  }),
  song({ id: '3', name: 'ソロ曲', artists: [{ id: 's1' }], releasedOn: '2018-01-01' }),
  song({ id: '4', name: 'その他', artists: [{ id: 'o1' }], seriesIds: [1, 2] }),
  song({ id: '5', name: 'スノハレ', seriesIds: [1], releasedOn: '2010-11-24' })
];

const heard = (counts: Record<string, number>) => (id: string) => counts[id] ?? 0;

describe('filterSongs', () => {
  it('returns everything with empty filters', () => {
    expect(filterSongs(songs, EMPTY_SONG_FILTERS, artistById, heard({}))).toHaveLength(5);
  });

  it('filters by series excluding multi-series songs', () => {
    const result = filterSongs(
      songs,
      { ...EMPTY_SONG_FILTERS, seriesIds: ['1'] },
      artistById,
      heard({})
    );
    expect(result.map((s) => s.id)).toEqual(['5']);
  });

  it('filters multi-series songs with their own toggle', () => {
    const result = filterSongs(
      songs,
      { ...EMPTY_SONG_FILTERS, multiSeries: true },
      artistById,
      heard({})
    );
    expect(result.map((s) => s.id)).toEqual(['4']);
  });

  it('combines multi-series toggle with series chips as involvement', () => {
    const involving = (seriesIds: string[]) =>
      filterSongs(
        songs,
        { ...EMPTY_SONG_FILTERS, multiSeries: true, seriesIds },
        artistById,
        heard({})
      ).map((s) => s.id);
    expect(involving(['1'])).toEqual(['4']);
    expect(involving(['2'])).toEqual(['4']);
    expect(involving(['3'])).toEqual([]);
  });

  it('filters by category', () => {
    const byCategory = (categories: ('group' | 'unit' | 'solo' | 'others')[]) =>
      filterSongs(songs, { ...EMPTY_SONG_FILTERS, categories }, artistById, heard({})).map(
        (s) => s.id
      );
    expect(byCategory(['group'])).toEqual(['1']);
    expect(byCategory(['unit'])).toEqual(['2']);
    expect(byCategory(['solo'])).toEqual(['3']);
    expect(byCategory(['others'])).toEqual(['4', '5']);
    expect(byCategory(['group', 'unit'])).toEqual(['1', '2']);
  });

  it('filters by release year range', () => {
    const result = filterSongs(
      songs,
      { ...EMPTY_SONG_FILTERS, yearFrom: '2016', yearTo: '2017' },
      artistById,
      heard({})
    );
    expect(result.map((s) => s.id)).toEqual(['1', '2']);
  });

  it('filters by heard status', () => {
    const counts = heard({ '1': 3 });
    expect(
      filterSongs(songs, { ...EMPTY_SONG_FILTERS, heard: 'heard' }, artistById, counts).map(
        (s) => s.id
      )
    ).toEqual(['1']);
    expect(
      filterSongs(songs, { ...EMPTY_SONG_FILTERS, heard: 'unheard' }, artistById, counts)
    ).toHaveLength(4);
  });

  it('filters by kana-folded search', () => {
    const result = filterSongs(
      songs,
      { ...EMPTY_SONG_FILTERS, search: 'すのはれ' },
      artistById,
      heard({})
    );
    expect(result.map((s) => s.id)).toEqual(['5']);
  });
});

describe('songReleaseYears', () => {
  it('returns sorted unique years', () => {
    expect(songReleaseYears(songs)).toEqual(['2010', '2016', '2018']);
  });
});
