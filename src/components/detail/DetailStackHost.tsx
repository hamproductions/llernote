import { useMemo } from 'react';
import { SongDetailDialog } from '~/components/songs/SongDetailDialog';
import { EventDetailDialog } from '~/components/events/EventDetailDialog';
import { VenueDetailDialog } from '~/components/venues/VenueDetailDialog';
import { usePerformanceById, usePerformances, useVenueById } from '~/hooks/useData';
import { useSongById } from '~/hooks/useSongData';
import { useSetlists } from '~/hooks/useSetlists';
import { useAttendance } from '~/hooks/useAttendance';
import { getSongDebutPerformance, getSongFirstWitnessPerformance } from '~/utils/setlist-insights';
import { buildVenueSummaries } from '~/utils/venues';
import type { Performance } from '~/types';

type Item = { kind: 'song' | 'event' | 'venue'; id: string };

export default function DetailStackHost({
  item,
  onBack,
  onClose,
  openSong,
  openEvent,
  replaceEvent
}: {
  item: Item;
  onBack?: () => void;
  onClose: () => void;
  openSong: (id: string) => void;
  openEvent: (id: string) => void;
  replaceEvent: (id: string) => void;
}) {
  if (item.kind === 'song')
    return <SongHost id={item.id} onBack={onBack} onClose={onClose} onOpenEvent={openEvent} />;
  if (item.kind === 'venue')
    return <VenueHost id={item.id} onBack={onBack} onClose={onClose} onOpenEvent={openEvent} />;
  return (
    <EventHost
      id={item.id}
      onBack={onBack}
      onClose={onClose}
      onOpenSong={openSong}
      onNavigate={replaceEvent}
    />
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
