import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '~/i18n';
import { TourCard } from '../TourCard';
import type { Performance } from '~/types';
import type { TourGroup } from '~/utils/tour';

vi.mock('~/hooks/useAttendance', () => ({
  useAttendance: () => ({
    get: (performanceId: string) =>
      performanceId === 'performance-1'
        ? { performanceId: 'performance-1', status: 'attended' }
        : undefined
  })
}));

vi.mock('../EventThumb', () => ({
  EventThumb: () => null
}));

const performance: Performance = {
  id: 'performance-1',
  tourName: 'Party Stage',
  performanceName: '神奈川公演 (Day.1)',
  date: '2026-05-30',
  venue: 'ぴあアリーナMM',
  seriesIds: [],
  status: 'completed',
  hasSetlist: false,
  category: 'live'
};

const setlistPerformance: Performance = {
  ...performance,
  hasSetlist: true
};

const secondPerformance: Performance = {
  ...performance,
  id: 'performance-2',
  date: '2026-05-31',
  performanceName: '神奈川公演 (Day.2)'
};

const tour: TourGroup = {
  tourName: 'Party Stage',
  startDate: performance.date,
  endDate: performance.date,
  seriesIds: [],
  legs: [performance]
};

describe('TourCard', () => {
  it('shows attended state only through the attendance button', () => {
    const { container } = render(<TourCard tour={tour} onSelect={vi.fn()} />);
    const checks = [...container.querySelectorAll('path')].filter((path) =>
      path.getAttribute('d')?.startsWith('M438.6 105.4')
    );

    expect(checks).toHaveLength(1);
  });

  it('does not add a second status check beside compact leg actions', () => {
    const { container } = render(
      <TourCard
        tour={{
          ...tour,
          startDate: setlistPerformance.date,
          endDate: secondPerformance.date,
          legs: [setlistPerformance, secondPerformance]
        }}
        onSelect={vi.fn()}
      />
    );
    const checks = [...container.querySelectorAll('path')].filter((path) =>
      path.getAttribute('d')?.startsWith('M438.6 105.4')
    );

    expect(checks).toHaveLength(1);
  });
});
