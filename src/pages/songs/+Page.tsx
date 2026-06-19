import { useMemo, useState } from 'react';
import { FaArrowDownLong, FaArrowUpLong, FaTableCellsLarge, FaTableList } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';
import type { SortingState } from '@tanstack/react-table';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Pagination } from '~/components/ui/pagination';
import { IconButton } from '~/components/ui/icon-button';
import { Skeleton } from '~/components/ui/skeleton';
import { NativeSelect } from '~/components/events/NativeSelect';
import { SongCard } from '~/components/songs/SongCard';
import { SongTable } from '~/components/songs/SongTable';
import { SongFiltersBar } from '~/components/songs/SongFiltersBar';
import { ScopeTabs } from '~/components/events/ScopeTabs';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useAttendance } from '~/hooks/useAttendance';
import { useAppSettings } from '~/hooks/useAppSettings';
import { useSongs } from '~/hooks/useSongData';
import { useDerivedDataWorker } from '~/hooks/useDerivedDataWorker';
import { useColumnCount } from '~/hooks/useColumnCount';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { useDetail } from '~/components/detail/DetailStack';
import { EMPTY_SONG_FILTERS, type SongFilters } from '~/utils/song-filter';

const PAGE_SIZE = 48;

export default function Page() {
  const { t } = useTranslation();
  const { records } = useAttendance();
  const { scope, setAppSettings } = useAppSettings();
  const songs = useSongs();
  const { openSong } = useDetail();
  const [filters, setFilters] = useState<SongFilters>(EMPTY_SONG_FILTERS);
  const [page, setPage] = useState(1);
  const columns = useColumnCount();
  const [view, setView] = useLocalStorage<'cards' | 'table'>('llernote-songs-view', 'cards');
  const effectiveView = columns === 1 ? 'cards' : view;
  const [sorting, setSorting] = useState<SortingState>([{ id: 'performed', desc: true }]);
  const sort = sorting[0] ?? { id: 'performed', desc: true };

  const derived = useDerivedDataWorker('songs', { records, filters, scope }, [
    records,
    filters,
    scope
  ]);
  const tally = useMemo(() => derived.result?.tally ?? [], [derived.result]);
  const tallyById = useMemo(() => new Map(tally.map((e) => [e.songId, e])), [tally]);
  const watchedTally = useMemo(() => derived.result?.watchedTally ?? [], [derived.result]);
  const watchedById = useMemo(
    () => new Map(watchedTally.map((e) => [e.songId, e])),
    [watchedTally]
  );
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
  const watchedCount = (id: string) => watchedById.get(id)?.count ?? 0;
  const performedCount = (id: string) => allPerformanceTallyById.get(id)?.count ?? 0;
  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    return [...filtered].sort((a, b) => {
      if (sort.id === 'performed') {
        return (
          ((allPerformanceTallyById.get(a.id)?.count ?? 0) -
            (allPerformanceTallyById.get(b.id)?.count ?? 0)) *
          dir
        );
      }
      if (sort.id === 'heard') {
        return ((tallyById.get(a.id)?.count ?? 0) - (tallyById.get(b.id)?.count ?? 0)) * dir;
      }
      if (sort.id === 'release') {
        return (a.releasedOn ?? '').localeCompare(b.releasedOn ?? '') * dir;
      }
      return (a.phoneticName ?? a.name).localeCompare(b.phoneticName ?? b.name, 'ja') * dir;
    });
  }, [filtered, sort.id, sort.desc, tallyById, allPerformanceTallyById]);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <HStack gap="2" justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <HStack gap="2" alignItems="center" flexWrap="wrap">
            <Text color="fg.muted" fontSize="sm">
              {t('songs.results_count', { count: filtered.length })}
            </Text>
            <ScopeTabs value={scope} onChange={(s) => setAppSettings({ scope: s })} size="xs" />
          </HStack>
          {effectiveView === 'cards' && (
            <HStack gap="1" alignItems="center">
              <NativeSelect
                aria-label={t('songs.sort_by')}
                value={sort.id}
                options={[
                  { value: 'performed', label: t('songs.performed') },
                  { value: 'heard', label: t('songs.heard') },
                  { value: 'release', label: t('songs.release') },
                  { value: 'name', label: t('songs.title') }
                ]}
                onChange={(id) => {
                  setSorting([{ id, desc: id === 'performed' || id === 'heard' }]);
                  setPage(1);
                }}
              />
              <IconButton
                aria-label={t('songs.sort_direction')}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSorting([{ id: sort.id, desc: !sort.desc }]);
                  setPage(1);
                }}
              >
                {sort.desc ? <FaArrowDownLong /> : <FaArrowUpLong />}
              </IconButton>
            </HStack>
          )}
        </HStack>
        {derived.loading ? (
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
            watchedCount={watchedCount}
            performedCount={performedCount}
            onSelect={(s) => openSong(s.id)}
            sorting={sorting}
            onSortingChange={setSorting}
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
                watchedCount={watchedCount(song.id)}
                performedCount={performedCount(song.id)}
                onClick={() => openSong(song.id)}
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
      </Stack>
    </>
  );
}
