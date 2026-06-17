import { describe, expect, it } from 'vitest';
import {
  BUILTIN_AWARDS,
  buildUnitGroups,
  createEmptyLiveState,
  getArtistKind,
  getLiveCostumes,
  getLiveSongEntries,
  getLiveSongEntriesForPerformances,
  liveHeader,
  statePerformanceIds
} from '../mypick-live';
import type { Performance } from '~/types';
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

describe('getLiveSongEntriesForPerformances', () => {
  const day1: Setlist = {
    ...setlist(),
    sections: [{ name: 'Main', startIndex: 0, endIndex: 1, type: 'main' }],
    items: [
      { id: '1', type: 'song', position: 0, songId: 's1' },
      { id: '2', type: 'song', position: 1, songId: 's2' }
    ]
  };
  const day2: Setlist = {
    ...setlist(),
    sections: [{ name: 'Main', startIndex: 0, endIndex: 1, type: 'main' }],
    items: [
      { id: '1', type: 'song', position: 0, songId: 's2' },
      { id: '2', type: 'song', position: 1, songId: 's3' }
    ]
  };
  const setlists = { p1: day1, p2: day2 };

  it('merges and de-duplicates songs across performances in order', () => {
    const entries = getLiveSongEntriesForPerformances(['p1', 'p2'], setlists, songById);
    expect(entries.map((e) => e.song.id)).toEqual(['s1', 's2', 's3']);
  });

  it('ignores unknown performance ids', () => {
    const entries = getLiveSongEntriesForPerformances(['p1', 'nope'], setlists, songById);
    expect(entries.map((e) => e.song.id)).toEqual(['s1', 's2']);
  });
});

describe('getLiveCostumes', () => {
  it('returns an empty list when no costume data exists', () => {
    expect(getLiveCostumes('p1')).toEqual([]);
    expect(getLiveCostumes(undefined)).toEqual([]);
  });
});

describe('statePerformanceIds', () => {
  it('reads the array shape and migrates the legacy single id', () => {
    expect(statePerformanceIds({ performanceIds: ['1', '2'] })).toEqual(['1', '2']);
    expect(statePerformanceIds({ performanceId: '7' })).toEqual(['7']);
    expect(statePerformanceIds(null)).toEqual([]);
  });
});

describe('liveHeader', () => {
  const perf = (id: string, date: string, tourName: string, venue: string): Performance =>
    ({
      id,
      tourName,
      date,
      venue,
      seriesIds: ['2'],
      status: 'completed',
      hasSetlist: true,
      category: 'live'
    }) as Performance;

  it('shows a single performance name, date and venue', () => {
    const h = liveHeader([perf('1', '2025-01-02', 'Tour A', 'Hall')]);
    expect(h).toEqual({ name: 'Tour A', dateLabel: '2025-01-02', venue: 'Hall' });
  });

  it('shows the shared tour name and date range for multiple performances', () => {
    const h = liveHeader([
      perf('2', '2025-01-03', 'Tour A', 'Hall'),
      perf('1', '2025-01-02', 'Tour A', 'Hall')
    ]);
    expect(h).toEqual({ name: 'Tour A', dateLabel: '2025-01-02 – 2025-01-03', venue: 'Hall' });
  });
});

describe('createEmptyLiveState / BUILTIN_AWARDS', () => {
  it('seeds an empty state for the chosen performances', () => {
    expect(createEmptyLiveState(['p1', 'p2'])).toEqual({
      performanceIds: ['p1', 'p2'],
      awards: {},
      unitPicks: {},
      customAwards: []
    });
  });

  it('exposes a costume-kind best_costume award', () => {
    expect(BUILTIN_AWARDS.find((a) => a.key === 'best_costume')?.kind).toBe('costume');
  });
});
