import { useMemo } from 'react';
import { SongDetailDialog } from '~/components/songs/SongDetailDialog';
import { EventDetailDialog } from '~/components/events/EventDetailDialog';
import { VenueDetailDialog } from '~/components/venues/VenueDetailDialog';
import { CostumeDetailDialog } from '~/components/costumes/CostumeDetailDialog';
import { useVenueById } from '~/hooks/useData';
import { performanceById as allPerformanceById, sortedPerformances } from '~/data/core';
import { useSongById } from '~/hooks/useSongData';
import { useAllSetlists } from '~/hooks/useSetlists';
import { useAttendance } from '~/hooks/useAttendance';
import { getSongDebutPerformance, getSongFirstWitnessPerformance } from '~/utils/setlist-insights';
import { isWatched, isWitnessed, partitionAttendance } from '~/utils/attendance/witness';
import { buildVenueSummaries } from '~/utils/venues';
import { getCostumeSummaries } from '~/utils/costumes';
import type { Performance } from '~/types';

type Item = { kind: 'song' | 'event' | 'venue' | 'costume'; id: string };

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
  if (item.kind === 'costume')
    return <CostumeHost id={item.id} onBack={onBack} onClose={onClose} />;
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
  const performance = allPerformanceById.get(id);
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
  const setlists = useAllSetlists();
  const { records } = useAttendance();
  const data = useMemo(() => {
    const song = songById.get(id);
    const has = (pid: string) =>
      setlists[pid]?.items.some((it) => it.type === 'song' && it.songId === id) ?? false;
    const performedAt = sortedPerformances.filter((p) => has(p.id));
    const heardAt = records
      .map((r) => allPerformanceById.get(r.performanceId))
      .filter((p, i): p is Performance => isWitnessed(records[i], p) && has(p!.id));
    const watchedAt = records
      .map((r) => allPerformanceById.get(r.performanceId))
      .filter((p, i): p is Performance => isWatched(records[i], p) && has(p!.id));
    return {
      song,
      heardAt,
      watchedAt,
      performedAt,
      debutPerformance: getSongDebutPerformance(id, allPerformanceById, setlists),
      firstWitnessPerformance: getSongFirstWitnessPerformance(
        id,
        records,
        allPerformanceById,
        setlists
      ),
      performanceCount: performedAt.length
    };
  }, [id, songById, setlists, records]);
  if (!data.song) return null;
  return (
    <SongDetailDialog
      song={data.song}
      heardAt={data.heardAt}
      watchedAt={data.watchedAt}
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
  const venueById = useVenueById();
  const { records } = useAttendance();
  const venue = useMemo(() => {
    const { witnessed, watched } = partitionAttendance(records, allPerformanceById);
    return buildVenueSummaries(sortedPerformances, venueById, witnessed, watched).find(
      (v) => v.id === id
    );
  }, [venueById, records, id]);
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

function CostumeHost({
  id,
  onBack,
  onClose
}: {
  id: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  const { records } = useAttendance();
  const songById = useSongById();
  const costume = useMemo(() => {
    const { witnessed, watched } = partitionAttendance(records, allPerformanceById);
    return getCostumeSummaries(allPerformanceById, witnessed, watched, undefined, songById).find(
      (c) => c.id === id
    );
  }, [records, id, songById]);
  if (!costume) return null;
  return <CostumeDetailDialog costume={costume} open onClose={onClose} onBack={onBack} />;
}
