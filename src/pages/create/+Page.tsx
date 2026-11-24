import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaDownload, FaLink, FaMusic, FaPlus } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack, Wrap, styled } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { NativeSelect } from '~/components/events/NativeSelect';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Link } from '~/components/ui/link';
import { SongThumb } from '~/components/songs/SongThumb';
import { useDetail } from '~/components/detail/DetailStack';
import { useAttendance } from '~/hooks/useAttendance';
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
import { isWatched, isWitnessed } from '~/utils/attendance/witness';
import type { Setlist, Song } from '~/types';
import type { WatchType } from '~/types/attendance';

const PAGE_SIZE = 40;
const SongDetailDialog = lazy(() =>
  import('~/components/songs/SongDetailDialog').then((m) => ({ default: m.SongDetailDialog }))
);

export default function Page() {
  const { t, i18n } = useTranslation();
  const { records, get, setAttendance, removeAttendance } = useAttendance();
  const { openEvent, openSong } = useDetail();
  const [data, setData] = useState<{ songs: Song[]; setlists: Record<string, Setlist> }>();
  const [loadError, setLoadError] = useState(false);
  const [seriesId, setSeriesId] = useState('');
  const [includeRemote, setIncludeRemote] = useState(false);
  const [shared, setShared] = useState<CompletionShare | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [tab, setTab] = useState<'events' | 'songs'>('events');
  const [query, setQuery] = useState('');
  const [songStatus, setSongStatus] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [sharedSongId, setSharedSongId] = useState<string>();
  const imageRef = useRef<HTMLDivElement>(null);

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
        setIncludeRemote(value.includeRemote);
      }
    };
    readShare();
    window.addEventListener('hashchange', readShare);
    return () => window.removeEventListener('hashchange', readShare);
  }, []);

  const date = shared?.date ?? todayString();
  const activeRecords = shared ? completionRecords(shared) : records;
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
      ((!selectedOnly && !shared) || activeIds.has(p.id)) &&
      fuzzySearch(
        {
          id: p.id,
          name: [p.tourName, p.performanceName, p.concertName, p.date, p.venue]
            .filter(Boolean)
            .join(' ')
        },
        query
      )
  );
  const visibleSongs =
    result?.catalog.filter(
      (song) =>
        fuzzySearch(song, query) &&
        (!songStatus || result.heard.has(song.id) === (songStatus === 'heard'))
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
    if (!imageRef.current) return;
    setExporting(true);
    setNotice('');
    try {
      await downloadElementAsImage(imageRef.current, 'llernote-completion.png');
    } catch {
      setNotice(t('completion.export_error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Metadata title={`${t('completion.title')} - LLerNote`} helmet />
      <Stack gap="5">
        <HStack justifyContent="space-between" alignItems="start" flexWrap="wrap">
          <Stack gap="1">
            <SectionHeading size="2xl">{t('completion.title')}</SectionHeading>
            <Text color="fg.muted">{t('completion.description')}</Text>
          </Stack>
          <Wrap gap="3">
            <Link href={toAppUrl('/mypick')} minH="11">
              {t('navigation.mypick')}
            </Link>
            <Link href={toAppUrl('/bingo')} minH="11">
              {t('bingo.title')}
            </Link>
          </Wrap>
        </HStack>

        {(shared || invalid) && (
          <HStack
            justifyContent="space-between"
            borderRadius="l2"
            p="4"
            bgColor="accent.a2"
            flexWrap="wrap"
          >
            <Text>{t(invalid ? 'completion.invalid' : 'completion.shared')}</Text>
            <Button variant="outline" onClick={useMine} minH="11">
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
              <Wrap gap="4" alignItems="end">
                <Stack gap="1">
                  <styled.label htmlFor="completion-series" fontSize="sm">
                    {t('completion.franchise')}
                  </styled.label>
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
                      resetList();
                    }}
                  />
                </Stack>
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

              <Box
                ref={imageRef}
                borderColor="border.default"
                borderRadius="l3"
                borderWidth="1px"
                p={{ base: '4', md: '6' }}
                bgColor="bg.default"
              >
                <Stack gap="3">
                  <Grid gap="4" alignItems="start" gridTemplateColumns="minmax(0, 1fr) auto">
                    <Stack gap="1" minW="0">
                      <Text color="fg.muted" fontSize="xs">
                        {t('completion.brand')}
                      </Text>
                      <Text textStyle="display" fontSize={{ base: '2xl', md: '3xl' }}>
                        {title}
                      </Text>
                      <Text fontSize="sm">
                        {t(includeRemote ? 'completion.all_scope' : 'completion.live_scope')}
                      </Text>
                    </Stack>
                    <Text
                      color="fg.default"
                      fontSize={{ base: '3xl', md: '5xl' }}
                      fontWeight="bold"
                      lineHeight="1"
                      whiteSpace="nowrap"
                    >
                      {result.percent}%
                    </Text>
                  </Grid>
                  <Stack gap="2">
                    <Text fontWeight="semibold">
                      {t('completion.collected', {
                        heard: result.heard.size,
                        total: result.catalog.length
                      })}
                    </Text>
                    <Box
                      role="progressbar"
                      aria-label={t('completion.title')}
                      aria-valuenow={result.heard.size}
                      aria-valuemin={0}
                      aria-valuemax={result.catalog.length || 1}
                      borderRadius="full"
                      h="3"
                      bgColor="bg.emphasized"
                      overflow="hidden"
                    >
                      <Box
                        style={{ width: `${result.percent}%` }}
                        borderRadius="full"
                        h="full"
                        bgColor="accent.default"
                      />
                    </Box>
                    <Text color="fg.muted" fontSize="sm">
                      {t(
                        result.heard.size === 0
                          ? 'completion.start'
                          : result.heard.size === result.catalog.length
                            ? 'completion.complete'
                            : 'completion.remaining',
                        { count: result.catalog.length - result.heard.size }
                      )}
                    </Text>
                  </Stack>
                  <Wrap gap="6">
                    <HStack gap="2">
                      <Text fontSize="xl" fontWeight="bold">
                        {result.shows}
                      </Text>
                      <Text color="fg.muted" fontSize="sm">
                        {t('completion.shows')}
                      </Text>
                    </HStack>
                    <HStack gap="2">
                      <Text fontSize="xl" fontWeight="bold">
                        {result.plays}
                      </Text>
                      <Text color="fg.muted" fontSize="sm">
                        {t('completion.plays')}
                      </Text>
                    </HStack>
                  </Wrap>
                  <Text color="fg.muted" fontSize="xs">
                    {t('completion.method', { date })}
                  </Text>
                  {result.missingSetlists > 0 && (
                    <Text fontSize="sm">
                      {t('completion.missing', { count: result.missingSetlists })}
                    </Text>
                  )}
                  {unknown > 0 && (
                    <Text fontSize="sm">{t('completion.unknown', { count: unknown })}</Text>
                  )}
                </Stack>
              </Box>
              <Stack gap="2">
                <Wrap gap="2">
                  <Button
                    onClick={saveImage}
                    disabled={exporting}
                    minH="11"
                    color="white"
                    bgColor="accent.10"
                    _hover={{ bgColor: 'accent.9' }}
                  >
                    <FaDownload />
                    {t(exporting ? 'completion.exporting' : 'completion.download')}
                  </Button>
                  <Button variant="outline" onClick={copyLink} minH="11">
                    <FaLink />
                    {t('completion.copy')}
                  </Button>
                  <Link href={sharePath} minH="11">
                    {t('completion.preview')}
                  </Link>
                </Wrap>
                <Text color="fg.muted" fontSize="xs">
                  {t('completion.privacy')}
                </Text>
                <Text role="status" fontSize="sm">
                  {notice}
                </Text>
              </Stack>

              <HStack aria-label={t('completion.title')} gap="2" flexWrap="wrap">
                <Button
                  variant={tab === 'events' ? 'solid' : 'outline'}
                  aria-pressed={tab === 'events'}
                  onClick={() => {
                    setTab('events');
                    setQuery('');
                    resetList();
                  }}
                  minH="11"
                  color={tab === 'events' ? 'white' : undefined}
                  bgColor={tab === 'events' ? 'accent.10' : undefined}
                  _hover={{ bgColor: tab === 'events' ? 'accent.9' : 'bg.subtle' }}
                >
                  {t(shared ? 'completion.shared_events' : 'completion.events')}
                </Button>
                <Button
                  variant={tab === 'songs' ? 'solid' : 'outline'}
                  aria-pressed={tab === 'songs'}
                  onClick={() => {
                    setTab('songs');
                    setQuery('');
                    resetList();
                  }}
                  minH="11"
                  color={tab === 'songs' ? 'white' : undefined}
                  bgColor={tab === 'songs' ? 'accent.10' : undefined}
                  _hover={{ bgColor: tab === 'songs' ? 'accent.9' : 'bg.subtle' }}
                >
                  <FaMusic />
                  {t('completion.songs')}
                </Button>
              </HStack>
              <Wrap gap="3" alignItems="end">
                <Stack flex="1" gap="1" w={{ base: 'full', sm: 'auto' }} minW="0">
                  <styled.label htmlFor="completion-search" fontSize="sm">
                    {t('completion.search')}
                  </styled.label>
                  <Input
                    id="completion-search"
                    value={query}
                    placeholder={t(
                      tab === 'events' ? 'completion.search_events' : 'completion.search_songs'
                    )}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      resetList();
                    }}
                  />
                </Stack>
                {tab === 'events' ? (
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
                ) : (
                  <Stack gap="1">
                    <Text fontSize="sm">{t('completion.status')}</Text>
                    <NativeSelect
                      aria-label={t('completion.status')}
                      value={songStatus}
                      placeholder={t('completion.any_status')}
                      options={[
                        { value: 'heard', label: t('completion.heard') },
                        { value: 'unheard', label: t('completion.unheard') }
                      ]}
                      onChange={(s) => {
                        setSongStatus(s);
                        resetList();
                      }}
                    />
                  </Stack>
                )}
              </Wrap>
              {tab === 'events' && !shared && (
                <Text color="fg.muted" fontSize="sm">
                  {t('completion.sync')}
                </Text>
              )}
              <Stack gap="2">
                {tab === 'events'
                  ? visibleEvents
                      .filter((p) => !shared || activeIds.has(p.id))
                      .slice(0, limit)
                      .map((p) => {
                        const record = get(p.id);
                        return (
                          <HStack
                            key={p.id}
                            gap="3"
                            justifyContent="space-between"
                            alignItems="center"
                            borderColor="border.default"
                            borderRadius="l2"
                            borderWidth="1px"
                            p="3"
                            bgColor={activeIds.has(p.id) ? 'accent.a2' : 'bg.default'}
                            flexWrap={{ base: 'wrap', md: 'nowrap' }}
                          >
                            <Stack flex="1" gap="1" minW="0">
                              <Text color="fg.muted" fontSize="xs">
                                {p.date}
                              </Text>
                              {shared ? (
                                <Text fontWeight="semibold">{p.tourName}</Text>
                              ) : (
                                <Button
                                  variant="ghost"
                                  onClick={() => openEvent(p.id)}
                                  justifyContent="start"
                                  h="auto"
                                  minH="11"
                                  p="0"
                                  textAlign="left"
                                  whiteSpace="normal"
                                >
                                  {p.tourName}
                                </Button>
                              )}
                              <Text color="fg.muted" fontSize="sm">
                                {[p.performanceName, p.concertName, p.venue]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                              {!data?.setlists[p.id]?.isActual && (
                                <Text fontSize="xs">{t('completion.no_setlist')}</Text>
                              )}
                            </Stack>
                            {shared ? (
                              <Text>
                                <FaCheck aria-label={t('completion.heard')} />
                              </Text>
                            ) : (
                              <Stack gap="2" flexShrink={0}>
                                <Button
                                  variant={record?.status === 'attended' ? 'solid' : 'outline'}
                                  aria-pressed={record?.status === 'attended'}
                                  aria-label={t('completion.attendance', {
                                    name: p.tourName,
                                    date: p.date
                                  })}
                                  onClick={() =>
                                    record?.status === 'attended'
                                      ? removeAttendance(p.id)
                                      : setAttendance(p.id, 'attended', {
                                          watchType: p.category === 'live' ? 'live' : 'stream'
                                        })
                                  }
                                  minH="11"
                                  color={record?.status === 'attended' ? 'white' : undefined}
                                  bgColor={record?.status === 'attended' ? 'accent.10' : undefined}
                                  _hover={{
                                    bgColor:
                                      record?.status === 'attended' ? 'accent.9' : 'bg.subtle'
                                  }}
                                >
                                  {record?.status === 'attended' ? <FaCheck /> : <FaPlus />}
                                  {t(
                                    record?.status === 'attended'
                                      ? 'completion.heard'
                                      : p.category === 'live'
                                        ? 'completion.inperson'
                                        : 'completion.stream'
                                  )}
                                </Button>
                                {record?.status === 'attended' && (
                                  <NativeSelect
                                    aria-label={t('completion.attendance', {
                                      name: p.tourName,
                                      date: p.date
                                    })}
                                    value={
                                      record?.status === 'attended'
                                        ? p.category !== 'live' &&
                                          (!record.watchType || record.watchType === 'live')
                                          ? 'stream'
                                          : (record.watchType ?? 'live')
                                        : ''
                                    }
                                    placeholder={t('completion.not_selected')}
                                    options={[
                                      ...(p.category === 'live'
                                        ? [{ value: 'live', label: t('completion.inperson') }]
                                        : []),
                                      { value: 'stream', label: t('completion.stream') },
                                      { value: 'delay', label: t('completion.delay') }
                                    ]}
                                    onChange={(watchType) => {
                                      if (watchType)
                                        setAttendance(p.id, 'attended', {
                                          watchType: watchType as WatchType
                                        });
                                      else removeAttendance(p.id);
                                      setNotice('');
                                    }}
                                  />
                                )}
                              </Stack>
                            )}
                          </HStack>
                        );
                      })
                  : visibleSongs.slice(0, limit).map((song) => (
                      <Button
                        key={song.id}
                        variant="ghost"
                        onClick={() => (shared ? setSharedSongId(song.id) : openSong(song.id))}
                        justifyContent="start"
                        h="auto"
                        minH="14"
                        p="2"
                      >
                        <SongThumb songId={song.id} />
                        <Stack flex="1" gap="0" minW="0" textAlign="left">
                          <Text whiteSpace="normal">
                            {localizedName(i18n.language, song.name, song.englishName)}
                          </Text>
                          <Text color="fg.muted" fontSize="xs">
                            {t(
                              result.heard.has(song.id) ? 'completion.heard' : 'completion.unheard'
                            )}
                          </Text>
                        </Stack>
                        {result.heard.has(song.id) && (
                          <Text flexShrink={0}>
                            {t('completion.times', { count: result.heard.get(song.id) })}
                          </Text>
                        )}
                      </Button>
                    ))}
                {(tab === 'events'
                  ? visibleEvents.filter((p) => !shared || activeIds.has(p.id)).length
                  : visibleSongs.length) === 0 && (
                  <Text p="4" color="fg.muted">
                    {t('completion.none')}
                  </Text>
                )}
                {(tab === 'events' ? visibleEvents.length : visibleSongs.length) > limit && (
                  <Button
                    variant="outline"
                    onClick={() => setLimit((n) => n + PAGE_SIZE)}
                    minH="11"
                  >
                    {t('completion.more')}
                  </Button>
                )}
              </Stack>
            </>
          )
        )}
      </Stack>
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
