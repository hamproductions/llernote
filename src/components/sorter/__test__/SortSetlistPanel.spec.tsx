import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '~/i18n';
import { SortSetlistPanel } from '../SortSetlistPanel';
import { buildSortCandidates } from '~/utils/live-sort';
import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist, Song } from '~/types';

const songRow = (id: string, position: number, songId: string) =>
  ({ id, type: 'song', position, songId }) as const;

const setlists: Record<string, Setlist> = {
  '1': {
    id: 'setlist-1',
    performanceId: '1',
    items: [
      { id: 'i1', type: 'song', position: 0, songId: 'song-1' },
      { id: 'i2', type: 'mc', position: 1, title: 'MC①' },
      { id: 'i3', type: 'song', position: 2, songId: 'song-2', remarks: 'TVサイズ' }
    ],
    sections: [],
    isActual: true
  },
  // An earlier show the viewer also attended, which played song-2 but not song-1.
  earlier: {
    id: 'setlist-earlier',
    performanceId: 'earlier',
    items: [songRow('e1', 0, 'song-2')],
    sections: [],
    isActual: true
  },
  '2': {
    id: 'setlist-2',
    performanceId: '2',
    items: [songRow('d2', 0, 'song-3')],
    sections: [],
    isActual: true
  },
  '3': {
    id: 'setlist-3',
    performanceId: '3',
    items: [songRow('d3', 0, 'song-4')],
    sections: [],
    isActual: true
  }
};

let attendanceRecords: AttendanceRecord[] = [];
let performanceById = new Map<string, Performance>();

vi.mock('~/hooks/useData', () => ({
  useSetlists: () => setlists,
  usePerformanceById: () => performanceById,
  useSongById: () =>
    new Map<string, Song>([
      ['song-1', { id: 'song-1', name: 'Brand New Song', artists: [], seriesIds: [] }],
      ['song-2', { id: 'song-2', name: 'Veteran Song', artists: [], seriesIds: [] }],
      ['song-3', { id: 'song-3', name: 'Ishikawa Day Two Song', artists: [], seriesIds: [] }],
      ['song-4', { id: 'song-4', name: 'Aichi Song', artists: [], seriesIds: [] }]
    ]),
  useArtistById: () => new Map()
}));

vi.mock('~/utils/song-thumbs', () => ({ hasSongThumb: () => false }));

vi.mock('~/hooks/useAttendance', () => ({ useAttendance: () => ({ records: attendanceRecords }) }));

const openSong = vi.fn();
vi.mock('~/components/detail/DetailStack', () => ({
  useDetail: () => ({ openSong, openEvent: vi.fn(), openVenue: vi.fn() })
}));

const performance: Performance = {
  id: '1',
  tourName: 'Tour A',
  performanceName: 'Day.1',
  date: '2026-03-01',
  venue: 'Venue',
  seriesIds: [],
  status: 'completed',
  hasSetlist: true,
  category: 'live',
  note: '鈴木愛奈さんは怪我のためトークパートのみ出演'
};

const earlierPerformance: Performance = {
  ...performance,
  id: 'earlier',
  performanceName: 'Earlier show',
  date: '2025-01-01',
  note: undefined
};

const attended = (performanceId: string): AttendanceRecord => ({
  performanceId,
  status: 'attended',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01'
});

beforeEach(() => {
  attendanceRecords = [];
  performanceById = new Map([
    [performance.id, performance],
    [earlierPerformance.id, earlierPerformance]
  ]);
});

const renderPanel = (overrides?: Partial<Performance>) => {
  const [candidate] = buildSortCandidates([{ ...performance, ...overrides }], 'performance');
  return render(
    <SortSetlistPanel
      candidate={candidate!}
      songOrdinals={
        new Map([
          [
            '1',
            new Map([
              ['song-1', 0],
              ['song-2', 12]
            ])
          ]
        ])
      }
    />
  );
};

describe('SortSetlistPanel', () => {
  it('numbers songs without letting MC rows consume a track number', () => {
    renderPanel();

    // Debut Song is 1., Veteran Song is 2. — the MC row between them is unnumbered.
    expect(screen.getByText('1.')).not.toBeNull();
    expect(screen.getByText('2.')).not.toBeNull();
    expect(screen.queryByText('3.')).toBeNull();
    expect(screen.getByText('MC①')).not.toBeNull();
  });

  it('badges only the song with no earlier performance as a debut', () => {
    renderPanel();

    // The 初披露 / "Debut" badge is driven by an ordinal of 0, so only song-1 gets it.
    expect(screen.getAllByText(/^(初披露|Debut)$/)).toHaveLength(1);
  });

  it('shows how many earlier performances played each song', () => {
    renderPanel();

    expect(screen.getByText(/12/)).not.toBeNull();
  });

  it('renders per-item remarks', () => {
    renderPanel();

    expect(screen.getByText('TVサイズ')).not.toBeNull();
  });

  it('renders the performance remark below the setlist', () => {
    renderPanel();

    expect(screen.getByText('鈴木愛奈さんは怪我のためトークパートのみ出演')).not.toBeNull();
  });

  it('omits the remarks section when the live has no note', () => {
    renderPanel({ note: undefined });

    expect(screen.queryByText(/鈴木愛奈/)).toBeNull();
  });

  it('opens the song detail dialog when the info action is used', async () => {
    const user = userEvent.setup();
    renderPanel();

    const [infoButton] = screen.getAllByRole('button');
    await user.click(infoButton!);

    expect(openSong).toHaveBeenCalledWith('song-1');
  });

  it('shows no witness chips for a live the viewer did not attend', () => {
    renderPanel();

    expect(screen.queryByText(/^×\d+$/)).toBeNull();
    expect(screen.queryAllByText(/^(初視聴|First seen)$/)).toHaveLength(0);
  });

  it('counts how many times the viewer has seen each song, same as the event dialog', () => {
    attendanceRecords = [attended('1'), attended('earlier')];
    renderPanel();

    // song-2 played at the earlier show too, so this is the 2nd time seeing it.
    expect(screen.getByText('×2')).not.toBeNull();
  });

  it('badges a song the viewer is seeing for the first time', () => {
    attendanceRecords = [attended('1'), attended('earlier')];
    renderPanel();

    // song-1 appears only in this setlist, so this performance is its first witness.
    expect(screen.getAllByText(/^(初視聴|First seen)$/)).toHaveLength(1);
  });

  it('shows no tab strip in performance mode', () => {
    renderPanel();

    // Every card in performance mode holds exactly one show, so a strip would be a lone
    // tab on both sides — noise, and no alignment risk since neither card has one.
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('keeps the tab strip for a one-leg live, whose opponent may have six', () => {
    const [candidate] = buildSortCandidates([performance], 'live');
    render(<SortSetlistPanel candidate={candidate!} songOrdinals={new Map()} />);

    // In live mode the two cards can differ in leg count, so the strip is held even for
    // a single leg to keep both setlists starting at the same height.
    expect(screen.getAllByRole('tab')).toHaveLength(1);
  });
});

describe('SortSetlistPanel with multiple legs', () => {
  const legs: Performance[] = [
    {
      ...performance,
      id: '1',
      performanceName: '石川公演 (Day.1)',
      venue: 'Ishikawa Hall',
      note: undefined
    },
    {
      ...performance,
      id: '2',
      performanceName: '石川公演 (Day.2)',
      venue: 'Ishikawa Hall',
      date: '2026-03-02'
    },
    {
      ...performance,
      id: '3',
      performanceName: '愛知公演 (Day.1)',
      venue: 'Aichi Hall',
      date: '2026-04-11',
      note: undefined
    }
  ];

  const renderTour = () => {
    const [candidate] = buildSortCandidates(legs, 'live');
    return render(<SortSetlistPanel candidate={candidate!} songOrdinals={new Map()} />);
  };

  it('gives each leg a tab instead of stacking every setlist into one scroll', () => {
    renderTour();

    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('labels tabs with the performance name and its venue', () => {
    renderTour();

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      '石川公演 (Day.1)Ishikawa Hall',
      '石川公演 (Day.2)Ishikawa Hall',
      '愛知公演 (Day.1)Aichi Hall'
    ]);
  });

  it('distinguishes legs that share a name by their venue line', () => {
    renderTour();

    // Two 石川公演 legs differ only by Day.N; the venue line is what tells repeated
    // city legs apart once a tour revisits a venue.
    expect(screen.getAllByText('Ishikawa Hall')).toHaveLength(2);
    expect(screen.getAllByText('Aichi Hall')).toHaveLength(1);
  });

  it('shows only the selected leg, and switches on click', async () => {
    const user = userEvent.setup();
    renderTour();

    // Only the active leg gets a panel, so other legs appear as tabs but have no panel.
    expect(screen.getByText('Brand New Song')).not.toBeNull();
    expect(screen.queryByText('Aichi Song')).toBeNull();

    await user.click(screen.getByRole('tab', { name: /愛知公演/ }));

    expect(screen.getByText('Aichi Song')).not.toBeNull();
    expect(screen.queryByText('Brand New Song')).toBeNull();
  });

  it('scopes a remark to the leg it belongs to', async () => {
    const user = userEvent.setup();
    renderTour();

    // Day.1 has no note; the note belongs to Day.2.
    expect(screen.queryByText(/鈴木愛奈/)).toBeNull();

    await user.click(screen.getByRole('tab', { name: /Day\.2/ }));

    expect(screen.getByText('鈴木愛奈さんは怪我のためトークパートのみ出演')).not.toBeNull();
  });

  it('keeps the untruncated name and venue available as a tab tooltip', () => {
    renderTour();

    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('title'))).toEqual([
      '石川公演 (Day.1) — Ishikawa Hall',
      '石川公演 (Day.2) — Ishikawa Hall',
      '愛知公演 (Day.1) — Aichi Hall'
    ]);
  });

  it('shows no date-and-venue heading under the strip', () => {
    renderTour();

    // The tab already carries the name and venue; a heading repeating it read as clutter.
    expect(screen.queryByText(/·/)).toBeNull();
  });
});
