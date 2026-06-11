import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, HStack, Stack } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { TourCard } from '~/components/events/TourCard';
import { EventFiltersBar } from '~/components/events/EventFiltersBar';
import { EventDetailDialog } from '~/components/events/EventDetailDialog';
import { Metadata } from '~/components/layout/Metadata';
import { useArtistById, usePerformances, useSetlists, useSongById } from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import { buildPerformanceCharacterMap } from '~/utils/performance-cast';
import { EMPTY_FILTERS, filterEvents, type EventFilters } from '~/utils/event-filter';
import { groupByTour } from '~/utils/tour';
import type { Performance } from '~/types';

const PAGE_SIZE = 30;

export default function Page() {
  const { t } = useTranslation();
  const performances = usePerformances();
  const setlists = useSetlists();
  const songById = useSongById();
  const artistById = useArtistById();
  const { map } = useAttendance();
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Performance>();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const performanceCharacters = useMemo(
    () => buildPerformanceCharacterMap(setlists, songById, artistById),
    [setlists, songById, artistById]
  );

  const tours = useMemo(
    () => groupByTour(filterEvents(performances, filters, map, performanceCharacters)),
    [performances, filters, map, performanceCharacters]
  );

  const visible = tours.slice(0, limit);

  return (
    <>
      <Metadata title={`${t('events.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <HStack justifyContent="space-between" alignItems="baseline" flexWrap="wrap">
          <Heading as="h1" fontSize="2xl">
            {t('events.title')}
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            {t('events.results_count', { count: tours.length })}
          </Text>
        </HStack>
        <EventFiltersBar
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setLimit(PAGE_SIZE);
          }}
        />
        {tours.length === 0 && <Text color="fg.muted">{t('events.no_results')}</Text>}
        <Grid
          gap="3"
          alignItems="start"
          gridTemplateColumns={{ base: '1fr', xl: 'repeat(2, 1fr)' }}
        >
          {visible.map((tour) => (
            <TourCard key={tour.tourName} tour={tour} onSelect={setSelected} />
          ))}
        </Grid>
        {tours.length > limit && (
          <Button variant="outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            {t('common.show_more')}
          </Button>
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
