import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Pagination } from '~/components/ui/pagination';
import { NativeSelect } from '~/components/events/NativeSelect';
import { SongCard } from '~/components/songs/SongCard';
import { SongDetailDialog } from '~/components/songs/SongDetailDialog';
import { EventDetailDialog } from '~/components/events/EventDetailDialog';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useAttendance } from '~/hooks/useAttendance';
import { usePerformances, useSeries, useSetlists, useSongs } from '~/hooks/useData';
import { tallySongs } from '~/utils/song-tally';
import { useColumnCount } from '~/hooks/useColumnCount';
import { foldKana } from '~/utils/event-filter';
import type { Performance, Song } from '~/types';

const PAGE_SIZE = 48;

type HeardFilter = '' | 'heard' | 'unheard';
type SortKey = 'count' | 'release' | 'name';

export default function Page() {
  const { t } = useTranslation();
  const { records } = useAttendance();
  const songs = useSongs();
  const series = useSeries();
  const performances = usePerformances();
  const setlists = useSetlists();
  const [search, setSearch] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [heardFilter, setHeardFilter] = useState<HeardFilter>('');
  const [sort, setSort] = useState<SortKey>('count');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Song>();
  const [selectedEvent, setSelectedEvent] = useState<Performance>();
  const columns = useColumnCount();

  const performanceById = useMemo(
    () => new Map(performances.map((p) => [p.id, p])),
    [performances]
  );

  const tally = useMemo(
    () => tallySongs(records, performanceById, setlists),
    [records, performanceById, setlists]
  );
  const tallyById = useMemo(() => new Map(tally.map((e) => [e.songId, e])), [tally]);

  const filtered = useMemo(() => {
    const q = foldKana(search.trim());
    const list = songs.filter((song) => {
      if (q) {
        const haystack = foldKana(
          `${song.name} ${song.phoneticName ?? ''} ${song.englishName ?? ''}`
        );
        if (!haystack.includes(q)) return false;
      }
      if (seriesId && !song.seriesIds.map(String).includes(seriesId)) return false;
      const heard = (tallyById.get(song.id)?.count ?? 0) > 0;
      if (heardFilter === 'heard' && !heard) return false;
      if (heardFilter === 'unheard' && heard) return false;
      return true;
    });
    const count = (s: Song) => tallyById.get(s.id)?.count ?? 0;
    if (sort === 'count') {
      list.sort(
        (a, b) => count(b) - count(a) || (b.releasedOn ?? '').localeCompare(a.releasedOn ?? '')
      );
    } else if (sort === 'release') {
      list.sort((a, b) => (b.releasedOn ?? '').localeCompare(a.releasedOn ?? ''));
    } else {
      list.sort((a, b) => (a.phoneticName ?? a.name).localeCompare(b.phoneticName ?? b.name, 'ja'));
    }
    return list;
  }, [songs, search, seriesId, heardFilter, sort, tallyById]);

  const scopeSongs = useMemo(
    () => (seriesId ? songs.filter((s) => s.seriesIds.map(String).includes(seriesId)) : songs),
    [songs, seriesId]
  );
  const heardInScope = scopeSongs.filter((s) => (tallyById.get(s.id)?.count ?? 0) > 0).length;
  const percent = scopeSongs.length ? Math.round((heardInScope / scopeSongs.length) * 100) : 0;

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedHeardAt = selected ? (tallyById.get(selected.id)?.performances ?? []) : [];

  return (
    <>
      <Metadata title={`${t('songs.title')} - LLerNote`} helmet />
      <Stack gap="3">
        <HStack justifyContent="space-between" alignItems="baseline" flexWrap="wrap">
          <SectionHeading size="2xl">{t('songs.title')}</SectionHeading>
          <Text color="fg.muted" fontSize="sm">
            {t('songs.progress', { heard: heardInScope, total: scopeSongs.length, percent })}
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
                placeholder={t('songs.search_placeholder')}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </Box>
            <NativeSelect
              aria-label={t('events.series')}
              value={seriesId}
              placeholder={`${t('events.series')}: ${t('common.all')}`}
              options={series.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(v) => {
                setSeriesId(v);
                setPage(1);
              }}
            />
            <NativeSelect
              aria-label={t('songs.heard_filter')}
              value={heardFilter}
              placeholder={`${t('songs.heard_filter')}: ${t('common.all')}`}
              options={[
                { value: 'heard', label: t('songs.heard') },
                { value: 'unheard', label: t('songs.unheard') }
              ]}
              onChange={(v) => {
                setHeardFilter(v as HeardFilter);
                setPage(1);
              }}
            />
            <NativeSelect
              aria-label={t('songs.sort')}
              value={sort}
              options={[
                { value: 'count', label: t('songs.sort_count') },
                { value: 'release', label: t('songs.sort_release') },
                { value: 'name', label: t('songs.sort_name') }
              ]}
              onChange={(v) => setSort(v as SortKey)}
            />
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setSeriesId('');
                setHeardFilter('');
                setPage(1);
              }}
            >
              {t('common.clear')}
            </Button>
          </HStack>
        </Box>
        <Text color="fg.muted" fontSize="sm">
          {t('songs.results_count', { count: filtered.length })}
        </Text>
        {filtered.length === 0 && <Text color="fg.muted">{t('songs.no_results')}</Text>}
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
              heardCount={tallyById.get(song.id)?.count ?? 0}
              onClick={() => setSelected(song)}
            />
          ))}
        </Grid>
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
        <SongDetailDialog
          song={selected}
          heardAt={selectedHeardAt}
          open={selected !== undefined}
          onClose={() => setSelected(undefined)}
          onSelectEvent={(p) => {
            setSelected(undefined);
            setSelectedEvent(p);
          }}
        />
        <EventDetailDialog
          performance={selectedEvent}
          open={selectedEvent !== undefined}
          onClose={() => setSelectedEvent(undefined)}
        />
      </Stack>
    </>
  );
}
