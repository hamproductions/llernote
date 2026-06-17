import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { FaTableCellsLarge, FaTableList } from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { DataTable } from '~/components/ui/data-table';
import { Pagination } from '~/components/ui/pagination';
import { Text } from '~/components/ui/text';
import { IconButton } from '~/components/ui/icon-button';
import { NativeSelect } from '~/components/events/NativeSelect';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { SongThumb } from '~/components/songs/SongThumb';
import {
  CostumeFiltersBar,
  EMPTY_COSTUME_FILTERS,
  type CostumeFilters
} from '~/components/costumes/CostumeFiltersBar';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import {
  useArtistById,
  usePerformanceById,
  useSetlists,
  useSongById,
  useSongByName
} from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import { useColumnCount } from '~/hooks/useColumnCount';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import {
  costumeDisplayName,
  costumeNameOverrideEn,
  getCostumeSummaries,
  type CostumeSummary,
  type SongPerformanceStat
} from '~/utils/costumes';
import { tallyAllSongPerformances } from '~/utils/song-tally';
import { foldKana } from '~/utils/event-filter';
import { localizedName } from '~/utils/names';
import { songMatchesCategory, SONG_CATEGORIES, type SongCategory } from '~/utils/song-filter';
import { hasSongThumb } from '~/utils/song-thumbs';

const PAGE_SIZE = 48;
type SortKey = 'lives' | 'witnessed' | 'songs' | 'latest' | 'first' | 'name';

const CostumeDetailDialog = lazy(() =>
  import('~/components/costumes/CostumeDetailDialog').then((module) => ({
    default: module.CostumeDetailDialog
  }))
);

export default function Page() {
  const { t, i18n } = useTranslation();
  const performanceById = usePerformanceById();
  const songById = useSongById();
  const songByName = useSongByName();
  const artistById = useArtistById();
  const setlists = useSetlists();
  const { records } = useAttendance();
  const [filters, setFilters] = useState<CostumeFilters>(EMPTY_COSTUME_FILTERS);
  const [sort, setSort] = useState<SortKey>('lives');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CostumeSummary>();
  const [tableSorting, setTableSorting] = useState<SortingState>([{ id: 'lives', desc: true }]);
  const columns = useColumnCount();
  const [view, setView] = useLocalStorage<'cards' | 'table'>('llernote-costumes-view', 'cards');
  const effectiveView = columns === 1 ? 'cards' : view;

  const updateFilters = (next: CostumeFilters) => {
    setFilters(next);
    setPage(1);
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setFilters((prev) => ({ ...prev, search: q }));
  }, []);

  const attendedIds = useMemo(
    () =>
      new Set(
        records
          .filter((record) => record.status === 'attended' && !record.deleted)
          .map((record) => record.performanceId)
      ),
    [records]
  );

  // Per-song reach: distinct performances (rate denominator) and distinct events
  // (eventId, falling back to tour name) used as the signature-song floor.
  const songStats = useMemo(() => {
    const map = new Map<string, SongPerformanceStat>();
    for (const entry of tallyAllSongPerformances(performanceById, setlists)) {
      const events = new Set(entry.performances.map((p) => p.eventId ?? p.tourName));
      map.set(entry.songId, { performances: entry.performances.length, events: events.size });
    }
    return map;
  }, [performanceById, setlists]);

  const costumes = useMemo(
    () => getCostumeSummaries(performanceById, attendedIds, songStats),
    [performanceById, attendedIds, songStats]
  );

  // Classify each costume by the artist types (group / unit / solo / others) of
  // the songs it was worn for — a costume can span several types.
  const costumeCategories = useMemo(() => {
    const map = new Map<string, Set<SongCategory>>();
    for (const costume of costumes) {
      const cats = new Set<SongCategory>();
      for (const songId of costume.songIds) {
        const song = songById.get(songId);
        if (!song) continue;
        for (const category of SONG_CATEGORIES) {
          if (!cats.has(category) && songMatchesCategory(song, category, artistById)) {
            cats.add(category);
          }
        }
      }
      map.set(costume.id, cats);
    }
    return map;
  }, [costumes, songById, artistById]);

  // Precompute a search haystack (costume name + every song it was worn for).
  const searchText = useMemo(() => {
    const map = new Map<string, string>();
    for (const costume of costumes) {
      const songNames = costume.songIds.map((id) => {
        const song = songById.get(id);
        return song ? `${song.name} ${song.englishName ?? ''}` : '';
      });
      map.set(
        costume.id,
        foldKana([costume.name, costumeNameOverrideEn(costume.id) ?? '', ...songNames].join(' '))
      );
    }
    return map;
  }, [costumes, songById]);

  const filtered = useMemo(() => {
    const q = foldKana(filters.search.trim());
    const list = costumes.filter((costume) => {
      if (
        filters.seriesIds.length > 0 &&
        !costume.seriesIds.some((id) => filters.seriesIds.includes(id))
      ) {
        return false;
      }
      if (filters.categories.length > 0) {
        const cats = costumeCategories.get(costume.id);
        if (!cats || !filters.categories.some((category) => cats.has(category))) return false;
      }
      if (filters.witnessed === 'witnessed' && costume.attendedCount === 0) return false;
      if (filters.witnessed === 'unwitnessed' && costume.attendedCount > 0) return false;
      if (!q) return true;
      return (searchText.get(costume.id) ?? '').includes(q);
    });
    const byName = (a: CostumeSummary, b: CostumeSummary) => a.name.localeCompare(b.name, 'ja');
    if (sort === 'witnessed') {
      list.sort((a, b) => b.attendedCount - a.attendedCount || b.liveCount - a.liveCount);
    } else if (sort === 'songs') {
      list.sort((a, b) => b.uniqueSongCount - a.uniqueSongCount || b.liveCount - a.liveCount);
    } else if (sort === 'latest') {
      list.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
    } else if (sort === 'first') {
      list.sort((a, b) => a.firstDate.localeCompare(b.firstDate));
    } else if (sort === 'name') {
      list.sort(byName);
    } else {
      list.sort((a, b) => b.liveCount - a.liveCount || byName(a, b));
    }
    return list;
  }, [costumes, filters, sort, searchText, costumeCategories]);

  const witnessedCount = costumes.filter((costume) => costume.attendedCount > 0).length;
  const percent = costumes.length ? Math.round((witnessedCount / costumes.length) * 100) : 0;
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const songName = (songId?: string) => {
    if (!songId) return undefined;
    const song = songById.get(songId);
    return song ? localizedName(i18n.language, song.name, song.englishName) : undefined;
  };

  const costumeName = (costume: CostumeSummary) =>
    costumeDisplayName(costume, i18n.language, songByName);

  // The song most tied to the costume by rate (worn for the highest share of its
  // own performances), so a song doesn't lead just because it's performed a lot.
  const signatureInfo = (costume: CostumeSummary) => {
    const id = costume.topSongByRateId ?? costume.topSongId;
    const name = songName(id);
    if (!name) return undefined;
    const stat = costume.songs.find((song) => song.songId === id);
    const pct = stat && stat.total > 0 ? Math.round(stat.rate * 100) : undefined;
    return { name, pct };
  };

  const tableColumns = useMemo<ColumnDef<CostumeSummary, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('costumes.col_costume'),
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, 'ja'),
        cell: ({ row }) => (
          <HStack gap="2" minW="0">
            {row.original.imageSongId && hasSongThumb(row.original.imageSongId) && (
              <SongThumb songId={row.original.imageSongId} />
            )}
            <Stack gap="0.5" minW="0">
              <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                {costumeName(row.original)}
              </Text>
              <Text color="fg.muted" fontSize="2xs" fontVariantNumeric="tabular-nums">
                {row.original.firstDate} – {row.original.lastDate}
              </Text>
            </Stack>
          </HStack>
        )
      },
      {
        id: 'lives',
        accessorKey: 'liveCount',
        header: t('costumes.col_lives'),
        sortDescFirst: true,
        cell: ({ row }) => (
          <Text fontSize="sm" fontVariantNumeric="tabular-nums">
            {row.original.liveCount}
          </Text>
        ),
        meta: { textAlign: 'right', width: '20' }
      },
      {
        id: 'songs',
        accessorKey: 'uniqueSongCount',
        header: t('costumes.col_songs'),
        sortDescFirst: true,
        cell: ({ row }) => (
          <Text fontSize="sm" fontVariantNumeric="tabular-nums">
            {row.original.uniqueSongCount}
          </Text>
        ),
        meta: { textAlign: 'right', width: '20' }
      },
      {
        id: 'witnessed',
        accessorKey: 'attendedCount',
        header: t('costumes.col_witnessed'),
        sortDescFirst: true,
        cell: ({ row }) => (
          <Text
            color={row.original.attendedCount > 0 ? 'accent.default' : 'fg.muted'}
            fontSize="sm"
            fontWeight={row.original.attendedCount > 0 ? 'semibold' : undefined}
            fontVariantNumeric="tabular-nums"
          >
            {row.original.attendedCount}
          </Text>
        ),
        meta: { textAlign: 'right', width: '20' }
      }
    ],
    // oxlint-disable-next-line exhaustive-deps
    [t, i18n.language]
  );

  return (
    <>
      <Metadata title={`${t('costumes.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <HStack justifyContent="space-between" alignItems="baseline" flexWrap="wrap">
          <HStack gap="3" alignItems="center">
            <SectionHeading size="2xl">{t('costumes.title')}</SectionHeading>
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
              {t('costumes.results_count', { count: filtered.length })}
            </Text>
          </HStack>
          {effectiveView !== 'table' && (
            <NativeSelect
              aria-label={t('costumes.sort')}
              value={sort}
              options={[
                { value: 'lives', label: t('costumes.sort_lives') },
                { value: 'witnessed', label: t('costumes.sort_witnessed') },
                { value: 'songs', label: t('costumes.sort_songs') },
                { value: 'latest', label: t('costumes.sort_latest') },
                { value: 'first', label: t('costumes.sort_first') },
                { value: 'name', label: t('costumes.sort_name') }
              ]}
              onChange={(value) => setSort(value as SortKey)}
            />
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
          <StatTile label={t('costumes.total')} value={costumes.length} />
          <StatTile label={t('costumes.witnessed')} value={witnessedCount} />
          <StatTile label={t('costumes.coverage')} value={`${percent}%`} />
        </Grid>

        <CostumeFiltersBar filters={filters} onChange={updateFilters} />

        {effectiveView === 'table' ? (
          <DataTable
            data={filtered}
            sorting={tableSorting}
            onSortingChange={setTableSorting}
            pageSize={PAGE_SIZE}
            onRowClick={(costume) => setSelected(costume)}
            minW="2xl"
            columns={tableColumns}
            page={page}
          />
        ) : (
          <Grid
            gap="3"
            gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }}
          >
            {pageItems.map((costume) => {
              const signature = signatureInfo(costume);
              const witnessed = costume.attendedCount > 0;
              return (
                <Card.Root
                  key={costume.id}
                  onClick={() => setSelected(costume)}
                  cursor="pointer"
                  borderColor={witnessed ? 'accent.7' : undefined}
                  bgColor={witnessed ? 'accent.a2' : undefined}
                  transition="colors"
                  _hover={{ borderColor: 'accent.8' }}
                >
                  <Card.Body gap="3" p="4">
                    <HStack gap="3" alignItems="flex-start" minW="0">
                      {costume.imageSongId && hasSongThumb(costume.imageSongId) && (
                        <SongThumb songId={costume.imageSongId} large dim={!witnessed} />
                      )}
                      <Stack gap="1" minW="0">
                        <Text fontWeight="bold" lineHeight="1.3" lineClamp={2}>
                          {costumeName(costume)}
                        </Text>
                        <Text color="fg.muted" fontSize="2xs" fontVariantNumeric="tabular-nums">
                          {costume.firstDate} – {costume.lastDate}
                        </Text>
                        <Wrap gap="1">
                          {costume.seriesIds.slice(0, 2).map((id) => (
                            <SeriesBadge key={id} seriesId={id} />
                          ))}
                        </Wrap>
                      </Stack>
                    </HStack>

                    <HStack gap="2" flexWrap="wrap">
                      <Badge variant="subtle">
                        {t('costumes.lives_count', { count: costume.liveCount })}
                      </Badge>
                      <Badge variant="outline">
                        {t('costumes.songs_count', { count: costume.uniqueSongCount })}
                      </Badge>
                      {witnessed && (
                        <Badge variant="solid">
                          {t('costumes.witnessed_count', { count: costume.attendedCount })}
                        </Badge>
                      )}
                    </HStack>

                    {signature && (
                      <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                        {t('costumes.signature_song')}: {signature.name}
                        {signature.pct != null && (
                          <Text
                            as="span"
                            title={t('costumes.signature_share_title', {
                              song: signature.name,
                              pct: signature.pct
                            })}
                            color="accent.default"
                            fontWeight="medium"
                          >
                            {` · ${signature.pct}%`}
                          </Text>
                        )}
                      </Text>
                    )}
                  </Card.Body>
                </Card.Root>
              );
            })}
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

      {selected && (
        <Suspense fallback={null}>
          <CostumeDetailDialog
            costume={selected}
            open={selected !== undefined}
            onClose={() => setSelected(undefined)}
          />
        </Suspense>
      )}
    </>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
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
