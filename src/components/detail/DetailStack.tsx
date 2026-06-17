import { createContext, lazy, Suspense, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  usePerformanceById,
  usePerformances,
  useSetlists,
  useSongById,
  useVenueById
} from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import { getSongDebutPerformance, getSongFirstWitnessPerformance } from '~/utils/setlist-insights';
import { buildVenueSummaries } from '~/utils/venues';
import type { Performance } from '~/types';

const SongDetailDialog = lazy(() =>
  import('~/components/songs/SongDetailDialog').then((m) => ({ default: m.SongDetailDialog }))
);
const EventDetailDialog = lazy(() =>
  import('~/components/events/EventDetailDialog').then((m) => ({ default: m.EventDetailDialog }))
);
const VenueDetailDialog = lazy(() =>
  import('~/components/venues/VenueDetailDialog').then((m) => ({ default: m.VenueDetailDialog }))
);

type Kind = 'song' | 'event' | 'venue';
type Item = { kind: Kind; id: string };
type DetailApi = {
  openSong: (id: string) => void;
  openEvent: (id: string) => void;
  openVenue: (id: string) => void;
};

const Ctx = createContext<DetailApi | null>(null);
const NOOP: DetailApi = { openSong() {}, openEvent() {}, openVenue() {} };
export const useDetail = () => useContext(Ctx) ?? NOOP;

const MAX_DEPTH = 30;

export function DetailStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Item[]>([]);
  const api = useMemo<DetailApi>(() => {
    const push = (it: Item) =>
      setStack((s) => {
        const top = s[s.length - 1];
        if (top && top.kind === it.kind && top.id === it.id) return s;
        return s.length >= MAX_DEPTH ? s : [...s, it];
      });
    return {
      openSong: (id) => push({ kind: 'song', id }),
      openEvent: (id) => push({ kind: 'event', id }),
      openVenue: (id) => push({ kind: 'venue', id })
    };
  }, []);
  const back = () => setStack((s) => s.slice(0, -1));
  const close = () => setStack([]);
  const replaceEvent = (id: string) => setStack((s) => [...s.slice(0, -1), { kind: 'event', id }]);
  const top = stack[stack.length - 1];
  const onBack = stack.length > 1 ? back : undefined;

  return (
    <Ctx.Provider value={api}>
      {children}
      {top && (
        <Suspense fallback={null}>
          {top.kind === 'song' ? (
            <SongHost id={top.id} onBack={onBack} onClose={close} onOpenEvent={api.openEvent} />
          ) : top.kind === 'venue' ? (
            <VenueHost id={top.id} onBack={onBack} onClose={close} onOpenEvent={api.openEvent} />
          ) : (
            <EventHost
              id={top.id}
              onBack={onBack}
              onClose={close}
              onOpenSong={api.openSong}
              onNavigate={replaceEvent}
            />
          )}
        </Suspense>
      )}
    </Ctx.Provider>
  );
}

function EventHost({
  id,
  onBack,
  onClose,
  onOpenSong,
  onNavigate
}: {
  id: string;
  onBack?: () => void;
  onClose: () => void;
  onOpenSong: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const performance = usePerformanceById().get(id);
  if (!performance) return null;
  return (
    <EventDetailDialog
      performance={performance}
      open
      onClose={onClose}
      onBack={onBack}
      onOpenSong={onOpenSong}
      onNavigate={(p) => onNavigate(p.id)}
    />
  );
}

function SongHost({
  id,
  onBack,
  onClose,
  onOpenEvent
}: {
  id: string;
  onBack?: () => void;
  onClose: () => void;
  onOpenEvent: (id: string) => void;
}) {
  const songById = useSongById();
  const performances = usePerformances();
  const performanceById = usePerformanceById();
  const setlists = useSetlists();
  const { records } = useAttendance();
  const data = useMemo(() => {
    const song = songById.get(id);
    const has = (pid: string) =>
      setlists[pid]?.items.some((it) => it.type === 'song' && it.songId === id) ?? false;
    const performedAt = performances.filter((p) => has(p.id));
    const heardAt = records
      .filter((r) => r.status === 'attended')
      .map((r) => performanceById.get(r.performanceId))
      .filter((p): p is Performance => Boolean(p) && has((p as Performance).id));
    return {
      song,
      heardAt,
      performedAt,
      debutPerformance: getSongDebutPerformance(id, performanceById, setlists),
      firstWitnessPerformance: getSongFirstWitnessPerformance(
        id,
        records,
        performanceById,
        setlists
      ),
      performanceCount: performedAt.length
    };
  }, [id, songById, performances, performanceById, setlists, records]);
  if (!data.song) return null;
  return (
    <SongDetailDialog
      song={data.song}
      heardAt={data.heardAt}
      performedAt={data.performedAt}
      debutPerformance={data.debutPerformance}
      firstWitnessPerformance={data.firstWitnessPerformance}
      performanceCount={data.performanceCount}
      open
      onClose={onClose}
      onBack={onBack}
      onSelectEvent={(p) => onOpenEvent(p.id)}
    />
  );
}

function VenueHost({
  id,
  onBack,
  onClose,
  onOpenEvent
}: {
  id: string;
  onBack?: () => void;
  onClose: () => void;
  onOpenEvent: (id: string) => void;
}) {
  const performances = usePerformances();
  const venueById = useVenueById();
  const { records } = useAttendance();
  const venue = useMemo(() => {
    const attendedIds = new Set(
      records.filter((r) => r.status === 'attended').map((r) => r.performanceId)
    );
    return buildVenueSummaries(performances, venueById, attendedIds).find((v) => v.id === id);
  }, [performances, venueById, records, id]);
  if (!venue) return null;
  return (
    <VenueDetailDialog
      venue={venue}
      open
      onClose={onClose}
      onBack={onBack}
      onOpenEvent={onOpenEvent}
    />
  );
}
