import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '~/i18n';
import Page from '../sort/+Page';
import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist } from '~/types';

const makePerformance = (
  overrides: Partial<Performance> & { id: string; date: string }
): Performance => ({
  tourName: overrides.tourName ?? overrides.id,
  performanceName: '',
  venue: 'Venue',
  seriesIds: [],
  status: 'completed',
  hasSetlist: true,
  category: 'live',
  ...overrides
});

const performances: Performance[] = [
  makePerformance({ id: '1', tourName: 'Tour Alpha', date: '2026-03-01' }),
  makePerformance({ id: '2', tourName: 'Tour Bravo', date: '2026-02-01' }),
  makePerformance({ id: '3', tourName: 'Tour Charlie', date: '2026-01-01' })
];

const setlists: Record<string, Setlist> = {
  '1': {
    id: 'setlist-1',
    performanceId: '1',
    items: [{ id: 'i1', type: 'song', position: 0, songId: 'song-1' }],
    sections: [],
    isActual: true
  }
};

let attendanceMap: Record<string, AttendanceRecord> = {};

vi.mock('~/hooks/useData', () => ({
  usePerformances: () => performances,
  useAllPerformances: () => performances,
  useAllSetlists: () => setlists,
  useSetlists: () => setlists,
  usePerformanceById: () => new Map(performances.map((p) => [p.id, p])),
  useSongById: () => new Map(),
  useArtistById: () => new Map(),
  useSeries: () => [],
  useSeriesById: () => new Map(),
  useEventYears: () => ['2026'],
  useLiveThumb: () => undefined
}));

vi.mock('~/hooks/useAttendance', () => ({
  useAttendance: () => ({
    map: attendanceMap,
    records: Object.values(attendanceMap).filter((r) => !r.deleted)
  })
}));
vi.mock('~/context/ToasterContext', () => ({ useToaster: () => ({ toast: vi.fn() }) }));
vi.mock('~/components/detail/DetailStack', () => ({
  useDetail: () => ({ openSong: vi.fn(), openEvent: vi.fn(), openVenue: vi.fn() })
}));
vi.mock('~/components/layout/Metadata', () => ({ Metadata: () => null }));

const attended = (performanceId: string): AttendanceRecord => ({
  performanceId,
  status: 'attended',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01'
});

// The shared vitest setup replaces window.location with a plain URL, so navigation is
// simulated by reassigning it rather than through the history API.
const setUrl = (url: string) => {
  // @ts-expect-error matching the vitest-setup.ts idiom
  window.location = new URL(url);
};

beforeEach(() => {
  localStorage.clear();
  attendanceMap = { '1': attended('1'), '2': attended('2'), '3': attended('3') };
  setUrl('http://localhost/sort');
});

const startSort = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Start ranking/i }));
};

describe('/sort', () => {
  it('shows the setup screen with the attended pool before starting', () => {
    render(<Page />);

    expect(screen.getByText(/3 lives to rank/i)).not.toBeNull();
    expect(screen.getByRole('button', { name: /Start ranking/i })).not.toBeNull();
  });

  it('blocks starting when fewer than two lives are in the pool', () => {
    attendanceMap = { '1': attended('1') };
    render(<Page />);

    expect(screen.getByRole('button', { name: /Start ranking/i }).hasAttribute('disabled')).toBe(
      true
    );
    expect(screen.getByText(/at least two lives/i)).not.toBeNull();
  });

  it('presents two lives to compare once started', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await startSort(user);

    expect(screen.getByText(/Which live do you prefer/i)).not.toBeNull();
    const titles = ['Tour Alpha', 'Tour Bravo', 'Tour Charlie'].filter(
      (title) => screen.queryByText(title) !== null
    );
    expect(titles).toHaveLength(2);
  });

  it('runs to a complete ranking and shows every live exactly once', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await startSort(user);

    let guard = 0;
    while (screen.queryByText(/Which live do you prefer/i) && guard++ < 50) {
      await user.keyboard('{ArrowLeft}');
    }

    expect(screen.getByText(/Your ranking/i)).not.toBeNull();
    for (const title of ['Tour Alpha', 'Tour Bravo', 'Tour Charlie']) {
      expect(screen.getAllByText(title)).toHaveLength(1);
    }
  });

  it('expands the setlist on both cards together', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await startSort(user);

    const toggles = screen.getAllByRole('button', { name: /Show setlist/i });
    expect(toggles).toHaveLength(2);

    await user.click(toggles[0]!);

    expect(screen.getAllByRole('button', { name: /Hide setlist/i })).toHaveLength(2);
  });

  it('renders a shared ranking read-only from the ?d= parameter', async () => {
    const { encodeLiveSortResults } = await import('~/utils/live-sort-share');
    const encoded = encodeLiveSortResults({
      unit: 'live',
      results: [['live:2026-03-01:Tour Alpha'], ['live:2026-02-01:Tour Bravo']]
    });
    setUrl(`http://localhost/sort?d=${encodeURIComponent(encoded)}`);

    render(<Page />);

    const heading = await screen.findByText(/Your ranking/i);
    expect(heading).not.toBeNull();
    // Read-only: no share controls, and a way back to sorting.
    expect(screen.queryByRole('button', { name: /Copy link/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Back to sorting/i })).not.toBeNull();
  });

  it('marks tied lives as sharing a rank', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await startSort(user);

    let guard = 0;
    while (screen.queryByText(/Which live do you prefer/i) && guard++ < 50) {
      await user.keyboard('{ArrowDown}');
    }

    // All three tied into one bucket: one rank number, two "Tied" markers.
    expect(screen.getAllByText(/^Tied$/)).toHaveLength(2);
    expect(screen.getAllByText(/^1$/)).toHaveLength(1);
  });
});
