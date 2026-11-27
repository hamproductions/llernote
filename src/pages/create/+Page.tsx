import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaPlus } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack, Wrap, styled } from 'styled-system/jsx';
import { CompletionCard } from '~/components/completion/CompletionCard';
import { CompletionSharePanel } from '~/components/completion/CompletionSharePanel';
import { Metadata } from '~/components/layout/Metadata';
import { NativeSelect } from '~/components/events/NativeSelect';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Link } from '~/components/ui/link';
import { useDetail } from '~/components/detail/DetailStack';
import { useAttendance } from '~/hooks/useAttendance';
import { useAbbreviatedExport, useAbbreviations } from '~/hooks/useAbbreviations';
import { performanceById, series, sortedPerformances } from '~/data/core';
import { loadSongData } from '~/data/songs';
import { loadSetlists } from '~/data/setlists';
import {
  completionRecords,
  computeCompletion,
  decodeCompletion,
  encodeCompletion,
  type CompletionShare
} from '~/utils/completion';
import { copyTextToClipboard, downloadElementAsImage } from '~/utils/share';
import { todayString } from '~/utils/event-filter';
import { getSeriesShortName } from '~/utils/series-short';
import { localizedName } from '~/utils/names';
import { fuzzySearch } from '~/utils/search';
import { toAppUrl } from '~/utils/url';
import { getActiveRecords } from '~/utils/attendance/storage';
import { isWatched, isWitnessed } from '~/utils/attendance/witness';
import type { Setlist, Song } from '~/types';
import type { WatchType } from '~/types/attendance';

const PAGE_SIZE = 40;
const SongDetailDialog = lazy(() =>
  import('~/components/songs/SongDetailDialog').then((m) => ({ default: m.SongDetailDialog }))
);

export default function Page() {
  const { t, i18n } = useTranslation();
  const { map, get, setAttendance, removeAttendance } = useAttendance();
  const { openEvent, openSong } = useDetail();
  const [data, setData] = useState<{ songs: Song[]; setlists: Record<string, Setlist> }>();
  const [loadError, setLoadError] = useState(false);
  const [seriesId, setSeriesId] = useState('');
  const [includeRemote, setIncludeRemote] = useState(false);
  const [shared, setShared] = useState<CompletionShare | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [tab, setTab] = useState<'events' | 'songs'>('events');
  const [queries, setQueries] = useState({ events: '', songs: '' });
  const query = queries[tab];
  const setQuery = (value: string) => setQueries((previous) => ({ ...previous, [tab]: value }));
  const [year, setYear] = useState('');
  const [songStatus, setSongStatus] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [sharedSongId, setSharedSongId] = useState<string>();
  const imageRef = useRef<HTMLDivElement>(null);
  const { songAliases, eventAliases } = useAbbreviations();
  const exportNames = useAbbreviatedExport();

  useEffect(() => {
    let active = true;
    Promise.all([loadSongData(), loadSetlists()]).then(
      ([songs, setlists]) => active && setData({ songs: songs.songs, setlists: setlists.all }),
      () => active && setLoadError(true)
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const readShare = () => {
      const encoded = new URLSearchParams(window.location.hash.slice(1)).get('c');
      const value = encoded ? decodeCompletion(encoded) : null;
      const valid = value && (!value.seriesId || series.some((s) => s.id === value.seriesId));
      setInvalid(Boolean(encoded && !valid));
      setShared(valid ? value : null);
      if (valid) {
        setSeriesId(value.seriesId);
        setYear('');
        setIncludeRemote(value.includeRemote);
      }
    };
    readShare();
    window.addEventListener('hashchange', readShare);
    return () => window.removeEventListener('hashchange', readShare);
  }, []);

  const date = shared?.date ?? todayString();
  const activeRecords = useMemo(
    () => (shared ? completionRecords(shared) : getActiveRecords(map)),
    [shared, map]
  );
  const result = useMemo(
    () =>
      data &&
      computeCompletion(
        data.songs,
        activeRecords,
        performanceById,
        data.setlists,
        seriesId,
        includeRemote,
        date
      ),
    [data, activeRecords, seriesId, includeRemote, date]
  );
  const activeIds = new Set(
    activeRecords.filter((r) => r.status === 'attended').map((r) => r.performanceId)
  );
  const events = useMemo(() => {
    if (!data || !result) return [];
    const catalogIds = new Set(result.catalog.map((song) => song.id));
    return sortedPerformances.filter(
      (p) =>
        p.date <= date &&
        !p.canceled &&
        (includeRemote || p.category === 'live') &&
        (!seriesId ||
          p.seriesIds.includes(seriesId) ||
          data.setlists[p.id]?.items.some((item) => item.songId && catalogIds.has(item.songId)))
    );
  }, [data, result, date, includeRemote, seriesId]);
  const visibleEvents = events.filter(
    (p) =>
      (!year || p.date.startsWith(year)) &&
      ((!selectedOnly && !shared) || activeIds.has(p.id)) &&
      fuzzySearch(
        {
          id: p.id,
          name: [p.tourName, p.performanceName, p.concertName, p.date, p.venue]
            .filter(Boolean)
            .join(' '),
          aliases: eventAliases(p.eventId)
        },
        query
      )
  );
  const visibleSongs =
    result?.catalog.filter(
      (song) =>
        fuzzySearch({ ...song, aliases: songAliases(song.id) }, query) &&
        (!songStatus ||
          (songStatus === 'never'
            ? !result.performed.has(song.id)
            : result.heard.has(song.id) === (songStatus === 'heard')))
    ) ?? [];
  const unknown = shared?.attendance.filter(([id]) => !performanceById.has(id)).length ?? 0;
  const sharePath = result
    ? `${toAppUrl('/create')}#c=${encodeCompletion({
        v: 1,
        seriesId,
        includeRemote,
        date,
        attendance: result.includedRecords.map((r) => [r.performanceId, r.watchType ?? 'live'])
      })}`
    : '';
  const sharedSong = useMemo(() => {
    if (!sharedSongId || !data || !shared) return null;
    const song = data.songs.find((s) => s.id === sharedSongId);
    const hasSong = (id: string) =>
      data.setlists[id]?.isActual &&
      data.setlists[id].items.some((item) => item.type === 'song' && item.songId === sharedSongId);
    const performedAt = sortedPerformances.filter((p) => p.date <= date && hasSong(p.id));
    const byId = new Map(activeRecords.map((r) => [r.performanceId, r]));
    const heardAt = performedAt.filter((p) => isWitnessed(byId.get(p.id), p));
    const watchedAt = performedAt.filter((p) => isWatched(byId.get(p.id), p));
    return { song, performedAt, heardAt, watchedAt };
  }, [sharedSongId, data, shared, date, activeRecords]);
  const title = seriesId
    ? getSeriesShortName(seriesId, series.find((s) => s.id === seriesId)?.name ?? '')
    : t('completion.all');

  const seriesColor = series.find((s) => s.id === seriesId)?.color ?? '#e4007f';
  const years = [...new Set(events.map((p) => p.date.slice(0, 4)))].sort().reverse();

  const resetList = () => {
    setLimit(PAGE_SIZE);
    setNotice('');
  };
  const useMine = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setShared(null);
    setInvalid(false);
    setNotice('');
  };
  const copyLink = async () => {
    if (!result) return;
    try {
      await copyTextToClipboard(new URL(sharePath, window.location.origin).href);
      setNotice(t('completion.copied'));
    } catch {
      setNotice(t('completion.copy_error'));
    }
  };
  const saveImage = async () => {
    if (!result) return;
    flushSync(() => setExporting(true));
    setNotice('');
    try {
      await downloadElementAsImage(imageRef.current!, 'llernote-completion.png');
    } catch {
      setNotice(t('completion.export_error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Metadata title={`${t('completion.title')} - LLerNote`} helmet />
      <Stack gap="4" borderRadius="l3" p={{ base: '3', md: '5' }} bgColor="bg.default">
        <Stack gap="1">
          <styled.h1 textStyle="display" fontSize={{ base: 'xl', md: '2xl' }} lineHeight="1.3">
            {t('completion.title')}
          </styled.h1>
          <Text color="fg.muted" fontSize="sm">
            {t('completion.description')}
          </Text>
        </Stack>
        {(shared || invalid) && (
          <HStack
            justifyContent="space-between"
            borderRadius="l2"
            p="3"
            bgColor="bg.subtle"
            flexWrap="wrap"
          >
            <Text fontSize="sm">{t(invalid ? 'completion.invalid' : 'completion.shared')}</Text>
            <Button
              variant="outline"
              onClick={useMine}
              maxW="full"
              h="auto"
              minH="11"
              py="2"
              whiteSpace="normal"
            >
              {t('completion.mine')}
            </Button>
          </HStack>
        )}
        {loadError ? (
          <Stack role="alert">
            <Text>{t('completion.load_error')}</Text>
            <Button onClick={() => window.location.reload()} minH="11">
              {t('completion.reload')}
            </Button>
          </Stack>
        ) : !result ? (
          <Text role="status">{t('completion.loading')}</Text>
        ) : (
          !invalid && (
            <>
              <Wrap gap="3" alignItems="center">
                <NativeSelect
                  id="completion-series"
                  value={seriesId}
                  aria-label={t('completion.franchise')}
                  options={series.map((s) => ({
                    value: s.id,
                    label: getSeriesShortName(s.id, s.name)
                  }))}
                  placeholder={t('completion.all')}
                  onChange={(id) => {
                    setSeriesId(id);
                    setYear('');
                    resetList();
                  }}
                />
                <Checkbox
                  checked={includeRemote}
                  onCheckedChange={(e) => {
                    setIncludeRemote(e.checked === true);
                    resetList();
                  }}
                  minH="11"
                >
                  {t('completion.remote')}
                </Checkbox>
              </Wrap>
              <Grid
                gap={{ base: '4', lg: '6' }}
                alignItems="start"
                gridTemplateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 20rem' }}
              >
                <Stack gap="0" minW="0" order={{ base: '2', lg: '1' }}>
                  <Stack
                    zIndex="5"
                    position="sticky"
                    top="0"
                    gap="3"
                    pt="1"
                    pb="3"
                    bgColor="bg.default"
                  >
                    <Grid
                      role="group"
                      aria-label={t('completion.view')}
                      gap="2"
                      gridTemplateColumns="repeat(2, minmax(0, 1fr))"
                      borderColor="border.default"
                      borderBottomWidth="1px"
                    >
                      {(['events', 'songs'] as const).map((value) => (
                        <styled.button
                          key={value}
                          type="button"
                          aria-pressed={tab === value}
                          onClick={() => {
                            setTab(value);
                            resetList();
                          }}
                          cursor="pointer"
                          borderBottomWidth="3px"
                          borderBottomColor={tab === value ? 'accent.default' : 'transparent'}
                          minW="0"
                          minH="12"
                          py="2"
                          px="3"
                          color={tab === value ? 'fg.default' : 'fg.muted'}
                          fontSize="sm"
                          fontWeight={tab === value ? 'semibold' : 'medium'}
                          lineHeight="1.5"
                          bgColor={tab === value ? 'bg.subtle' : 'transparent'}
                          _focusVisible={{
                            outline: '2px solid',
                            outlineColor: 'accent.default',
                            outlineOffset: '2px'
                          }}
                          _hover={{ bgColor: 'bg.subtle' }}
                        >
                          {t(
                            value === 'songs'
                              ? 'completion.songs'
                              : shared
                                ? 'completion.shared_events'
                                : 'completion.events'
                          )}
                        </styled.button>
                      ))}
                    </Grid>
                    <HStack gap="2" flexWrap="wrap">
                      <Input
                        id="completion-search"
                        aria-label={t('completion.search')}
                        value={query}
                        placeholder={t(
                          tab === 'events' ? 'completion.search_events' : 'completion.search_songs'
                        )}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          resetList();
                        }}
                        flex="1 1 8rem"
                        minW="0"
                        minH="11"
                      />
                      {tab === 'events' ? (
                        <NativeSelect
                          aria-label={t('events.year')}
                          value={year}
                          placeholder={t('events.year')}
                          options={years.map((value) => ({ value, label: value }))}
                          onChange={(value) => {
                            setYear(value);
                            resetList();
                          }}
                        />
                      ) : (
                        <NativeSelect
                          aria-label={t('completion.status')}
                          value={songStatus}
                          placeholder={t('completion.any_status')}
                          options={[
                            { value: 'heard', label: t('completion.heard') },
                            { value: 'unheard', label: t('completion.unheard') },
                            { value: 'never', label: t('completion.never_performed') }
                          ]}
                          onChange={(value) => {
                            setSongStatus(value);
                            resetList();
                          }}
                        />
                      )}
                    </HStack>
                    <HStack gap="2" justifyContent="space-between" flexWrap="wrap">
                      <Text color="fg.muted" fontSize="xs">
                        {t(tab === 'events' ? 'events.results_count' : 'songs.results_count', {
                          count: tab === 'events' ? visibleEvents.length : visibleSongs.length
                        })}
                      </Text>
                      {tab === 'events' && (
                        <Checkbox
                          checked={selectedOnly || Boolean(shared)}
                          disabled={Boolean(shared)}
                          onCheckedChange={(e) => {
                            setSelectedOnly(e.checked === true);
                            resetList();
                          }}
                          minH="11"
                        >
                          {t('completion.selected_only')}
                        </Checkbox>
                      )}
                    </HStack>
                  </Stack>
                  {tab === 'events' && !shared && (
                    <Text pb="3" color="fg.muted" fontSize="xs">
                      {t('completion.sync')}
                    </Text>
                  )}
                  {tab === 'events' ? (
                    <Stack gap="0" borderColor="border.default" borderTopWidth="1px">
                      {visibleEvents.slice(0, limit).map((p) => {
                        const record = get(p.id);
                        const selected = activeIds.has(p.id);
                        return (
                          <Grid
                            key={p.id}
                            gap="2"
                            alignItems="center"
                            gridTemplateColumns={{
                              base: 'minmax(0, 1fr) auto',
                              md: '5.5rem minmax(0, 1fr) auto'
                            }}
                            borderColor="border.default"
                            borderBottomWidth="1px"
                            py="2"
                            px="2"
                            bgColor={selected ? 'bg.subtle' : 'transparent'}
                          >
                            <Text
                              hideBelow="md"
                              color="fg.muted"
                              fontSize="xs"
                              fontVariantNumeric="tabular-nums"
                            >
                              {p.date}
                            </Text>
                            <Stack gap="0.5" minW="0">
                              <Text hideFrom="md" color="fg.muted" fontSize="xs">
                                {p.date}
                              </Text>
                              {shared ? (
                                <Text fontSize="sm" fontWeight="semibold">
                                  {p.performanceName || p.concertName || p.tourName}
                                </Text>
                              ) : (
                                <Button
                                  variant="ghost"
                                  onClick={() => openEvent(p.id)}
                                  justifyContent="start"
                                  h="auto"
                                  minH="11"
                                  p="0"
                                  fontSize="sm"
                                  lineHeight="1.5"
                                  textAlign="left"
                                  whiteSpace="normal"
                                >
                                  {p.performanceName || p.concertName || p.tourName}
                                </Button>
                              )}
                              <Text color="fg.muted" fontSize="xs">
                                {[(p.performanceName || p.concertName) && p.tourName, p.venue]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                              {!data?.setlists[p.id]?.isActual && (
                                <Text color="fg.muted" fontSize="xs">
                                  {t('completion.no_setlist')}
                                </Text>
                              )}
                            </Stack>
                            {shared ? (
                              <Text color="fg.default">
                                <FaCheck aria-label={t('completion.heard')} />
                              </Text>
                            ) : (
                              <HStack
                                gap="1"
                                justifyContent="end"
                                gridColumn={{ base: '1 / -1', md: 'auto' }}
                                maxW="full"
                                flexWrap="wrap"
                              >
                                <Box
                                  visibility={selected ? 'visible' : 'hidden'}
                                  w="40"
                                  minW="0"
                                  maxW="full"
                                >
                                  <NativeSelect
                                    aria-label={t('completion.attendance', {
                                      name: p.tourName,
                                      date: p.date
                                    })}
                                    value={
                                      p.category !== 'live' &&
                                      (!record?.watchType || record.watchType === 'live')
                                        ? 'stream'
                                        : (record?.watchType ?? 'live')
                                    }
                                    options={[
                                      ...(p.category === 'live'
                                        ? [{ value: 'live', label: t('completion.inperson') }]
                                        : []),
                                      { value: 'stream', label: t('completion.stream') },
                                      { value: 'delay', label: t('completion.delay') }
                                    ]}
                                    onChange={(watchType) =>
                                      setAttendance(p.id, 'attended', {
                                        watchType: watchType as WatchType
                                      })
                                    }
                                  />
                                </Box>
                                <Button
                                  variant={selected ? 'solid' : 'outline'}
                                  aria-pressed={selected}
                                  aria-label={t('completion.attendance', {
                                    name: p.tourName,
                                    date: p.date
                                  })}
                                  title={t(
                                    selected
                                      ? 'completion.heard'
                                      : p.category === 'live'
                                        ? 'completion.inperson'
                                        : 'completion.stream'
                                  )}
                                  onClick={() =>
                                    selected
                                      ? removeAttendance(p.id)
                                      : setAttendance(p.id, 'attended', {
                                          watchType: p.category === 'live' ? 'live' : 'stream'
                                        })
                                  }
                                  minW="11"
                                  minH="11"
                                  px="3"
                                  color={selected ? 'white' : 'fg.default'}
                                  bgColor={selected ? 'accent.10' : undefined}
                                  _hover={{ bgColor: selected ? 'accent.9' : 'bg.subtle' }}
                                >
                                  {selected ? <FaCheck /> : <FaPlus />}
                                </Button>
                              </HStack>
                            )}
                          </Grid>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Grid
                      gap="0"
                      columnGap="5"
                      gridTemplateColumns={{
                        base: 'minmax(0, 1fr)',
                        '2xl': 'repeat(2, minmax(0, 1fr))'
                      }}
                    >
                      {visibleSongs.slice(0, limit).map((song) => (
                        <Button
                          key={song.id}
                          variant="ghost"
                          onClick={() => (shared ? setSharedSongId(song.id) : openSong(song.id))}
                          display="grid"
                          gap="1"
                          alignItems="start"
                          gridTemplateColumns="minmax(0, 1fr)"
                          borderColor="border.default"
                          borderBottomWidth="1px"
                          borderRadius="0"
                          minW="0"
                          h="auto"
                          minH="16"
                          py="3"
                          px="2"
                          textAlign="left"
                        >
                          <Stack gap="0.5" minW="0">
                            <Text
                              fontSize="md"
                              fontWeight="semibold"
                              lineHeight="1.5"
                              overflowWrap="anywhere"
                              whiteSpace="normal"
                            >
                              {localizedName(i18n.language, song.name, song.englishName)}
                            </Text>
                          </Stack>
                          <HStack
                            gap="2"
                            justifyContent="space-between"
                            color="fg.muted"
                            fontSize="xs"
                            flexWrap="wrap"
                          >
                            <Text>{song.releasedOn}</Text>
                            <Text
                              color={result.heard.has(song.id) ? 'fg.default' : 'fg.muted'}
                              fontVariantNumeric="tabular-nums"
                              whiteSpace="normal"
                            >
                              {result.performed.has(song.id)
                                ? t('completion.performance_ratio', {
                                    heard: result.heard.get(song.id) ?? 0,
                                    total: result.performed.get(song.id)
                                  })
                                : t('completion.never_performed')}
                            </Text>
                          </HStack>
                        </Button>
                      ))}
                    </Grid>
                  )}
                  {(tab === 'events' ? visibleEvents.length : visibleSongs.length) === 0 && (
                    <Text p="4" color="fg.muted">
                      {t('completion.none')}
                    </Text>
                  )}
                  {(tab === 'events' ? visibleEvents.length : visibleSongs.length) > limit && (
                    <Button
                      variant="outline"
                      onClick={() => setLimit((n) => n + PAGE_SIZE)}
                      minH="11"
                      mt="4"
                    >
                      {t('completion.more')}
                    </Button>
                  )}
                </Stack>
                <Stack
                  position={{ base: 'static', lg: 'sticky' }}
                  top="4"
                  gap="3"
                  minW="0"
                  order={{ base: '1', lg: '2' }}
                >
                  <CompletionCard
                    compact
                    title={title}
                    date={date}
                    includeRemote={includeRemote}
                    result={result}
                    color={seriesColor}
                  />
                  {(result.missingSetlists > 0 || unknown > 0) && (
                    <Stack role="status" gap="1" borderRadius="l2" p="3" bgColor="bg.subtle">
                      {result.missingSetlists > 0 && (
                        <Text fontSize="xs">
                          {t('completion.missing', { count: result.missingSetlists })}
                        </Text>
                      )}
                      {unknown > 0 && (
                        <Text fontSize="xs">{t('completion.unknown', { count: unknown })}</Text>
                      )}
                    </Stack>
                  )}
                  <CompletionSharePanel
                    card={{ title, date, includeRemote, result, color: seriesColor }}
                    sharePath={sharePath}
                    exporting={exporting}
                    notice={notice}
                    exportNames={exportNames}
                    onSave={saveImage}
                    onCopy={copyLink}
                  />
                </Stack>
              </Grid>
            </>
          )
        )}
        <Wrap gap="4" borderColor="border.subtle" borderTopWidth="1px" pt="3">
          <Link href={toAppUrl('/mypick')} minH="11" fontSize="sm">
            {t('navigation.mypick')}
          </Link>
          <Link href={toAppUrl('/bingo')} minH="11" fontSize="sm">
            {t('bingo.title')}
          </Link>
        </Wrap>
      </Stack>
      {exporting && result && (
        <Box
          aria-hidden="true"
          position="fixed"
          top="0"
          left="-9999px"
          w="540px"
          pointerEvents="none"
        >
          <CompletionCard
            imageRef={imageRef}
            title={title}
            date={date}
            includeRemote={includeRemote}
            result={result}
            short={exportNames.exportShort}
            color={seriesColor}
          />
        </Box>
      )}
      {sharedSong?.song &&
        createPortal(
          <Suspense fallback={<Text role="status">{t('completion.loading')}</Text>}>
            <SongDetailDialog
              {...sharedSong}
              song={sharedSong.song}
              debutPerformance={sharedSong.performedAt.at(-1)}
              firstWitnessPerformance={sharedSong.heardAt.at(-1)}
              performanceCount={sharedSong.performedAt.length}
              open
              onClose={() => setSharedSongId(undefined)}
            />
          </Suspense>,
          document.body
        )}
    </>
  );
}
