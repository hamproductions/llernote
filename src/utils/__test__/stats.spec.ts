import { describe, expect, it } from 'vitest';
import { computeStats } from '../stats';
import { tallySongs } from '../song-tally';
import type { Performance, Setlist } from '~/types';
import type { AttendanceRecord } from '~/types/attendance';

const performance = (
  id: string,
  date: string,
  venue = 'Venue A',
  seriesIds = ['1']
): Performance => ({
  id,
  tourName: `Event ${id}`,
  date,
  venue,
  seriesIds,
  status: 'completed',
  hasSetlist: true
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
    performance('1', '2023-05-01', 'Tokyo Dome', ['1']),
    performance('2', '2024-06-01', 'Saitama Super Arena', ['2']),
    performance('3', '2024-07-01', 'Tokyo Dome', ['1', '2'])
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
    expect(stats.interestedCount).toBe(1);
    expect(stats.songsWitnessed).toBe(4);
    expect(stats.uniqueSongs).toBe(3);
    expect(stats.venuesVisited).toBe(2);
    expect(stats.firstEvent?.id).toBe('1');
    expect(stats.latestEvent?.id).toBe('2');
    expect(stats.byYear).toEqual([
      { year: '2023', count: 1 },
      { year: '2024', count: 1 }
    ]);
  });

  it('counts multi-series events in every series', () => {
    const stats = computeStats([record('3', 'attended')], performanceById, setlists);
    expect(stats.bySeries).toHaveLength(2);
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
