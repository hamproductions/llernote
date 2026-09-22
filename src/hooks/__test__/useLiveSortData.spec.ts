import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '~/i18n';
import { useLiveSortData, EMPTY_LIVE_SORT_FILTERS } from '../useLiveSortData';
import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist } from '~/types';

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

// Dates are relative to now so the "already happened" filter is exercised against a
// real clock rather than a date that silently becomes past as the calendar moves.
const offsetDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const performances: Performance[] = [
  makePerformance({ id: '1', tourName: 'Tour A', date: offsetDate(-30) }),
  makePerformance({ id: '2', tourName: 'Tour B', date: offsetDate(-60) }),
  makePerformance({ id: '3', tourName: 'Tour C', date: offsetDate(-90) }),
  makePerformance({ id: '4', tourName: 'Tour D', date: offsetDate(-120) }),
  makePerformance({ id: 'future', tourName: 'Tour Future', date: offsetDate(30) }),
  makePerformance({
    id: 'fes',
    tourName: 'Animelo Summer Live',
    date: offsetDate(-45),
    tourType: '外部のフェス'
  }),
  makePerformance({
    id: 'ext-live',
    tourName: 'Aqours World LoveLive! in LA',
    date: offsetDate(-50),
    tourType: '外部イベント内のライブ'
  }),
  // A tour mid-run: one leg played, one still to come.
  makePerformance({ id: 'run-past', tourName: 'Tour Running', date: offsetDate(-5) }),
  makePerformance({ id: 'run-next', tourName: 'Tour Running', date: offsetDate(5) })
];

const setlists: Record<string, Setlist> = {};

let attendanceMap: Record<string, AttendanceRecord> = {};

vi.mock('~/hooks/useData', () => ({
  usePerformances: () => performances,
  useAllPerformances: () => performances,
  useAllSetlists: () => setlists
}));

vi.mock('~/hooks/useAttendance', () => ({
  useAttendance: () => ({ map: attendanceMap })
}));

vi.mock('~/context/ToasterContext', () => ({ useToaster: () => ({ toast: vi.fn() }) }));

const attended = (performanceId: string): AttendanceRecord => ({
  performanceId,
  status: 'attended',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01'
});

beforeEach(() => {
  localStorage.clear();
  attendanceMap = {};
});

describe('useLiveSortData', () => {
  it('defaults to the lives the user attended', () => {
    attendanceMap = { '1': attended('1'), '3': attended('3') };

    const { result } = renderHook(() => useLiveSortData(EMPTY_LIVE_SORT_FILTERS, 'live'));

    expect(result.current.candidates.map((c) => c.title).sort()).toEqual(['Tour A', 'Tour C']);
  });

  it('excludes lives that have not happened yet', () => {
    // Imported attendance covers tickets for upcoming shows, so a future live would
    // otherwise sit in the default pool with no setlist to judge it by.
    attendanceMap = { '1': attended('1'), future: attended('future') };

    const { result } = renderHook(() => useLiveSortData(EMPTY_LIVE_SORT_FILTERS, 'live'));

    expect(result.current.candidates.map((c) => c.title)).toEqual(['Tour A']);
  });

  it('keeps the already-played legs of a tour that is still running', () => {
    const { result } = renderHook(() =>
      useLiveSortData({ ...EMPTY_LIVE_SORT_FILTERS, attendedOnly: false }, 'live')
    );

    const running = result.current.candidates.find((c) => c.title === 'Tour Running');
    expect(running?.performances.map((p) => p.id)).toEqual(['run-past']);
  });

  it('excludes external festivals, which are not LoveLive lives', () => {
    attendanceMap = { '1': attended('1'), fes: attended('fes') };

    const { result } = renderHook(() => useLiveSortData(EMPTY_LIVE_SORT_FILTERS, 'live'));

    expect(result.current.candidates.map((c) => c.title)).toEqual(['Tour A']);
  });

  it('keeps standalone lives held inside an external event', () => {
    // 外部イベント内のライブ reads like the festival type but covers real lives, such as
    // Aqours World LoveLive! in LA, so it must survive the filter.
    attendanceMap = { 'ext-live': attended('ext-live') };

    const { result } = renderHook(() => useLiveSortData(EMPTY_LIVE_SORT_FILTERS, 'live'));

    expect(result.current.candidates.map((c) => c.title)).toEqual(['Aqours World LoveLive! in LA']);
  });

  it('widens to the whole catalogue when attended-only is turned off', () => {
    const { result } = renderHook(() =>
      useLiveSortData({ ...EMPTY_LIVE_SORT_FILTERS, attendedOnly: false }, 'live')
    );

    // Four past tours plus the already-played leg of the running one; the purely
    // future tour is excluded.
    expect(result.current.candidates.map((c) => c.title).sort()).toEqual([
      'Aqours World LoveLive! in LA',
      'Tour A',
      'Tour B',
      'Tour C',
      'Tour D',
      'Tour Running'
    ]);
  });

  it('excludes soft-deleted and interested-only records from the default pool', () => {
    attendanceMap = {
      '1': attended('1'),
      '2': { ...attended('2'), deleted: true },
      '3': { ...attended('3'), status: 'interested' }
    };

    const { result } = renderHook(() => useLiveSortData(EMPTY_LIVE_SORT_FILTERS, 'live'));

    expect(result.current.candidates.map((c) => c.title)).toEqual(['Tour A']);
  });

  it('produces a complete ranking when every comparison is answered', () => {
    const filters = { ...EMPTY_LIVE_SORT_FILTERS, attendedOnly: false };
    const { result } = renderHook(() => useLiveSortData(filters, 'live'));

    act(() => result.current.start());

    // Always pick the left card; the sorter drives itself to a total order.
    let guard = 0;
    while (result.current.currentPair && guard++ < 100) {
      act(() => result.current.pickLeft());
    }

    expect(result.current.isEnded).toBe(true);
    expect(result.current.ranking.flat()).toHaveLength(6);
    // No tie sentinels leak into the rendered ranking.
    expect(result.current.ranking.every((bucket) => bucket.length > 0)).toBe(true);
  });

  it('collapses tied candidates into a single rank bucket', () => {
    const filters = { ...EMPTY_LIVE_SORT_FILTERS, attendedOnly: false };
    const { result } = renderHook(() => useLiveSortData(filters, 'live'));

    act(() => result.current.start());

    let guard = 0;
    while (result.current.currentPair && guard++ < 100) {
      act(() => result.current.pickTie());
    }

    expect(result.current.isEnded).toBe(true);
    expect(result.current.ranking).toHaveLength(1);
    expect(result.current.ranking[0]).toHaveLength(6);
  });

  it('undo restores the previous comparison', () => {
    const filters = { ...EMPTY_LIVE_SORT_FILTERS, attendedOnly: false };
    const { result } = renderHook(() => useLiveSortData(filters, 'live'));

    act(() => result.current.start());
    const firstPair = result.current.currentPair;
    act(() => result.current.pickLeft());
    act(() => result.current.pickUndo());

    expect(result.current.currentPair?.left.id).toBe(firstPair?.left.id);
    expect(result.current.currentPair?.right.id).toBe(firstPair?.right.id);
  });

  it('keeps the live and performance sorts in separate storage slots', () => {
    const filters = { ...EMPTY_LIVE_SORT_FILTERS, attendedOnly: false };
    const live = renderHook(() => useLiveSortData(filters, 'live'));
    act(() => live.result.current.start());

    const perf = renderHook(() => useLiveSortData(filters, 'performance'));

    expect(live.result.current.state).toBeDefined();
    expect(perf.result.current.state).toBeUndefined();
  });
});
