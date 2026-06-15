import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTableCellsLarge, FaTableList } from 'react-icons/fa6';
import { Center, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Pagination } from '~/components/ui/pagination';
import { IconButton } from '~/components/ui/icon-button';
import { Skeleton } from '~/components/ui/skeleton';
import { TourCard } from '~/components/events/TourCard';
import { EventTable } from '~/components/events/EventTable';
import { EventFiltersBar } from '~/components/events/EventFiltersBar';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useArtists, usePerformances, useSetlists, useSongs } from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { useColumnCount } from '~/hooks/useColumnCount';
import { useDerivedDataWorker } from '~/hooks/useDerivedDataWorker';
import { EMPTY_FILTERS, type EventFilters } from '~/utils/event-filter';
import type { Performance } from '~/types';

const PAGE_SIZE = 24;
const EventDetailDialog = lazy(() =>
  import('~/components/events/EventDetailDialog').then((module) => ({
    default: module.EventDetailDialog
  }))
);

export default function Page() {
  const { t } = useTranslation();
  const performances = usePerformances();
  const setlists = useSetlists();
  const songs = useSongs();
  const artists = useArtists();
  const { map } = useAttendance();
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setFilters((prev) => ({ ...prev, search: q }));
  }, []);
  const [selected, setSelected] = useState<Performance>();
  const [page, setPage] = useState(1);
  const [view, setView] = useLocalStorage<'cards' | 'table'>('llernote-events-view', 'cards');
  const columns = useColumnCount();
  const derived = useDerivedDataWorker(
    'events',
    { performances, filters, attendanceMap: map, setlists, songs, artists },
    [performances, filters, map, setlists, songs, artists]
  );
  const filtered = derived.result?.filtered ?? [];
  const tours = derived.result?.tours ?? [];

  const effectiveView = columns === 1 ? 'cards' : view;
  const totalCount = effectiveView === 'table' ? filtered.length : tours.length;
  const pageTours = tours.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Metadata title={`${t('events.title')} - LLerNote`} helmet />
      <Stack gap="3">
        <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <HStack gap="3" alignItems="baseline">
            <SectionHeading size="2xl">{t('events.title')}</SectionHeading>
            <Text color="fg.muted" fontSize="sm">
              {t('events.results_count', { count: filtered.length })}
            </Text>
          </HStack>
          <HStack hideBelow="md" gap="1">
            <IconButton
              aria-label={t('common.card_view')}
              variant={view === 'cards' ? 'subtle' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('cards');
                setPage(1);
              }}
            >
              <FaTableCellsLarge />
            </IconButton>
            <IconButton
              aria-label={t('common.table_view')}
              variant={view === 'table' ? 'subtle' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('table');
                setPage(1);
              }}
            >
              <FaTableList />
            </IconButton>
          </HStack>
        </HStack>
        <EventFiltersBar
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
        {derived.loading ? (
          <Stack gap="3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} borderRadius="l2" h="24" />
            ))}
          </Stack>
        ) : totalCount === 0 ? (
          <Text color="fg.muted">{t('events.no_results')}</Text>
        ) : effectiveView === 'table' ? (
          <EventTable
            performances={filtered}
            pageSize={PAGE_SIZE}
            onSelect={setSelected}
            page={page}
          />
        ) : (
          <HStack gap="3" alignItems="flex-start">
            {Array.from({ length: columns }, (_, col) => (
              <Stack key={col} flex="1" gap="3" minW="0">
                {pageTours
                  .filter((_, i) => i % columns === col)
                  .map((tour) => (
                    <TourCard
                      key={`${tour.tourName}|${tour.startDate}`}
                      tour={tour}
                      onSelect={setSelected}
                    />
                  ))}
              </Stack>
            ))}
          </HStack>
        )}
        {totalCount > PAGE_SIZE && (
          <Center>
            <Pagination
              count={totalCount}
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
            <EventDetailDialog
              performance={selected}
              open={selected !== undefined}
              onClose={() => setSelected(undefined)}
            />
          </Suspense>
        )}
      </Stack>
    </>
  );
}
