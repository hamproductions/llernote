import { describe, expect, it } from 'vitest';
import {
  buildSortCandidates,
  candidateSongIds,
  heroSongIds,
  legTabLabel,
  mosaicLayout
} from '../live-sort';
import {
  buildSongPerformanceOrdinals,
  buildWitnessBySong,
  songWitnessInfo
} from '../setlist-insights';
import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist, SetlistItem } from '~/types';

const makePerformance = (
  overrides: Partial<Performance> & { id: string; date: string }
): Performance => ({
  tourName: overrides.tourName ?? overrides.id,
  performanceName: '',
  venue: '',
  seriesIds: [],
  status: 'completed',
  hasSetlist: false,
  category: 'live',
  ...overrides
});

const makeSetlist = (performanceId: string, songIds: string[]): Setlist => ({
  id: `setlist-${performanceId}`,
  performanceId,
  items: songIds.map(
    (songId, position): SetlistItem => ({
      id: `${performanceId}-${position}`,
      type: 'song',
      position,
      songId
    })
  ),
  sections: [],
  isActual: true
});

describe('buildSortCandidates', () => {
  it('groups legs into one candidate per tour in live mode', () => {
    const candidates = buildSortCandidates(
      [
        makePerformance({ id: '1', tourName: 'Tour A', date: '2026-03-01' }),
        makePerformance({ id: '2', tourName: 'Tour A', date: '2026-03-02' }),
        makePerformance({ id: '3', tourName: 'Tour B', date: '2026-01-10' })
      ],
      'live'
    );

    expect(candidates).toHaveLength(2);
    const tourA = candidates.find((c) => c.title === 'Tour A')!;
    expect(tourA.performances.map((p) => p.id)).toEqual(['1', '2']);
    expect(tourA.startDate).toBe('2026-03-01');
    expect(tourA.endDate).toBe('2026-03-02');
  });

  it('emits one candidate per show in performance mode', () => {
    const candidates = buildSortCandidates(
      [
        makePerformance({ id: '1', tourName: 'Tour A', date: '2026-03-01' }),
        makePerformance({ id: '2', tourName: 'Tour A', date: '2026-03-02' })
      ],
      'performance'
    );

    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.id)).toEqual(['perf:1', 'perf:2']);
  });

  it('orders same-day shows by matinee before evening', () => {
    const candidates = buildSortCandidates(
      [
        makePerformance({
          id: 'evening',
          tourName: 'Tour A',
          date: '2026-03-01',
          performanceName: '夜の部'
        }),
        makePerformance({
          id: 'matinee',
          tourName: 'Tour A',
          date: '2026-03-01',
          performanceName: '昼の部'
        })
      ],
      'performance'
    );

    expect(candidates.map((c) => c.id)).toEqual(['perf:matinee', 'perf:evening']);
  });

  it('keeps candidate ids stable when the candidate set changes', () => {
    const tourA = makePerformance({ id: '1', tourName: 'Tour A', date: '2026-03-01' });
    const tourB = makePerformance({ id: '3', tourName: 'Tour B', date: '2026-01-10' });

    const withBoth = buildSortCandidates([tourA, tourB], 'live');
    const withOnlyA = buildSortCandidates([tourA], 'live');

    // An index-derived id would shift when Tour B drops out of the pool, silently
    // re-pointing persisted sort state at a different live.
    expect(withOnlyA[0]!.id).toBe(withBoth.find((c) => c.title === 'Tour A')!.id);
  });

  it('splits a tour with a long gap into separate candidates with distinct ids', () => {
    const candidates = buildSortCandidates(
      [
        makePerformance({ id: '1', tourName: 'Tour A', date: '2026-01-01' }),
        makePerformance({ id: '2', tourName: 'Tour A', date: '2026-09-01' })
      ],
      'live'
    );

    expect(candidates).toHaveLength(2);
    expect(new Set(candidates.map((c) => c.id)).size).toBe(2);
  });
});

describe('candidateSongIds', () => {
  it('unions songs across every leg without duplicates', () => {
    const [candidate] = buildSortCandidates(
      [
        makePerformance({ id: '1', tourName: 'Tour A', date: '2026-03-01' }),
        makePerformance({ id: '2', tourName: 'Tour A', date: '2026-03-02' })
      ],
      'live'
    );

    const songIds = candidateSongIds(candidate!, {
      '1': makeSetlist('1', ['s1', 's2']),
      '2': makeSetlist('2', ['s2', 's3'])
    });

    expect([...songIds].sort()).toEqual(['s1', 's2', 's3']);
  });
});

describe('heroSongIds', () => {
  const tour = () =>
    buildSortCandidates(
      [
        makePerformance({ id: '1', tourName: 'Tour A', date: '2026-03-01' }),
        makePerformance({ id: '2', tourName: 'Tour A', date: '2026-03-02' })
      ],
      'live'
    )[0]!;

  const setlists = {
    '1': makeSetlist('1', ['s1', 'no-art', 's2', 's1']),
    '2': makeSetlist('2', ['s2', 's3'])
  };
  const hasArt = (songId: string) => songId !== 'no-art';

  it('takes songs in setlist order so the opener leads', () => {
    expect(heroSongIds(tour(), setlists, hasArt, 6)).toEqual(['s1', 's2', 's3']);
  });

  it('skips songs with no album art', () => {
    expect(heroSongIds(tour(), setlists, hasArt, 6)).not.toContain('no-art');
  });

  it('de-dupes a song repeated within or across legs', () => {
    const ids = heroSongIds(tour(), setlists, hasArt, 6);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stops at the requested maximum', () => {
    expect(heroSongIds(tour(), setlists, hasArt, 2)).toEqual(['s1', 's2']);
  });

  it('returns nothing when no song has art', () => {
    expect(heroSongIds(tour(), setlists, () => false, 6)).toEqual([]);
  });
});

describe('mosaicLayout', () => {
  it('keeps the grid rectangular at every size', () => {
    // A ragged final row (5 tiles over 3 columns) would read as a rendering bug.
    for (const available of [0, 1, 2, 3, 4, 5, 6, 7, 20]) {
      const { count, columns } = mosaicLayout(available);
      expect(count % columns).toBe(0);
      expect(count).toBeLessThanOrEqual(Math.max(available, 0));
    }
  });

  it('uses a 3x2 grid once there is enough art', () => {
    expect(mosaicLayout(6)).toEqual({ count: 6, columns: 3 });
    expect(mosaicLayout(20)).toEqual({ count: 6, columns: 3 });
  });

  it('drops to 2x2 rather than leaving a hole', () => {
    expect(mosaicLayout(4)).toEqual({ count: 4, columns: 2 });
    expect(mosaicLayout(5)).toEqual({ count: 4, columns: 2 });
  });

  it('pairs two tiles and leaves a single one full width', () => {
    expect(mosaicLayout(3)).toEqual({ count: 2, columns: 2 });
    expect(mosaicLayout(1)).toEqual({ count: 1, columns: 1 });
    expect(mosaicLayout(0)).toEqual({ count: 0, columns: 1 });
  });
});

describe('legTabLabel', () => {
  const label = (overrides: Partial<Performance>) =>
    legTabLabel(makePerformance({ id: 'x', date: '2026-03-07', ...overrides }));

  it('names the leg and puts its venue on a second line', () => {
    expect(
      label({ performanceName: '石川公演 (Day.1)', venue: '石川県産業展示館 (4号館)' })
    ).toEqual({
      primary: '石川公演 (Day.1)',
      secondary: '石川県産業展示館 (4号館)',
      full: '石川公演 (Day.1) — 石川県産業展示館 (4号館)'
    });
  });

  it('falls back to concertName when the leg has no performance name', () => {
    expect(label({ performanceName: '', concertName: '名古屋公演' }).primary).toBe('名古屋公演');
  });

  it('falls back to the date when the leg has neither name', () => {
    expect(label({ performanceName: '', concertName: undefined }).primary).toBe('2026-03-07');
  });

  it('omits the venue line when the leg has no venue', () => {
    const result = label({ performanceName: 'Day.1', venue: '' });

    expect(result.secondary).toBeUndefined();
    expect(result.full).toBe('Day.1');
  });
});

describe('buildWitnessBySong', () => {
  const shows = [
    makePerformance({ id: 'a', date: '2026-01-01' }),
    makePerformance({ id: 'b', date: '2026-02-01' }),
    makePerformance({ id: 'c', date: '2026-03-01' })
  ];
  const performanceById = new Map(shows.map((p) => [p.id, p]));
  const setlists = {
    a: makeSetlist('a', ['s1']),
    b: makeSetlist('b', ['s1', 's2']),
    c: makeSetlist('c', ['s1', 's2'])
  };
  const attended = (performanceId: string, overrides: Partial<AttendanceRecord> = {}) =>
    ({
      performanceId,
      status: 'attended',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      ...overrides
    }) as AttendanceRecord;

  it('counts attended shows up to and including this one', () => {
    const witness = buildWitnessBySong(
      shows[2]!,
      [attended('a'), attended('b'), attended('c')],
      performanceById,
      setlists
    );

    expect(witness.get('s1')?.count).toBe(3);
    expect(witness.get('s2')?.count).toBe(2);
  });

  it('ignores shows after this one', () => {
    const witness = buildWitnessBySong(
      shows[0]!,
      [attended('a'), attended('b'), attended('c')],
      performanceById,
      setlists
    );

    expect(witness.get('s1')?.count).toBe(1);
    expect(witness.has('s2')).toBe(false);
  });

  it('ignores shows the viewer only marked as interested, and deleted records', () => {
    const witness = buildWitnessBySong(
      shows[2]!,
      [attended('a', { status: 'interested' }), attended('b', { deleted: true }), attended('c')],
      performanceById,
      setlists
    );

    expect(witness.get('s1')?.count).toBe(1);
  });

  it('marks the earliest attended show as the first witness', () => {
    const witness = buildWitnessBySong(
      shows[2]!,
      [attended('a'), attended('c')],
      performanceById,
      setlists
    );

    expect(witness.get('s1')?.firstPerformanceId).toBe('a');
    // s2 was not in show a, so show c is where it was first seen.
    expect(witness.get('s2')?.firstPerformanceId).toBe('c');
  });

  it('counts a song played twice in one show once', () => {
    const witness = buildWitnessBySong(shows[0]!, [attended('a')], performanceById, {
      a: makeSetlist('a', ['s1', 's1'])
    });

    expect(witness.get('s1')?.count).toBe(1);
  });
});

describe('songWitnessInfo', () => {
  const show = makePerformance({ id: 'c', date: '2026-03-01' });

  it('reports a zero count for a song the viewer has never seen', () => {
    expect(songWitnessInfo(new Map(), 's1', show)).toEqual({
      count: 0,
      isFirst: false,
      daysSinceSeen: undefined
    });
  });

  it('measures days since the previous time the viewer saw it', () => {
    const witness = new Map([
      ['s1', { count: 2, firstPerformanceId: 'a', prevSeenDate: '2026-02-01' }]
    ]);

    expect(songWitnessInfo(witness, 's1', show)?.daysSinceSeen).toBe(28);
  });

  it('is undefined without a witness map or a song id', () => {
    expect(songWitnessInfo(null, 's1', show)).toBeUndefined();
    expect(songWitnessInfo(new Map(), undefined, show)).toBeUndefined();
  });
});

describe('buildSongPerformanceOrdinals', () => {
  it('counts how many earlier performances played each song', () => {
    const performances = [
      makePerformance({ id: '1', date: '2026-01-01' }),
      makePerformance({ id: '2', date: '2026-02-01' }),
      makePerformance({ id: '3', date: '2026-03-01' })
    ];
    const setlists = {
      '1': makeSetlist('1', ['s1']),
      '2': makeSetlist('2', ['s1', 's2']),
      '3': makeSetlist('3', ['s1', 's2'])
    };

    const ordinals = buildSongPerformanceOrdinals(performances, setlists);

    expect(ordinals.get('1')!.get('s1')).toBe(0);
    expect(ordinals.get('2')!.get('s1')).toBe(1);
    expect(ordinals.get('3')!.get('s1')).toBe(2);
    // s2 debuts at performance 2, so it is "0 before" there and "1 before" at 3.
    expect(ordinals.get('2')!.get('s2')).toBe(0);
    expect(ordinals.get('3')!.get('s2')).toBe(1);
  });

  it('reports the same count for a song played twice within one performance', () => {
    const ordinals = buildSongPerformanceOrdinals(
      [makePerformance({ id: '1', date: '2026-01-01' })],
      { '1': makeSetlist('1', ['s1', 's1']) }
    );

    expect(ordinals.get('1')!.get('s1')).toBe(0);
  });

  it('counts TV and online performances, which the in-person filter would hide', () => {
    const performances = [
      makePerformance({ id: 'tv', date: '2026-01-01', category: 'tv' }),
      makePerformance({ id: 'online', date: '2026-02-01', category: 'online' }),
      makePerformance({ id: 'live', date: '2026-03-01', category: 'live' })
    ];
    const setlists = {
      tv: makeSetlist('tv', ['s1']),
      online: makeSetlist('online', ['s1']),
      live: makeSetlist('live', ['s1'])
    };

    const ordinals = buildSongPerformanceOrdinals(performances, setlists);

    // Callers must pass the unfiltered set: the in-person live is the song's 3rd outing.
    expect(ordinals.get('live')!.get('s1')).toBe(2);
  });

  it('ignores performances that have no setlist', () => {
    const ordinals = buildSongPerformanceOrdinals(
      [
        makePerformance({ id: '1', date: '2026-01-01' }),
        makePerformance({ id: '2', date: '2026-02-01' })
      ],
      { '2': makeSetlist('2', ['s1']) }
    );

    expect(ordinals.has('1')).toBe(false);
    expect(ordinals.get('2')!.get('s1')).toBe(0);
  });
});
