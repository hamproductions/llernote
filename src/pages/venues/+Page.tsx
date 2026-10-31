import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  FaArrowUpRightFromSquare,
  FaLocationDot,
  FaMagnifyingGlass,
  FaTableCellsLarge,
  FaTableList
} from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { DataTable } from '~/components/ui/data-table';
import { Input } from '~/components/ui/input';
import { Link } from '~/components/ui/link';
import { Pagination } from '~/components/ui/pagination';
import { Text } from '~/components/ui/text';
import { IconButton } from '~/components/ui/icon-button';
import { NativeSelect } from '~/components/events/NativeSelect';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useSeries, useVenueById } from '~/hooks/useData';
import { useAppSettings } from '~/hooks/useAppSettings';
import { performanceById, sortedPerformances } from '~/data/core';
import { useAttendance } from '~/hooks/useAttendance';
import { ScopeTabs } from '~/components/events/ScopeTabs';
import { buildVenueSummaries } from '~/utils/venues';
import { partitionAttendance, scopeMatches } from '~/utils/attendance/witness';
import { foldKana } from '~/utils/event-filter';
import { useColumnCount } from '~/hooks/useColumnCount';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { useDetail } from '~/components/detail/DetailStack';
import type { VenueSummary } from '~/types';

const PAGE_SIZE = 48;
type VisitFilter = '' | 'visited' | 'unvisited';
type SortKey = 'performances' | 'attended' | 'name' | 'first' | 'latest';

export default function Page() {
  const { t } = useTranslation();
  const series = useSeries();
  const venueById = useVenueById();
  const { records } = useAttendance();
  const { scope, setAppSettings } = useAppSettings();
  const [search, setSearch] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [visitFilter, setVisitFilter] = useState<VisitFilter>('');
  const [sort, setSort] = useState<SortKey>('performances');
  const [page, setPage] = useState(1);
  const [selectedVenueId, setSelectedVenueId] = useState<string>();
  const { openVenue } = useDetail();
  const [tableSorting, setTableSorting] = useState<SortingState>([
    { id: 'performances', desc: true }
  ]);
  const columns = useColumnCount();
  const [view, setView] = useLocalStorage<'cards' | 'table'>('llernote-venues-view', 'cards');
  const effectiveView = columns === 1 ? 'cards' : view;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get('q') ?? '');
    const venueParam = params.get('venue') ?? undefined;
    setSelectedVenueId(venueParam);
    if (venueParam) openVenue(venueParam);
  }, []);

  const { witnessed, watched } = useMemo(
    () => partitionAttendance(records, performanceById),
    [records]
  );

  const scopedPerformances = useMemo(
    () => sortedPerformances.filter((performance) => scopeMatches(scope, performance.category)),
    [scope]
  );

  const venues = useMemo(
    () => buildVenueSummaries(scopedPerformances, venueById, witnessed, watched),
    [scopedPerformances, venueById, witnessed, watched]
  );

  const filtered = useMemo(() => {
    const q = foldKana(search.trim());
    const list = venues.filter((venue) => {
      if (selectedVenueId && venue.id !== selectedVenueId) return false;
      if (seriesId && !venue.seriesIds.includes(seriesId)) return false;
      if (visitFilter === 'visited' && venue.attendedCount === 0) return false;
      if (visitFilter === 'unvisited' && venue.attendedCount > 0) return false;
      if (!q) return true;
      const haystack = foldKana(
        [venue.name, venue.location, venue.address, venue.locality, venue.region, venue.country]
          .filter(Boolean)
          .join(' ')
      );
      return haystack.includes(q);
    });
    if (sort === 'attended') {
      list.sort(
        (a, b) => b.attendedCount - a.attendedCount || b.performanceCount - a.performanceCount
      );
    } else if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    } else if (sort === 'first') {
      list.sort((a, b) => a.firstDate.localeCompare(b.firstDate));
    } else if (sort === 'latest') {
      list.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
    } else {
      list.sort(
        (a, b) => b.performanceCount - a.performanceCount || a.name.localeCompare(b.name, 'ja')
      );
    }
    return list;
  }, [venues, search, selectedVenueId, seriesId, visitFilter, sort]);

  const cityStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const venue of venues) {
      const region = venue.region ?? venue.locality;
      if (region) counts.set(region, (counts.get(region) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
      .slice(0, 12);
  }, [venues]);

  const tableColumns = useMemo<ColumnDef<VenueSummary, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('venues.col_venue'),
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, 'ja'),
        cell: ({ row }) => (
          <Stack gap="0.5" minW="0">
            <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
              {row.original.name}
            </Text>
            {row.original.address && (
              <Text color="fg.muted" fontSize="2xs" lineClamp={1}>
                {row.original.address}
              </Text>
            )}
          </Stack>
        )
      },
      {
        id: 'region',
        accessorFn: (venue) => venue.location ?? venue.locality,
        header: t('venues.col_region'),
        sortUndefined: 'last',
        cell: ({ getValue }) => (
          <Text color="fg.muted" fontSize="sm" whiteSpace="nowrap">
            {(getValue() as string | undefined) ?? '—'}
          </Text>
        ),
        meta: { width: '40' }
      },
      {
        id: 'performances',
        accessorKey: 'performanceCount',
        header: t('venues.col_performances'),
        sortDescFirst: true,
        cell: ({ row }) => (
          <Text fontSize="sm" fontVariantNumeric="tabular-nums">
            {row.original.performanceCount}
          </Text>
        ),
        meta: { textAlign: 'right', width: '24' }
      },
      {
        id: 'attended',
        accessorKey: 'attendedCount',
        header: t('venues.col_attended'),
        sortDescFirst: true,
        cell: ({ row }) => (
          <HStack gap="1.5" justifyContent="flex-end" fontVariantNumeric="tabular-nums">
            <Text
              title={t('common.scope_inperson')}
              color={row.original.witnessedCount > 0 ? 'accent.default' : 'fg.subtle'}
              fontSize="sm"
              fontWeight={row.original.witnessedCount > 0 ? 'semibold' : undefined}
            >
              {row.original.witnessedCount}
            </Text>
            <Text color="fg.subtle" fontSize="xs">
              ·
            </Text>
            <Text
              title={t('common.scope_remote')}
              color={row.original.watchedCount > 0 ? 'blue.9' : 'fg.subtle'}
              fontSize="sm"
            >
              {row.original.watchedCount}
            </Text>
          </HStack>
        ),
        meta: { textAlign: 'right', width: '24' }
      }
    ],
    [t]
  );

  const attendedVenueCount = venues.filter((venue) => venue.attendedCount > 0).length;
  const percent = venues.length ? Math.round((attendedVenueCount / venues.length) * 100) : 0;
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Metadata title={`${t('venues.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <HStack justifyContent="space-between" alignItems="baseline" flexWrap="wrap">
          <HStack gap="3" alignItems="center">
            <SectionHeading size="2xl">{t('venues.title')}</SectionHeading>
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
            <Text color="fg.muted" fontSize="sm">
              {t('venues.results_count', { count: filtered.length })}
            </Text>
            <ScopeTabs value={scope} onChange={(s) => setAppSettings({ scope: s })} size="xs" />
          </HStack>
          {selectedVenueId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedVenueId(undefined);
                setPage(1);
              }}
            >
              {t('venues.show_all')}
            </Button>
          )}
        </HStack>

        <Box borderRadius="full" w="full" h="2" bgColor="bg.subtle" overflow="hidden">
          <Box
            style={{ width: `${percent}%` }}
            borderRadius="full"
            h="full"
            bgColor="accent.default"
          />
        </Box>

        <Grid gap="2" gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}>
          <StatTile label={t('venues.total')} value={venues.length} />
          <StatTile label={t('venues.visited')} value={attendedVenueCount} />
          <StatTile label={t('venues.cities')} value={cityStats.length} />
        </Grid>

        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          p="3"
          bgColor="bg.subtle"
        >
          <HStack gap="2" flexWrap="wrap">
            <Box flex="1" minW="48">
              <Input
                size="sm"
                value={search}
                placeholder={t('venues.search_placeholder')}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Box>
            <NativeSelect
              aria-label={t('events.series')}
              value={seriesId}
              placeholder={`${t('events.series')}: ${t('common.all')}`}
              options={series.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(value) => {
                setSeriesId(value);
                setPage(1);
              }}
            />
            <NativeSelect
              aria-label={t('venues.visit_filter')}
              value={visitFilter}
              placeholder={`${t('venues.visit_filter')}: ${t('common.all')}`}
              options={[
                { value: 'visited', label: t('venues.visited') },
                { value: 'unvisited', label: t('venues.unvisited') }
              ]}
              onChange={(value) => {
                setVisitFilter(value as VisitFilter);
                setPage(1);
              }}
            />
            {effectiveView !== 'table' && (
              <NativeSelect
                aria-label={t('venues.sort')}
                value={sort}
                options={[
                  { value: 'performances', label: t('venues.sort_performances') },
                  { value: 'attended', label: t('venues.sort_attended') },
                  { value: 'latest', label: t('venues.sort_latest') },
                  { value: 'first', label: t('venues.sort_first') },
                  { value: 'name', label: t('venues.sort_name') }
                ]}
                onChange={(value) => setSort(value as SortKey)}
              />
            )}
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setSeriesId('');
                setVisitFilter('');
                setSelectedVenueId(undefined);
                setPage(1);
              }}
            >
              {t('common.clear')}
            </Button>
            <Button aria-label={t('common.search')} size="sm">
              <FaMagnifyingGlass />
            </Button>
          </HStack>
        </Box>

        {cityStats.length > 0 && (
          <Wrap gap="2">
            {cityStats.map((city) => (
              <Badge key={city.city} variant="outline">
                {city.city} · {city.count}
              </Badge>
            ))}
          </Wrap>
        )}

        {effectiveView === 'table' ? (
          <DataTable
            data={filtered}
            sorting={tableSorting}
            onSortingChange={setTableSorting}
            pageSize={PAGE_SIZE}
            onRowClick={(venue) => openVenue(venue.id)}
            minW="2xl"
            columns={tableColumns}
            page={page}
          />
        ) : (
          <Grid gap="3" gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}>
            {pageItems.map((venue) => (
              <Card.Root key={venue.id} onClick={() => openVenue(venue.id)} cursor="pointer">
                <Card.Body gap="3" p="4">
                  <HStack gap="3" justifyContent="space-between" alignItems="flex-start">
                    <Stack gap="1" minW="0">
                      <Text fontWeight="bold" lineHeight="1.35">
                        {venue.name}
                      </Text>
                      {venue.location && (
                        <HStack gap="1.5" color="fg.muted" fontSize="sm">
                          <FaLocationDot />
                          <Text>{venue.location}</Text>
                        </HStack>
                      )}
                      {venue.address && (
                        <Text color="fg.muted" fontSize="xs">
                          {venue.address}
                        </Text>
                      )}
                    </Stack>
                    {venue.website && (
                      <Link
                        href={venue.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        color="accent.default"
                      >
                        <FaArrowUpRightFromSquare />
                      </Link>
                    )}
                  </HStack>

                  <HStack gap="2" flexWrap="wrap">
                    <Badge variant="subtle">
                      {t('venues.performance_count', { count: venue.performanceCount })}
                    </Badge>
                    {venue.witnessedCount > 0 && (
                      <Badge variant="solid">
                        {t('venues.witnessed_count', { count: venue.witnessedCount })}
                      </Badge>
                    )}
                    {venue.watchedCount > 0 && (
                      <Badge variant="solid" colorPalette="blue">
                        {t('venues.watched_count', { count: venue.watchedCount })}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {venue.firstDate} - {venue.lastDate}
                    </Badge>
                  </HStack>

                  <Wrap gap="1.5">
                    {venue.seriesIds.map((seriesId) => (
                      <SeriesBadge key={seriesId} seriesId={seriesId} />
                    ))}
                  </Wrap>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        )}

        {filtered.length === 0 && <Text color="fg.muted">{t('common.no_results')}</Text>}
        {filtered.length > PAGE_SIZE && (
          <Center>
            <Pagination
              count={filtered.length}
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
      </Stack>
    </>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Stack
      gap="0"
      borderColor="accent.a5"
      borderRadius="l3"
      borderWidth="1px"
      p="4"
      bgColor="accent.a2"
    >
      <Text
        textStyle="display"
        color="accent.default"
        fontSize="3xl"
        fontWeight="bold"
        lineHeight="1.1"
      >
        {value}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        {label}
      </Text>
    </Stack>
  );
}
