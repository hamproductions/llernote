import { describe, expect, it } from 'vitest';
import {
  buildSetlistInsights,
  compareSetlists,
  getSongDebutPerformance,
  getSongFirstWitnessPerformance,
  getSongWitnessCountAtPerformance
} from '../setlist-insights';
import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist } from '~/types';

const perf = (id: string, date: string, name = `Event ${id}`, startTime?: string): Performance => ({
  id,
  tourName: name,
  date,
  venue: 'Venue',
  seriesIds: ['2'],
  status: 'completed',
  hasSetlist: true,
  category: 'live',
  startTime
});

const setlist = (performanceId: string, songIds: string[]): Setlist => ({
  id: performanceId,
  performanceId,
  isActual: true,
  sections: [],
  items: songIds.map((songId, index) => ({
    id: `${performanceId}-${index}`,
    type: 'song',
    position: index + 1,
    songId
  }))
});

const attended = (performanceId: string): AttendanceRecord => ({
  performanceId,
  status: 'attended',
  watchType: 'live',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
});

describe('buildSetlistInsights', () => {
  it('diffs any two arbitrary setlists independent of date order', () => {
    const setlists = {
      older: setlist('older', ['song-a', 'song-b', 'song-c']),
      newer: setlist('newer', ['song-c', 'song-d'])
    };

    const diff = compareSetlists(setlists.older, setlists.newer);

    expect(diff.sharedSongIds).toEqual(['song-c']);
    expect(diff.addedSongIds).toEqual(['song-d']);
    expect(diff.removedSongIds).toEqual(['song-a', 'song-b']);
    expect(diff.rows).toEqual([
      { type: 'removed', songId: 'song-a' },
      { type: 'removed', songId: 'song-b' },
      { type: 'same', songId: 'song-c' },
      { type: 'added', songId: 'song-d' }
    ]);
  });

  it('diffs against the previous dated setlist and reports days since the previous performance', () => {
    const performances = [
      perf('p1', '2024-01-01'),
      perf('p2', '2024-01-10'),
      perf('p3', '2024-01-20')
    ];
    const setlists = {
      p1: setlist('p1', ['song-a', 'song-b']),
      p2: setlist('p2', ['song-a', 'song-c']),
      p3: setlist('p3', ['song-c', 'song-d'])
    };

    const insights = buildSetlistInsights(performances[2]!, performances, setlists);

    expect(insights.previousPerformance?.id).toBe('p2');
    expect(insights.daysSincePreviousPerformance).toBe(10);
    expect(insights.addedSongIds).toEqual(['song-d']);
    expect(insights.removedSongIds).toEqual(['song-a']);
  });

  it('computes per-song days since the song was previously performed separately from debut', () => {
    const performances = [
      perf('p1', '2024-01-01'),
      perf('p2', '2024-01-10'),
      perf('p3', '2024-01-20')
    ];
    const setlists = {
      p1: setlist('p1', ['song-a', 'song-b']),
      p2: setlist('p2', ['song-c']),
      p3: setlist('p3', ['song-a', 'song-d'])
    };

    const insights = buildSetlistInsights(performances[2]!, performances, setlists);

    expect(insights.songInsights.get('song-a')).toMatchObject({
      isDebut: false,
      previousPerformance: performances[0],
      daysSincePreviousPerformance: 19
    });
    expect(insights.songInsights.get('song-d')).toMatchObject({
      isDebut: true,
      previousPerformance: undefined,
      daysSincePreviousPerformance: undefined
    });
  });

  it('orders same-day setlists by start time instead of id', () => {
    const performances = [
      perf('z-matinee', '2024-01-01', 'Matinee', '13:00'),
      perf('a-evening', '2024-01-01', 'Evening', '18:00')
    ];
    const setlists = {
      'z-matinee': setlist('z-matinee', ['song-a']),
      'a-evening': setlist('a-evening', ['song-a', 'song-b'])
    };

    const insights = buildSetlistInsights(performances[1]!, performances, setlists);

    expect(insights.previousPerformance?.id).toBe('z-matinee');
    expect(insights.songInsights.get('song-a')?.isDebut).toBe(false);
    expect(insights.songInsights.get('song-b')?.isDebut).toBe(true);
  });

  it('does not treat Day.1 text as daytime when ordering same-day labels', () => {
    const performances = [perf('z-matinee', '2024-01-01'), perf('a-evening', '2024-01-01')];
    performances[0]!.performanceName = 'Day.1 昼公演';
    performances[1]!.performanceName = 'Day.1 夜公演';
    const setlists = {
      'z-matinee': setlist('z-matinee', ['song-a']),
      'a-evening': setlist('a-evening', ['song-a', 'song-b'])
    };

    const insights = buildSetlistInsights(performances[1]!, performances, setlists);

    expect(insights.previousPerformance?.id).toBe('z-matinee');
  });
});

describe('song first-seen helpers', () => {
  it('keeps song debut (初披露) separate from the user first witness', () => {
    const performances = [
      perf('debut', '2024-01-01', 'Debut'),
      perf('first-seen', '2024-02-01', 'First Seen')
    ];
    const performanceById = new Map(
      performances.map((performance) => [performance.id, performance])
    );
    const setlists = {
      debut: setlist('debut', ['sign-song']),
      'first-seen': setlist('first-seen', ['sign-song'])
    };

    expect(getSongDebutPerformance('sign-song', performanceById, setlists)?.id).toBe('debut');
    expect(
      getSongFirstWitnessPerformance(
        'sign-song',
        [attended('first-seen')],
        performanceById,
        setlists
      )?.id
    ).toBe('first-seen');
  });

  it('counts song watches only up to the event being viewed', () => {
    const performances = [
      perf('first', '2024-01-01'),
      perf('current', '2024-02-01'),
      perf('future', '2024-03-01')
    ];
    const performanceById = new Map(
      performances.map((performance) => [performance.id, performance])
    );
    const setlists = {
      first: setlist('first', ['repeat-song']),
      current: setlist('current', ['repeat-song']),
      future: setlist('future', ['repeat-song'])
    };

    expect(
      getSongWitnessCountAtPerformance(
        'repeat-song',
        performances[1]!,
        [attended('first'), attended('current'), attended('future')],
        performanceById,
        setlists
      )
    ).toBe(2);
  });

  it('uses same-day start time for first witness and as-of counts', () => {
    const performances = [
      perf('z-matinee', '2024-02-01', 'Matinee', '13:00'),
      perf('a-evening', '2024-02-01', 'Evening', '18:00')
    ];
    const performanceById = new Map(
      performances.map((performance) => [performance.id, performance])
    );
    const setlists = {
      'z-matinee': setlist('z-matinee', ['same-day-song']),
      'a-evening': setlist('a-evening', ['same-day-song'])
    };
    const records = [attended('z-matinee'), attended('a-evening')];

    expect(
      getSongFirstWitnessPerformance('same-day-song', records, performanceById, setlists)?.id
    ).toBe('z-matinee');
    expect(
      getSongWitnessCountAtPerformance(
        'same-day-song',
        performances[0]!,
        records,
        performanceById,
        setlists
      )
    ).toBe(1);
  });
});
