import { describe, expect, it } from 'vitest';
import {
  BUILTIN_AWARDS,
  buildUnitGroups,
  createEmptyLiveState,
  getArtistKind,
  getLiveCostumes,
  getLiveSongEntries
} from '../mypick-live';
import type { Artist, Setlist, Song } from '~/types';

const artist = (id: string, name: string, characters: string[]): Artist => ({
  id,
  name,
  characters,
  seriesIds: [2]
});

const song = (id: string, name: string, artistIds: string[]): Song => ({
  id,
  name,
  seriesIds: [2],
  artists: artistIds.map((aid) => ({ id: aid }))
});

const AQOURS = artist('a-group', 'Aqours', ['c1', 'c2', 'c3']);
const GUILTY = artist('a-unit', 'Guilty Kiss', ['c1', 'c2']);
const RIKO = artist('a-solo', '桜内梨子', ['c2']);

const artistById = new Map<string, Artist>([
  [AQOURS.id, AQOURS],
  [GUILTY.id, GUILTY],
  [RIKO.id, RIKO]
]);

const S1 = song('s1', 'Aozora Jumping Heart', [AQOURS.id]);
const S2 = song('s2', 'Strawberry Trapper', [GUILTY.id]);
const S3 = song('s3', 'Aishiteru Banzai', [RIKO.id]);
const songById = new Map<string, Song>([
  [S1.id, S1],
  [S2.id, S2],
  [S3.id, S3]
]);

const setlist = (): Setlist => ({
  id: 'set-1',
  performanceId: 'p1',
  isActual: true,
  sections: [
    { name: 'Main', startIndex: 0, endIndex: 1, type: 'main' },
    { name: 'Encore', startIndex: 2, endIndex: 2, type: 'encore' }
  ],
  items: [
    { id: '1', type: 'song', position: 0, songId: 's1' },
    { id: '2', type: 'song', position: 1, songId: 's2' },
    { id: '3', type: 'song', position: 2, songId: 's3' }
  ]
});

describe('getArtistKind', () => {
  it('classifies group, unit, and solo artists', () => {
    expect(getArtistKind(AQOURS)).toBe('group');
    expect(getArtistKind(GUILTY)).toBe('unit');
    expect(getArtistKind(RIKO)).toBe('solo');
  });
});

describe('getLiveSongEntries', () => {
  it('labels main songs M.. and encore songs EN..', () => {
    const entries = getLiveSongEntries(setlist(), songById);
    expect(entries.map((e) => [e.song.id, e.label])).toEqual([
      ['s1', 'M01'],
      ['s2', 'M02'],
      ['s3', 'EN01']
    ]);
  });

  it('drops non-song items and de-duplicates repeated songs', () => {
    const withExtras: Setlist = {
      ...setlist(),
      sections: [{ name: 'Main', startIndex: 0, endIndex: 3, type: 'main' }],
      items: [
        { id: '1', type: 'song', position: 0, songId: 's1' },
        { id: '2', type: 'mc', position: 1 },
        { id: '3', type: 'song', position: 2, songId: 's2' },
        { id: '4', type: 'song', position: 3, songId: 's1' }
      ]
    };
    expect(getLiveSongEntries(withExtras, songById).map((e) => e.song.id)).toEqual(['s1', 's2']);
  });

  it('returns an empty list for a missing setlist', () => {
    expect(getLiveSongEntries(undefined, songById)).toEqual([]);
  });
});

describe('buildUnitGroups', () => {
  it('groups songs by artist ordered group -> unit -> solo', () => {
    const entries = getLiveSongEntries(setlist(), songById);
    const groups = buildUnitGroups(entries, artistById);
    expect(groups.map((g) => [g.artist.id, g.kind])).toEqual([
      ['a-group', 'group'],
      ['a-unit', 'unit'],
      ['a-solo', 'solo']
    ]);
  });
});

describe('getLiveCostumes', () => {
  it('returns an empty list when no costume data exists', () => {
    expect(getLiveCostumes('p1')).toEqual([]);
    expect(getLiveCostumes(undefined)).toEqual([]);
  });
});

describe('createEmptyLiveState / BUILTIN_AWARDS', () => {
  it('seeds an empty state for a performance', () => {
    expect(createEmptyLiveState('p1')).toEqual({
      performanceId: 'p1',
      awards: {},
      unitPicks: {},
      customAwards: []
    });
  });

  it('exposes a costume-kind best_costume award', () => {
    expect(BUILTIN_AWARDS.find((a) => a.key === 'best_costume')?.kind).toBe('costume');
  });
});
