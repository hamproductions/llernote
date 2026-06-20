import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { FaTableCellsLarge, FaTableList } from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { DataTable } from '~/components/ui/data-table';
import { Pagination } from '~/components/ui/pagination';
import { Text } from '~/components/ui/text';
import { IconButton } from '~/components/ui/icon-button';
import { NativeSelect } from '~/components/events/NativeSelect';
import { SongThumb } from '~/components/songs/SongThumb';
import { CostumeCard } from '~/components/costumes/CostumeCard';
import {
  CostumeFiltersBar,
  EMPTY_COSTUME_FILTERS,
  type CostumeFilters
} from '~/components/costumes/CostumeFiltersBar';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useArtistById } from '~/hooks/useData';
import { performanceById } from '~/data/core';
import { ScopeTabs } from '~/components/events/ScopeTabs';
import { useSongById, useSongByName } from '~/hooks/useSongData';
import { useSetlists } from '~/hooks/useSetlists';
import { useAttendance } from '~/hooks/useAttendance';
import { useColumnCount } from '~/hooks/useColumnCount';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { useDetail } from '~/components/detail/DetailStack';
import {
  costumeDisplayName,
  costumeMatchesCategory,
  costumeNameOverrideEn,
  getCostumeSummaries,
  type CostumeSummary,
  type SongPerformanceStat
} from '~/utils/costumes';
import { tallyAllSongPerformances } from '~/utils/song-tally';
import { partitionAttendance, scopeMatches } from '~/utils/attendance/witness';
import { useAppSettings } from '~/hooks/useAppSettings';
import { foldKana } from '~/utils/event-filter';
import { localizedName } from '~/utils/names';
import { hasSongThumb } from '~/utils/song-thumbs';

const PAGE_SIZE = 48;
type SortKey = 'lives' | 'witnessed' | 'songs' | 'latest' | 'first' | 'name';

export default function Page() {
  const { t, i18n } = useTranslation();
  const { scope, setAppSettings } = useAppSettings();
  const { openCostume } = useDetail();
  const songById = useSongById();
  const songByName = useSongByName();
  const artistById = useArtistById();
  const setlists = useSetlists();
  const { records } = useAttendance();
  const [filters, setFilters] = useState<CostumeFilters>(EMPTY_COSTUME_FILTERS);
  const [sort, setSort] = useState<SortKey>('lives');
  const [page, setPage] = useState(1);
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

  const { witnessed, watched } = useMemo(
    () => partitionAttendance(records, performanceById),
    [records]
  );

  const scopedPerfById = useMemo(
    () =>
      new Map(
        [...performanceById].filter(([, performance]) => scopeMatches(scope, performance.category))
      ),
    [scope]
  );

  // Per-song reach: distinct performances (rate denominator) and distinct events
  // (eventId, falling back to tour name) used as the signature-song floor.
  const songStats = useMemo(() => {
    const map = new Map<string, SongPerformanceStat>();
    for (const entry of tallyAllSongPerformances(scopedPerfById, setlists)) {
      const events = new Set(entry.performances.map((p) => p.eventId ?? p.tourName));
      map.set(entry.songId, { performances: entry.performances.length, events: events.size });
    }
    return map;
  }, [scopedPerfById, setlists]);

  const costumes = useMemo(
    () => getCostumeSummaries(scopedPerfById, witnessed, watched, songStats, songById),
    [scopedPerfById, witnessed, watched, songStats, songById]
  );

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
        if (
          !filters.categories.some((category) =>
            costumeMatchesCategory(costume, category, songById, artistById)
          )
        ) {
          return false;
        }
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
  }, [costumes, filters, sort, searchText, songById, artistById]);

  const seenCount = costumes.filter((costume) => costume.attendedCount > 0).length;
  const percent = costumes.length ? Math.round((seenCount / costumes.length) * 100) : 0;
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
            <ScopeTabs value={scope} onChange={(s) => setAppSettings({ scope: s })} size="xs" />
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
          <StatTile label={t('costumes.seen')} value={seenCount} />
          <StatTile label={t('costumes.coverage')} value={`${percent}%`} />
        </Grid>

        <CostumeFiltersBar filters={filters} onChange={updateFilters} />

        {effectiveView === 'table' ? (
          <DataTable
            data={filtered}
            sorting={tableSorting}
            onSortingChange={setTableSorting}
            pageSize={PAGE_SIZE}
            onRowClick={(costume) => openCostume(costume.id)}
            minW="2xl"
            columns={tableColumns}
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
            {pageItems.map((costume) => (
              <CostumeCard
                key={costume.id}
                costume={costume}
                name={costumeName(costume)}
                signature={signatureInfo(costume)}
                onClick={() => openCostume(costume.id)}
              />
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
