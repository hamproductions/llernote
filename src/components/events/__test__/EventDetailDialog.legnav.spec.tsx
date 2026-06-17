import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '~/i18n';
import { EventDetailDialog } from '../EventDetailDialog';
import type { Performance } from '~/types';

const day1: Performance = {
  id: 'performance-1',
  tourName: 'Party Stage',
  performanceName: 'Day 1',
  date: '2026-05-30',
  venue: 'Pia Arena MM',
  seriesIds: [],
  status: 'completed',
  hasSetlist: false,
  category: 'live'
};

const day2: Performance = {
  ...day1,
  id: 'performance-2',
  performanceName: 'Day 2',
  date: '2026-05-31'
};

const soloShow: Performance = {
  ...day1,
  id: 'performance-3',
  tourName: 'Solo Show',
  performanceName: '',
  date: '2026-08-01'
};

const performances = [day1, day2, soloShow];

vi.mock('~/hooks/useAttendance', () => ({
  useAttendance: () => ({
    get: () => undefined,
    records: [],
    updateAttendance: vi.fn()
  })
}));

vi.mock('~/context/ToasterContext', () => ({
  useToaster: () => ({ toast: vi.fn() })
}));

vi.mock('~/hooks/useData', () => ({
  usePerformances: () => performances,
  usePerformanceById: () => new Map(performances.map((p) => [p.id, p])),
  useSetlist: () => undefined,
  useSetlists: () => ({}),
  useSongById: () => new Map(),
  useArtistById: () => new Map(),
  useVenueById: () => new Map()
}));

describe('EventDetailDialog leg navigation', () => {
  it('switches the shown performance when another leg is selected', async () => {
    render(<EventDetailDialog performance={day1} open onClose={vi.fn()} />);

    // Opens on Day 1.
    expect(screen.getByText('2026-05-30')).toBeTruthy();

    // Jump to Day 2 via the leg navigation.
    await userEvent.click(screen.getByRole('button', { name: /5\/31/ }));

    expect(screen.getByText('2026-05-31')).toBeTruthy();
  });

  it('shows the leg navigation only for multi-performance events', () => {
    const { rerender } = render(<EventDetailDialog performance={day1} open onClose={vi.fn()} />);
    // Day 1 / Day 2 share a tour, so the nav is present.
    expect(screen.getByText('Performances in this event')).toBeTruthy();

    // The solo show is its own event — no leg navigation.
    rerender(<EventDetailDialog performance={soloShow} open onClose={vi.fn()} />);
    expect(screen.queryByText('Performances in this event')).toBeNull();
  });
});
