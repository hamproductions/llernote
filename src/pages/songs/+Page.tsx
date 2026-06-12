import { lazy, Suspense, useMemo, useState } from 'react';
import { FaTableCellsLarge, FaTableList } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Pagination } from '~/components/ui/pagination';
import { IconButton } from '~/components/ui/icon-button';
import { Skeleton } from '~/components/ui/skeleton';
import { SongCard } from '~/components/songs/SongCard';
import { SongTable } from '~/components/songs/SongTable';
import { SongFiltersBar } from '~/components/songs/SongFiltersBar';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useAttendance } from '~/hooks/useAttendance';
import { useArtists, usePerformances, useSetlists, useSongs } from '~/hooks/useData';
import { useDerivedDataWorker } from '~/hooks/useDerivedDataWorker';
import { useColumnCount } from '~/hooks/useColumnCount';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { EMPTY_SONG_FILTERS, type SongFilters } from '~/utils/song-filter';
import type { Performance, Song } from '~/types';

const PAGE_SIZE = 48;

const SongDetailDialog = lazy(() =>
  import('~/components/songs/SongDetailDialog').then((module) => ({
    default: module.SongDetailDialog
  }))
);
const EventDetailDialog = lazy(() =>
  import('~/components/events/EventDetailDialog').then((module) => ({
    default: module.EventDetailDialog
  }))
);

export default function Page() {
  const { t } = useTranslation();
  const { records } = useAttendance();
  const songs = useSongs();
  const artists = useArtists();
  const performances = usePerformances();
  const setlists = useSetlists();
  const [filters, setFilters] = useState<SongFilters>(EMPTY_SONG_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Song>();
  const [selectedEvent, setSelectedEvent] = useState<Performance>();
  const columns = useColumnCount();
  const [view, setView] = useLocalStorage<'cards' | 'table'>('llernote-songs-view', 'cards');
  const effectiveView = columns === 1 ? 'cards' : view;

  const derived = useDerivedDataWorker(
    'songs',
    { records, performances, setlists, songs, artists, filters },
    [records, performances, setlists, songs, artists, filters]
  );
  const tally = useMemo(() => derived.result?.tally ?? [], [derived.result]);
  const tallyById = useMemo(() => new Map(tally.map((e) => [e.songId, e])), [tally]);
  const allPerformanceTally = useMemo(
    () => derived.result?.allPerformanceTally ?? [],
    [derived.result]
  );
  const allPerformanceTallyById = useMemo(
    () => new Map(allPerformanceTally.map((e) => [e.songId, e])),
    [allPerformanceTally]
  );
  const filtered = derived.result?.filtered ?? [];
  const scopeTotal = derived.result?.scopeTotal ?? songs.length;
  const heardInScope = derived.result?.heardInScope ?? 0;
  const percent = derived.result?.percent ?? 0;

  const heardCount = (id: string) => tallyById.get(id)?.count ?? 0;
  const performedCount = (id: string) => allPerformanceTallyById.get(id)?.count ?? 0;
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedHeardAt = selected ? (tallyById.get(selected.id)?.performances ?? []) : [];
  const selectedPerformedAt = selected
    ? (allPerformanceTallyById.get(selected.id)?.performances ?? [])
    : [];
  const selectedPerformanceCount = selected
    ? (allPerformanceTallyById.get(selected.id)?.count ?? 0)
    : 0;

  return (
    <>
      <Metadata title={`${t('songs.title')} - LLerNote`} helmet />
      <Stack gap="3">
        <HStack justifyContent="space-between" alignItems="baseline" flexWrap="wrap">
          <HStack gap="3" alignItems="center">
            <SectionHeading size="2xl">{t('songs.title')}</SectionHeading>
            <HStack hideBelow="md" gap="1">
              <IconButton
                aria-label={t('common.card_view')}
                variant={effectiveView === 'cards' ? 'subtle' : 'ghost'}
                size="sm"
                onClick={() => setView('cards')}
              >
                <FaTableCellsLarge />
              </IconButton>
              <IconButton
                aria-label={t('common.table_view')}
                variant={effectiveView === 'table' ? 'subtle' : 'ghost'}
                size="sm"
                onClick={() => setView('table')}
              >
                <FaTableList />
              </IconButton>
            </HStack>
          </HStack>
          <Text color="fg.muted" fontSize="sm">
            {t('songs.progress', { heard: heardInScope, total: scopeTotal, percent })}
          </Text>
        </HStack>
        <Box borderRadius="full" w="full" h="2" bgColor="bg.subtle" overflow="hidden">
          <Box
            style={{ width: `${percent}%` }}
            borderRadius="full"
            h="full"
            bgColor="accent.default"
          />
        </Box>
        <SongFiltersBar
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
        <Text color="fg.muted" fontSize="sm">
          {t('songs.results_count', { count: filtered.length })}
        </Text>
        {derived.pending ? (
          <Grid
            gap="2"
            gridTemplateColumns={{
              base: '1fr',
              md: 'repeat(2, 1fr)',
              xl: 'repeat(3, 1fr)',
              '2xl': 'repeat(4, 1fr)'
            }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} borderRadius="l2" h="18" />
            ))}
          </Grid>
        ) : filtered.length === 0 ? (
          <Text color="fg.muted">{t('songs.no_results')}</Text>
        ) : effectiveView === 'table' ? (
          <SongTable
            songs={filtered}
            pageSize={PAGE_SIZE}
            heardCount={heardCount}
            performedCount={performedCount}
            onSelect={setSelected}
            page={page}
          />
        ) : (
          <Grid
            gap="2"
            gridTemplateColumns={{
              base: '1fr',
              md: 'repeat(2, 1fr)',
              xl: 'repeat(3, 1fr)',
              '2xl': 'repeat(4, 1fr)'
            }}
          >
            {pageItems.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                heardCount={heardCount(song.id)}
                performedCount={performedCount(song.id)}
                onClick={() => setSelected(song)}
              />
            ))}
          </Grid>
        )}
        {filtered.length > PAGE_SIZE && (
          <Center>
            <Pagination
              count={filtered.length}
              pageSize={PAGE_SIZE}
              siblingCount={columns === 1 ? 0 : 1}
              onPageChange={(details) => {
                setPage(details.page);
                window.scrollTo({ top: 0 });
              }}
              page={page}
            />
          </Center>
        )}
        {selected && (
          <Suspense fallback={null}>
            <SongDetailDialog
              song={selected}
              heardAt={selectedHeardAt}
              performedAt={selectedPerformedAt}
              performanceCount={selectedPerformanceCount}
              open={selected !== undefined}
              onClose={() => setSelected(undefined)}
              onSelectEvent={(p) => {
                setSelected(undefined);
                setSelectedEvent(p);
              }}
            />
          </Suspense>
        )}
        {selectedEvent && (
          <Suspense fallback={null}>
            <EventDetailDialog
              performance={selectedEvent}
              open={selectedEvent !== undefined}
              onClose={() => setSelectedEvent(undefined)}
            />
          </Suspense>
        )}
      </Stack>
    </>
  );
}
