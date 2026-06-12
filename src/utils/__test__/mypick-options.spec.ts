import { describe, expect, it } from 'vitest';
import type { Artist, Song } from '~/types';
import type { MyPickRow } from '~/types/attendance';
import {
  buildArtistBuckets,
  songMatchesMyPickRow,
  artistsForRow,
  songArtistIds,
  isGroupSong,
  isUnitSong,
  isSoloSong,
  isOtherSong,
  isGroupArtist
} from '../mypick-options';

const artists: Artist[] = [
  { id: 'group', name: "μ's", characters: ['1', '2', '3'], seriesIds: [1] },
  { id: 'unit', name: 'BiBi', characters: ['2', '6', '9'], seriesIds: [1] },
  { id: 'solo', name: 'Honoka', characters: ['1'], seriesIds: [1] },
  { id: 'other', name: 'Narrator', characters: [], seriesIds: [1] },
  { id: 'aqours', name: 'Aqours', characters: ['10', '11', '12'], seriesIds: [2] },
  {
    id: 'musical',
    name: '椿滝桜女学院高等学校スクールアイドル部',
    characters: ['49', '50', '51'],
    seriesIds: [5]
  },
  {
    id: 'ikizu',
    name: 'いきづらい部！',
    characters: ['81', '82', '83'],
    seriesIds: [8]
  },
  {
    id: 'cross',
    name: 'Aqours・虹ヶ咲学園スクールアイドル同好会・Liella!',
    characters: ['10', '30', '40'],
    seriesIds: [2, 3, 4]
  },
  {
    id: 'yohane',
    name: 'ヨハネ、ハナマル、ダイヤ、ルビィ、チカ、ヨウ、カナン、リコ、マリ',
    characters: ['10', '11', '12'],
    seriesIds: [7]
  },
  {
    id: 'null-character',
    name: '女性シンガー',
    characters: [null as unknown as string],
    seriesIds: [1]
  }
];

const artistById = new Map(artists.map((artist) => [artist.id, artist]));

const song = (id: string, artistIds: string[], seriesIds = [1]): Song => ({
  id,
  name: id,
  artists: artistIds.map((artistId) => ({ id: artistId })),
  seriesIds
});

describe('mypick options', () => {
  it('classifies artist buckets for row categories', () => {
    const buckets = buildArtistBuckets(artists);

    expect(buckets.group.map((artist) => artist.id)).toEqual([
      'group',
      'aqours',
      'musical',
      'ikizu',
      'yohane'
    ]);
    expect(buckets.unit.map((artist) => artist.id)).toEqual(['unit']);
    expect(buckets.solo.map((artist) => artist.id)).toEqual(['solo']);
    expect(buckets.others.map((artist) => artist.id)).toEqual(['other', 'cross', 'null-character']);
    expect(artistsForRow({ type: 'category', id: 'group' }, artistById, buckets)).toEqual([
      artists[0],
      artists[4],
      artists[5],
      artists[6],
      artists[8]
    ]);
    expect(artistsForRow({ type: 'category', id: 'unit' }, artistById, buckets)).toEqual([
      artists[1]
    ]);
    expect(artistsForRow({ type: 'category', id: 'solo' }, artistById, buckets)).toEqual([
      artists[2]
    ]);
  });

  it('matches any song belonging to a series for series rows', () => {
    const row: MyPickRow = { type: 'series', id: '1' };

    expect(songMatchesMyPickRow(song('group-song', ['group']), row, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('unit-song', ['unit']), row, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('solo-song', ['solo']), row, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('multi-song', ['group', 'unit']), row, artistById)).toBe(true);
    expect(
      songMatchesMyPickRow(song('cross-series-song', ['group'], [1, 2]), row, artistById)
    ).toBe(true);
    expect(songMatchesMyPickRow(song('other-song', ['other']), row, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('other-series-song', ['aqours'], [2]), row, artistById)).toBe(
      false
    );
  });

  it('matches exact unit songs only for artist rows', () => {
    const row: MyPickRow = { type: 'artist', id: 'unit' };

    expect(songMatchesMyPickRow(song('unit-song', ['unit']), row, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('group-song', ['group']), row, artistById)).toBe(false);
    expect(songMatchesMyPickRow(song('multi-song', ['group', 'unit']), row, artistById)).toBe(
      false
    );
  });

  it('keeps group, unit, solo, and others category songs separate', () => {
    const groupRow: MyPickRow = { type: 'category', id: 'group' };
    const unitRow: MyPickRow = { type: 'category', id: 'unit' };
    const soloRow: MyPickRow = { type: 'category', id: 'solo' };
    const othersRow: MyPickRow = { type: 'category', id: 'others' };

    expect(songMatchesMyPickRow(song('group-song', ['group']), groupRow, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('unit-song', ['unit']), groupRow, artistById)).toBe(false);
    expect(songMatchesMyPickRow(song('unit-song', ['unit']), unitRow, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('group-song', ['group']), unitRow, artistById)).toBe(false);
    expect(songMatchesMyPickRow(song('solo-song', ['solo']), soloRow, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('unit-song', ['unit']), soloRow, artistById)).toBe(false);
    expect(songMatchesMyPickRow(song('multi-song', ['group', 'unit']), othersRow, artistById)).toBe(
      true
    );
    expect(
      songMatchesMyPickRow(song('cross-series-song', ['cross'], [2, 3, 4]), othersRow, artistById)
    ).toBe(true);
    expect(songMatchesMyPickRow(song('no-artist-song', []), othersRow, artistById)).toBe(true);
    expect(songMatchesMyPickRow(song('other-song', ['other']), othersRow, artistById)).toBe(true);
    expect(
      songMatchesMyPickRow(song('null-character-song', ['null-character']), othersRow, artistById)
    ).toBe(true);
    expect(
      songMatchesMyPickRow(song('null-character-song', ['null-character']), soloRow, artistById)
    ).toBe(false);
    expect(songMatchesMyPickRow(song('group-song', ['group']), othersRow, artistById)).toBe(false);
  });

  it('exposes the same group, solo, and other type predicates for callers', () => {
    const groupIds = songArtistIds(song('group-song', ['group']), artistById);
    const unitIds = songArtistIds(song('unit-song', ['unit']), artistById);
    const soloIds = songArtistIds(song('solo-song', ['solo']), artistById);
    const multiIds = songArtistIds(song('multi-song', ['group', 'unit']), artistById);

    expect(isGroupSong(groupIds, artistById)).toBe(true);
    expect(isUnitSong(unitIds, artistById)).toBe(true);
    expect(isSoloSong(soloIds, artistById)).toBe(true);
    expect(isOtherSong(multiIds, artistById)).toBe(true);
  });

  it('keeps dataset group names robust against punctuation drift and newer series', () => {
    expect(isGroupArtist(artistById.get('musical'))).toBe(true);
    expect(isGroupArtist(artistById.get('ikizu'))).toBe(true);
    expect(isGroupArtist(artistById.get('yohane'))).toBe(true);
    expect(
      songMatchesMyPickRow(
        song('musical-group-song', ['musical'], [5]),
        { type: 'series', id: '5' },
        artistById
      )
    ).toBe(true);
    expect(
      songMatchesMyPickRow(
        song('ikizu-group-song', ['ikizu'], [8]),
        { type: 'series', id: '8' },
        artistById
      )
    ).toBe(true);
    expect(
      songMatchesMyPickRow(
        song('yohane-group-song', ['yohane'], [7]),
        { type: 'series', id: '7' },
        artistById
      )
    ).toBe(true);
  });
});
