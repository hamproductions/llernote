import { describe, expect, it } from 'vitest';
import { groupByTour } from '../tour';
import type { Performance } from '~/types';

const makePerformance = (overrides: Partial<Performance> & { id: string; date: string }): Performance => ({
  tourName: overrides.tourName ?? overrides.id,
  performanceName: '',
  venue: '',
  seriesIds: [],
  status: 'completed',
  hasSetlist: false,
  category: 'live',
  ...overrides
});

describe('groupByTour', () => {
  it('orders tours reverse-chronologically by their first performance date', () => {
    const performances: Performance[] = [
      // Tour A: a short single-day event that happens after Tour B started.
      makePerformance({ id: 'a', tourName: 'A', date: '2026-03-10' }),
      // Tour B: a multi-day tour that started earlier but ends later than A.
      makePerformance({ id: 'b1', tourName: 'B', date: '2026-03-01' }),
      makePerformance({ id: 'b2', tourName: 'B', date: '2026-03-20' }),
      // Tour C: the oldest.
      makePerformance({ id: 'c', tourName: 'C', date: '2026-01-15' })
    ];

    const tours = groupByTour(performances);

    // A (starts 03-10) before B (starts 03-01) even though B ends later (03-20).
    expect(tours.map((tour) => tour.tourName)).toEqual(['A', 'B', 'C']);
  });
});
