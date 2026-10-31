import { describe, expect, it } from 'vitest';
import { computeStats } from '../stats';
import { tallySongs } from '../song-tally';
import type { Performance, Setlist } from '~/types';
import type { AttendanceRecord } from '~/types/attendance';

const performance = (
  id: string,
  date: string,
  venue = 'Venue A',
  seriesIds = ['1'],
  venueId?: string
): Performance => ({
  id,
  tourName: `Event ${id}`,
  date,
  venue,
  venueId,
  seriesIds,
  status: 'completed',
  hasSetlist: true,
  category: 'live'
});

const record = (performanceId: string, status: 'attended' | 'interested'): AttendanceRecord => ({
  performanceId,
  status,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
});

const setlist = (performanceId: string, songIds: string[]): Setlist => ({
  id: `setlist-${performanceId}`,
  performanceId,
  items: songIds.map((songId, i) => ({
    id: `${performanceId}-${i}`,
    type: 'song',
    position: i,
    songId
  })),
  sections: [],
  isActual: true
});

const performanceById = new Map(
  [
    performance('1', '2023-05-01', 'Tokyo Dome', ['1'], 'tokyo-dome'),
    performance('2', '2024-06-01', 'Saitama Super Arena', ['2'], 'ssa'),
    performance('3', '2024-07-01', 'Tokyo Dome', ['1', '2'], 'tokyo-dome')
  ].map((p) => [p.id, p])
);

const setlists = {
  '1': setlist('1', ['10', '11']),
  '2': setlist('2', ['10', '12']),
  '3': setlist('3', ['10'])
};

describe('computeStats', () => {
  it('computes totals across attended events', () => {
    const stats = computeStats(
      [record('1', 'attended'), record('2', 'attended'), record('3', 'interested')],
      performanceById,
      setlists
    );
    expect(stats.attendedCount).toBe(2);
    expect(stats.interestedCount).toBe(0);
    expect(stats.songsWitnessed).toBe(4);
    expect(stats.uniqueSongs).toBe(3);
    expect(stats.venuesVisited).toBe(2);
    expect(stats.attendanceEligibleCount).toBe(3);
    expect(stats.attendanceRate).toBe(67);
    expect(stats.attendanceBySeries).toEqual([
      { seriesId: '1', total: 2, attended: 1, rate: 50 },
      { seriesId: '2', total: 2, attended: 1, rate: 50 }
    ]);
    expect(stats.firstEvent?.id).toBe('1');
    expect(stats.latestEvent?.id).toBe('2');
    expect(stats.byYear).toEqual([
      { year: '2023', count: 1 },
      { year: '2024', count: 1 }
    ]);
    expect(stats.byVenue).toEqual([
      { venue: 'Saitama Super Arena', venueId: 'ssa', count: 1 },
      { venue: 'Tokyo Dome', venueId: 'tokyo-dome', count: 1 }
    ]);
  });

  it('computes city stats from enriched venue data', () => {
    const stats = computeStats(
      [record('1', 'attended'), record('2', 'attended'), record('3', 'attended')],
      performanceById,
      setlists,
      [...performanceById.values()],
      new Map([
        ['tokyo-dome', { id: 'tokyo-dome', name: 'Tokyo Dome', locality: 'Tokyo' }],
        [
          'ssa',
          {
            id: 'ssa',
            name: 'Saitama Super Arena',
            locality: 'Saitama',
            confidence: 0.96,
            reviewRequired: false
          }
        ]
      ])
    );

    expect(stats.byCity).toEqual([
      { city: 'Tokyo', count: 2 },
      { city: 'Saitama', count: 1 }
    ]);
  });

  it('ignores review-required city data', () => {
    const stats = computeStats(
      [record('1', 'attended'), record('2', 'attended')],
      performanceById,
      setlists,
      [...performanceById.values()],
      new Map([
        [
          'tokyo-dome',
          {
            id: 'tokyo-dome',
            name: 'Tokyo Dome',
            locality: 'Tokyo',
            confidence: 0.72,
            reviewRequired: true
          }
        ],
        [
          'ssa',
          {
            id: 'ssa',
            name: 'Saitama Super Arena',
            locality: 'Saitama',
            confidence: 0.96,
            reviewRequired: false
          }
        ]
      ])
    );

    expect(stats.byCity).toEqual([{ city: 'Saitama', count: 1 }]);
  });

  it('counts multi-series events in every series', () => {
    const stats = computeStats([record('3', 'attended')], performanceById, setlists);
    expect(stats.bySeries).toHaveLength(2);
  });

  it('counts interested only for future events', () => {
    const future = performance('99', '2099-01-01');
    const byId = new Map([...performanceById, ['99', future]]);
    const stats = computeStats(
      [record('99', 'interested'), record('1', 'interested')],
      byId,
      setlists
    );
    expect(stats.interestedCount).toBe(1);
    expect(stats.attendanceEligibleCount).toBe(3);
  });

  it('handles empty input', () => {
    const stats = computeStats([], performanceById, setlists);
    expect(stats.attendedCount).toBe(0);
    expect(stats.firstEvent).toBeUndefined();
  });
});

describe('tallySongs', () => {
  it('ranks songs by witness count', () => {
    const tally = tallySongs(
      [record('1', 'attended'), record('2', 'attended'), record('3', 'attended')],
      performanceById,
      setlists
    );
    expect(tally[0]).toMatchObject({ songId: '10', count: 3 });
    expect(tally[0]?.performances.map((p) => p.id)).toEqual(['1', '2', '3']);
    expect(tally).toHaveLength(3);
  });

  it('ignores interested-only events', () => {
    const tally = tallySongs([record('1', 'interested')], performanceById, setlists);
    expect(tally).toHaveLength(0);
  });
});

describe('event-type witness semantics', () => {
  const live = {
    ...performance('L', '2024-01-01', 'Live Hall', ['1'], 'live-hall'),
    category: 'live' as const
  };
  const online = {
    ...performance('O', '2024-02-01', 'Virtual', ['1'], 'virtual'),
    category: 'online' as const
  };
  const tv = {
    ...performance('T', '2024-03-01', 'TV Studio', ['1'], 'tv-studio'),
    category: 'tv' as const
  };
  const byId = new Map([live, online, tv].map((p) => [p.id, p]));
  const sls = { L: setlist('L', ['1', '2']), O: setlist('O', ['3', '4']), T: setlist('T', ['5']) };
  const watched = (
    performanceId: string,
    watchType: 'live' | 'stream' | 'delay'
  ): AttendanceRecord => ({
    ...record(performanceId, 'attended'),
    watchType
  });

  it('counts online/tv as watched but never witnessed', () => {
    const stats = computeStats(
      [watched('L', 'live'), watched('O', 'live'), watched('T', 'live')],
      byId,
      sls
    );
    expect(stats.attendedCount).toBe(3);
    expect(stats.witnessedCount).toBe(1);
    expect(stats.watchedCount).toBe(2);
    expect(stats.songsWitnessed).toBe(2);
    expect(stats.venuesVisited).toBe(1);
    expect(stats.byVenue).toEqual([{ venue: 'Live Hall', venueId: 'live-hall', count: 1 }]);
  });

  it('treats a live event watched via stream as not witnessed', () => {
    const stats = computeStats([watched('L', 'stream')], byId, sls);
    expect(stats.attendedCount).toBe(1);
    expect(stats.witnessedCount).toBe(0);
    expect(stats.songsWitnessed).toBe(0);
    expect(stats.venuesVisited).toBe(0);
  });

  it('tallies songs only from in-person witnessed events', () => {
    const tally = tallySongs(
      [watched('L', 'live'), watched('O', 'live'), watched('T', 'live')],
      byId,
      sls
    );
    expect(tally.map((entry) => entry.songId).sort()).toEqual(['1', '2']);
  });
});
