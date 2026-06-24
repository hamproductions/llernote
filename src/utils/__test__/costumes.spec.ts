import { describe, expect, it } from 'vitest';
import {
  buildCostumeSummaries,
  costumeMatchesCategory,
  type PerformanceCostumes
} from '../costumes';
import type { Artist, Performance, Song } from '~/types';

const perf = (id: string, overrides: Partial<Performance> = {}): Performance => ({
  id,
  tourName: overrides.tourName ?? `Tour ${id}`,
  date: overrides.date ?? '2024-01-01',
  venue: overrides.venue ?? `Venue ${id}`,
  seriesIds: overrides.seriesIds ?? ['s1'],
  status: 'completed',
  hasSetlist: false,
  category: 'live',
  ...overrides
});

const performances = [
  perf('p1', { tourName: 'A', date: '2024-01-10', venue: 'V1', seriesIds: ['s1'] }),
  perf('p2', { tourName: 'A', date: '2024-01-11', venue: 'V1', seriesIds: ['s1'] }),
  perf('p3', { tourName: 'B', date: '2025-06-02', venue: 'V2', seriesIds: ['s1', 's2'] })
];
const performanceById = new Map(performances.map((p) => [p.id, p]));

const costumeMap: PerformanceCostumes = {
  p1: [{ id: 'c1', name: 'Snow halation', songId: 'song-snow', songName: 'Snow halation' }],
  p2: [
    { id: 'c1', name: 'Snow halation', songId: 'song-snow', songName: 'Snow halation' },
    { id: 'c1', name: 'Snow halation', songId: 'song-other', songName: 'Other' }
  ],
  p3: [{ id: 'c1', name: 'Snow halation', songId: 'song-other', songName: 'Other' }],
  // A performance that isn't in performanceById should be ignored (e.g. filtered out).
  pX: [{ id: 'c1', name: 'Snow halation', songId: 'song-snow' }]
};

const artists: Artist[] = [
  { id: 'g1', name: "μ's", characters: ['c1', 'c2'], seriesIds: [1] },
  { id: 's1', name: '高坂穂乃果', characters: ['c1'], seriesIds: [1] }
];
const artistById = new Map(artists.map((artist) => [artist.id, artist]));

describe('buildCostumeSummaries', () => {
  it('rolls costume rows up per costume with cross-live stats', () => {
    const summaries = buildCostumeSummaries(costumeMap, performanceById, new Set(['p1']));
    expect(summaries).toHaveLength(1);
    const c = summaries[0]!;

    expect(c.id).toBe('c1');
    expect(c.liveCount).toBe(3); // p1, p2, p3 (pX excluded — not in performanceById)
    expect(c.eventCount).toBe(2); // tours A and B
    expect(c.songAppearances).toBe(4); // one row each in p1/p3 + two in p2
    expect(c.uniqueSongCount).toBe(2); // song-snow + song-other
    expect(c.attendedCount).toBe(1); // only p1 attended
    expect(c.firstDate).toBe('2024-01-10');
    expect(c.lastDate).toBe('2025-06-02');
    expect(c.yearCount).toBe(2);
    expect(c.venueCount).toBe(2); // V1, V2
    expect(c.seriesIds.sort()).toEqual(['s1', 's2']);
    expect(c.performanceIds).toEqual(['p1', 'p2', 'p3']); // oldest first
  });

  it('picks the signature song by rate, excluding single-event songs and volume bias', () => {
    // song-snow worn 3× (of 4 performances = 75%, across 2 events),
    // song-other worn 2× (of 2 = 100%, across 2 events),
    // song-once worn 1× (of 1 = 100%, but at a SINGLE event → excluded by the floor,
    //   like ペレニアル which only ran at one event despite multiple shows).
    const map: PerformanceCostumes = {
      p1: [
        { id: 'c', name: 'C', songId: 'song-snow' },
        { id: 'c', name: 'C', songId: 'song-once' }
      ],
      p2: [
        { id: 'c', name: 'C', songId: 'song-snow' },
        { id: 'c', name: 'C', songId: 'song-other' }
      ],
      p3: [
        { id: 'c', name: 'C', songId: 'song-snow' },
        { id: 'c', name: 'C', songId: 'song-other' }
      ]
    };
    const stats = new Map([
      ['song-snow', { performances: 4, events: 2 }],
      ['song-other', { performances: 2, events: 2 }],
      ['song-once', { performances: 1, events: 1 }]
    ]);
    const c = buildCostumeSummaries(map, performanceById, new Set(), new Set(), stats)[0]!;

    // song-snow is worn most by raw count (volume), but...
    expect(c.topSongId).toBe('song-snow');
    // ...song-other has the strongest rate (100%); song-once (also 100%) is excluded
    // because it only appeared at one event.
    expect(c.topSongByRateId).toBe('song-other');
    expect(c.songs.find((s) => s.songId === 'song-other')?.rate).toBe(1);
  });

  it('excludes a song confined to one event even across multiple shows (ペレニアル case)', () => {
    const map: PerformanceCostumes = {
      p1: [{ id: 'c', name: 'C', songId: 'multi-show-one-event' }],
      p2: [{ id: 'c', name: 'C', songId: 'multi-show-one-event' }]
    };
    // Performed at 2 shows but only 1 event — must NOT qualify as a signature song.
    const stats = new Map([['multi-show-one-event', { performances: 2, events: 1 }]]);
    const c = buildCostumeSummaries(map, performanceById, new Set(), new Set(), stats)[0]!;
    expect(c.topSongByRateId).toBeUndefined();
  });

  it('leaves the signature song unset when no song stats are provided', () => {
    const c = buildCostumeSummaries(costumeMap, performanceById)[0]!;
    expect(c.topSongByRateId).toBeUndefined();
  });

  it('derives series from the songs worn, not the multi-series performances', () => {
    // p3 is a two-series bill (s1 + s2), but both songs belong to series 6, so the
    // costume must read as series 6 only (the AWOKE-at-a-fes case).
    const song = (id: string, seriesIds: number[]): Song => ({ id, name: id, seriesIds });
    const songById = new Map([
      ['song-snow', song('song-snow', [6])],
      ['song-other', song('song-other', [6])]
    ]);
    const c = buildCostumeSummaries(
      costumeMap,
      performanceById,
      new Set(),
      new Set(),
      undefined,
      songById
    )[0]!;
    expect(c.seriesIds).toEqual(['6']);
  });

  it('falls back to the performance series when no worn song is known', () => {
    const c = buildCostumeSummaries(costumeMap, performanceById)[0]!;
    expect(c.seriesIds.sort()).toEqual(['s1', 's2']);
  });

  it('uses the namesake song for the thumbnail even when another song is worn more', () => {
    // song-other is worn 2×, song-snow 2× — but the costume is named "Snow halation",
    // so the namesake song-snow wins the thumbnail.
    const c = buildCostumeSummaries(costumeMap, performanceById)[0]!;
    expect(c.imageSongId).toBe('song-snow');
  });
});

describe('costumeMatchesCategory', () => {
  it('classifies costumes by the representative song instead of every worn song', () => {
    const song = (id: string, artists: { id: string }[]): Song => ({
      id,
      name: id,
      seriesIds: [1],
      artists
    });
    const costume = buildCostumeSummaries(
      costumeMap,
      performanceById,
      new Set(),
      new Set(),
      undefined,
      new Map([
        ['song-snow', song('song-snow', [{ id: 'g1' }])],
        ['song-other', song('song-other', [{ id: 's1' }])]
      ])
    )[0]!;
    const songById = new Map([
      ['song-snow', song('song-snow', [{ id: 'g1' }])],
      ['song-other', song('song-other', [{ id: 's1' }])]
    ]);

    expect(costume.imageSongId).toBe('song-snow');
    expect(costume.songIds).toContain('song-other');
    expect(costumeMatchesCategory(costume, 'group', songById, artistById)).toBe(true);
    expect(costumeMatchesCategory(costume, 'solo', songById, artistById)).toBe(false);
  });
});
