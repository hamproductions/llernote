import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTableCellsLarge, FaTableList } from 'react-icons/fa6';
import { Center, HStack, Stack } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Pagination } from '~/components/ui/pagination';
import { IconButton } from '~/components/ui/icon-button';
import { TourCard } from '~/components/events/TourCard';
import { EventTable } from '~/components/events/EventTable';
import { EventFiltersBar } from '~/components/events/EventFiltersBar';
import { EventDetailDialog } from '~/components/events/EventDetailDialog';
import { Metadata } from '~/components/layout/Metadata';
import { useArtistById, usePerformances, useSetlists, useSongById } from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { useColumnCount } from '~/hooks/useColumnCount';
import { buildPerformanceCharacterMap } from '~/utils/performance-cast';
import { EMPTY_FILTERS, filterEvents, type EventFilters } from '~/utils/event-filter';
import { groupByTour } from '~/utils/tour';
import type { Performance } from '~/types';

const PAGE_SIZE = 24;

export default function Page() {
  const { t } = useTranslation();
  const performances = usePerformances();
  const setlists = useSetlists();
  const songById = useSongById();
  const artistById = useArtistById();
  const { map } = useAttendance();
  const [filters, setFilters] = useState<EventFilters>(() => {
    if (typeof window === 'undefined') return EMPTY_FILTERS;
    const q = new URLSearchParams(window.location.search).get('q');
    return q ? { ...EMPTY_FILTERS, search: q } : EMPTY_FILTERS;
  });
  const [selected, setSelected] = useState<Performance>();
  const [page, setPage] = useState(1);
  const [view, setView] = useLocalStorage<'cards' | 'table'>('llernote-events-view', 'cards');
  const columns = useColumnCount();

  const performanceCharacters = useMemo(
    () => buildPerformanceCharacterMap(setlists, songById, artistById),
    [setlists, songById, artistById]
  );

  const filtered = useMemo(
    () => filterEvents(performances, filters, map, performanceCharacters),
    [performances, filters, map, performanceCharacters]
  );

  const tours = useMemo(() => groupByTour(filtered), [filtered]);

  const totalCount = view === 'table' ? filtered.length : tours.length;
  const pageItems =
    view === 'table'
      ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      : tours.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Metadata title={`${t('events.title')} - LLerNote`} helmet />
      <Stack gap="3">
        <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <HStack gap="3" alignItems="baseline">
            <Heading as="h1" fontSize="2xl">
              {t('events.title')}
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              {t('events.results_count', { count: filtered.length })}
            </Text>
          </HStack>
          <HStack gap="1">
            <IconButton
              aria-label="Card view"
              variant={view === 'cards' ? 'subtle' : 'ghost'}
              size="sm"
              onClick={() => setView('cards')}
            >
              <FaTableCellsLarge />
            </IconButton>
            <IconButton
              aria-label="Table view"
              variant={view === 'table' ? 'subtle' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
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
        {totalCount === 0 && <Text color="fg.muted">{t('events.no_results')}</Text>}
        {view === 'table' ? (
          <EventTable performances={pageItems as Performance[]} onSelect={setSelected} />
        ) : (
          <HStack gap="3" alignItems="flex-start">
            {Array.from({ length: columns }, (_, col) => (
              <Stack key={col} flex="1" gap="3" minW="0">
                {(pageItems as ReturnType<typeof groupByTour>)
                  .filter((_, i) => i % columns === col)
                  .map((tour) => (
                    <TourCard key={tour.tourName} tour={tour} onSelect={setSelected} />
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
              siblingCount={1}
              onPageChange={(details) => {
                setPage(details.page);
                window.scrollTo({ top: 0 });
              }}
              page={page}
            />
          </Center>
        )}
        <EventDetailDialog
          performance={selected}
          open={selected !== undefined}
          onClose={() => setSelected(undefined)}
        />
      </Stack>
    </>
  );
}
