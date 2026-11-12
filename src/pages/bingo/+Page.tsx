import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowRightArrowLeft,
  FaCalendarDays,
  FaCheck,
  FaDownload,
  FaEraser,
  FaLink,
  FaMagnifyingGlass,
  FaPlus,
  FaMusic,
  FaShareNodes,
  FaShuffle,
  FaStar,
  FaXTwitter,
  FaXmark
} from 'react-icons/fa6';
import { Box, Grid, HStack, Stack, styled } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { performanceById, sortedPerformances, series, artistById } from '~/data/core';
import { loadSongData, type SongData } from '~/data/songs';
import { loadSetlists, type SetlistData } from '~/data/setlists';
import {
  decodeBingo,
  emptyBingo,
  encodeBingo,
  parseBingo,
  scoreBingo,
  type BingoCard
} from '~/utils/bingo';
import { fuzzySearch, getSearchScore } from '~/utils/search';
import { SONG_CATEGORIES, songMatchesCategory, type SongCategory } from '~/utils/song-filter';
import {
  canShareImageFile,
  downloadElementAsImage,
  shareElementAsImage,
  xShareUrl
} from '~/utils/share';
import { getPicUrl } from '~/utils/assets';
import { hasSongThumb } from '~/utils/song-thumbs';
import { Dialog } from '~/components/ui/dialog';
import { getSeriesShortName } from '~/utils/series-short';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Portal } from '@ark-ui/react/portal';
import { Card } from '~/components/ui/card';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { EventThumb } from '~/components/events/EventThumb';
import { NativeSelect } from '~/components/events/NativeSelect';

const STORAGE_KEY = 'llernote:bingo:v1';
const BROWN = '#7c4d3d';
const PINK = '#ff6cc7';
const CREAM = '#ffecfb';
const GREEN = '#3bad21';
const BUNTING = series.map((item) => item.color);

const foregroundFor = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.4 ? '#111111' : '#ffffff';
};

export function Page() {
  const { t } = useTranslation();
  const [card, setCard] = useState<BingoCard>(emptyBingo);
  const [shared, setShared] = useState<BingoCard | null>(null);
  const [data, setData] = useState<{ songs: SongData; setlists: SetlistData }>();
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [categories, setCategories] = useState<SongCategory[]>([]);
  const [eventQuery, setEventQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [eventPicking, setEventPicking] = useState(false);
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [canShareImage, setCanShareImage] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const gridDrafts = useRef<Record<string, BingoCard>>({});
  const [songScrollElement, setSongScrollElement] = useState<HTMLDivElement | null>(null);
  const [eventScrollElement, setEventScrollElement] = useState<HTMLDivElement | null>(null);
  const current = shared ?? card;
  const performance = performanceById.get(String(Math.abs(Number(current.performanceId))));
  const liveDays = sortedPerformances.filter((event) => event.tourName === performance?.tourName);
  const selected = new Set(current.cells.filter((id) => id !== null));
  const gridSize = Math.sqrt(current.cells.length);
  const songTotal = current.cells.length - (current.freeIndex === null ? 0 : 1);
  const franchiseIds = performance?.seriesIds.length
    ? performance.seriesIds
    : seriesId
      ? [seriesId]
      : [
          ...new Set(
            (data?.songs.songs ?? [])
              .filter((song) => selected.has(song.id))
              .flatMap((song) => song.seriesIds.map(String))
          )
        ];
  const franchises = series.filter((item) => franchiseIds.includes(item.id));
  const colors = franchises.length === 1 ? [franchises[0].color] : ['#e4007f'];
  const themeStyle = {
    '--bingo-accent': colors[0],
    '--bingo-header':
      colors.length > 1 ? `linear-gradient(115deg, ${colors.join(', ')})` : colors[0],
    '--bingo-tint': `${colors[0]}12`,
    '--bingo-shadow': `${colors[0]}30`,
    '--bingo-foreground': colors.length > 1 ? '#ffffff' : foregroundFor(colors[0])
  } as CSSProperties;

  useEffect(() => {
    setCanShareImage(canShareImageFile());
    const query = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadSongData(), loadSetlists()])
      .then(([songs, setlists]) => {
        if (mounted) setData({ songs, setlists });
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const savedGrids = JSON.parse(localStorage.getItem(`${STORAGE_KEY}:grids`) ?? '{}');
      if (savedGrids && typeof savedGrids === 'object') {
        for (const [size, value] of Object.entries(savedGrids)) {
          const saved = parseBingo(value);
          if (saved) gridDrafts.current[size] = saved;
        }
      }
      const draft = stored ? parseBingo(JSON.parse(stored)) : null;
      if (draft) {
        setCard(draft);
        setSeriesId(draft.performanceId ? 'live' : '');
      }
    } catch {
      setMessage(t('bingo.storage_error'));
    }
    const readShare = () => {
      const encoded = new URLSearchParams(window.location.hash.slice(1)).get('b');
      const decoded = encoded ? decodeBingo(encoded) : null;
      setShared(decoded);
      setMessage('');
      setShareLink('');
      if (encoded && !decoded) setMessage(t('bingo.invalid'));
    };
    readShare();
    window.addEventListener('hashchange', readShare);
    return () => window.removeEventListener('hashchange', readShare);
  }, [t]);

  const update = (next: BingoCard) => {
    setCard(next);
    setMessage('');
    setShareLink('');
    try {
      gridDrafts.current[String(Math.sqrt(next.cells.length))] = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(`${STORAGE_KEY}:grids`, JSON.stringify(gridDrafts.current));
    } catch {
      setMessage(t('bingo.storage_error'));
    }
  };

  const score = useMemo(() => {
    const lists = current.performanceId.startsWith('-')
      ? liveDays.flatMap((event) =>
          data?.setlists.all[event.id]?.isActual ? [data.setlists.all[event.id]] : []
        )
      : data?.setlists.all[current.performanceId]
        ? [data.setlists.all[current.performanceId]]
        : [];
    const combined = lists.length
      ? { ...lists[0], items: lists.flatMap((list) => list.items) }
      : undefined;
    return scoreBingo(current, combined, data?.songs.songs ?? []);
  }, [current, data, liveDays]);
  const results = useMemo(() => {
    const scoped = (data?.songs.songs ?? []).filter(
      (song) =>
        (!seriesId ||
          (seriesId === 'live'
            ? song.seriesIds.some((id) => performance?.seriesIds.includes(String(id)))
            : song.seriesIds.includes(Number(seriesId)))) &&
        (!categories.length ||
          categories.some((category) => songMatchesCategory(song, category, artistById)))
    );
    const search = query.trim();
    return search
      ? scoped
          .filter((song) => fuzzySearch(song, search))
          .toSorted((a, b) => getSearchScore(b, search) - getSearchScore(a, search))
      : scoped;
  }, [data, query, seriesId, categories, performance]);
  const events = useMemo(() => {
    const search = eventQuery.trim().toLocaleLowerCase();
    const today = new Date().toLocaleDateString('sv-SE');
    return [
      ...new Map(
        sortedPerformances
          .filter((event) => event.date >= today && !event.canceled)
          .map((event) => [event.tourName, event])
      ).values()
    ]
      .filter((event) =>
        `${event.tourName} ${event.date} ${event.venue}`.toLocaleLowerCase().includes(search)
      )
      .toSorted((a, b) => a.date.localeCompare(b.date));
  }, [eventQuery, current.performanceId]);

  const songVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => songScrollElement,
    estimateSize: () => 88,
    gap: 8,
    overscan: 5,
    enabled: picking || (isDesktop && !shared)
  });
  const eventVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => eventScrollElement,
    estimateSize: () => 120,
    overscan: 3,
    gap: 12,
    enabled: eventPicking
  });

  useEffect(() => {
    songScrollElement?.scrollTo({ top: 0 });
  }, [query, seriesId, categories, songScrollElement]);

  const pick = (id: string) => {
    if (shared || (selected.has(id) && current.cells[active] !== id)) return;
    const cells = [...current.cells];
    cells[active] = id;
    const freeIndex = active === current.freeIndex ? null : current.freeIndex;
    update({ ...current, cells, freeIndex });
    const next = cells.findIndex(
      (value, index) => index > active && index !== freeIndex && value === null
    );
    const first = cells.findIndex((value, index) => index !== freeIndex && value === null);
    if (next !== -1 || first !== -1) setActive(next !== -1 ? next : first);
  };

  const selectSquare = (index: number) => {
    if (swapSource !== null) {
      if (index === current.freeIndex) return;
      const cells = [...current.cells];
      [cells[index], cells[swapSource]] = [cells[swapSource], cells[index]];
      update({ ...current, cells });
      setSwapSource(null);
    }
    setActive(index);
  };

  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.hash = new URLSearchParams({ b: encodeBingo(current) }).toString();
    return url;
  };

  const shareText = () =>
    t(score.available ? 'bingo.share_result_text' : 'bingo.share_text', {
      title: performance?.tourName ?? t('bingo.title'),
      hits: score.hits,
      total: songTotal,
      lines: score.lines
    });

  const shareToX = () => {
    window.open(xShareUrl(shareText(), shareUrl().href), '_blank', 'noopener,noreferrer');
  };

  const share = async () => {
    const url = shareUrl();
    setShareLink(url.href);
    try {
      await navigator.clipboard.writeText(url.href);
      setMessage(t('bingo.copied'));
    } catch {
      setMessage(t('bingo.share_fallback'));
    }
  };

  const download = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const background = getComputedStyle(cardRef.current).backgroundColor;
      if (canShareImage) {
        await shareElementAsImage(
          cardRef.current,
          'setlist-bingo.png',
          { text: shareText(), url: shareUrl().href },
          background
        );
      } else {
        await downloadElementAsImage(cardRef.current, 'setlist-bingo.png', background);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setMessage(t('bingo.export_error'));
    } finally {
      setExporting(false);
    }
  };

  const franchiseColor = (seriesIds: number[] = []) =>
    seriesIds.length === 1
      ? (series.find((item) => item.id === String(seriesIds[0]))?.color ?? '#e4007f')
      : '#e4007f';

  const skin =
    performance?.eventId === '301'
      ? { paper: CREAM, ink: BROWN, line: BROWN, pink: PINK, party: true }
      : { paper: '#ffffff', ink: '#2a2530', line: '#d9d4de', pink: colors[0], party: false };

  const openSquare = (index: number) => {
    selectSquare(index);
    if (!isDesktop) setPicking(true);
  };

  const shuffle = () => {
    const center = Math.floor(current.cells.length / 2);
    const songs = current.cells.filter((_, index) => index !== center);
    for (let index = songs.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [songs[index], songs[other]] = [songs[other], songs[index]];
    }
    songs.splice(center, 0, current.cells[center]);
    update({ ...current, cells: songs });
  };

  const activeSong = current.cells[active]
    ? data?.songs.songById.get(current.cells[active]!)
    : undefined;

  const miniGrid = (
    <Grid
      style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      gap="1px"
      flexShrink="0"
      borderColor="border.default"
      borderRadius="md"
      borderWidth="1px"
      w="132px"
      bg="border.default"
      overflow="hidden"
    >
      {current.cells.map((id, index) => (
        <styled.button
          type="button"
          key={index}
          aria-label={t('bingo.pick_slot', { number: index + 1 })}
          aria-pressed={active === index}
          onClick={() => selectSquare(index)}
          style={index === current.freeIndex ? { background: 'var(--bingo-accent)' } : undefined}
          cursor="pointer"
          position="relative"
          aspectRatio="1"
          outline={active === index ? '2px solid' : undefined}
          outlineOffset="-2px"
          outlineColor="fg.default"
          color="fg.subtle"
          fontSize="2xs"
          bg="bg.default"
          overflow="hidden"
        >
          {id && hasSongThumb(id) ? (
            <img
              src={getPicUrl(id, 'thumbnail')}
              alt=""
              width="28"
              height="28"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : index === current.freeIndex ? null : (
            index + 1
          )}
        </styled.button>
      ))}
    </Grid>
  );

  const slotActions = (
    <HStack gap="1" flexWrap="wrap">
      <Button
        size="xs"
        variant="ghost"
        hidden={!current.cells[active] || active === current.freeIndex}
        onClick={() => setSwapSource(swapSource === null ? active : null)}
      >
        <FaArrowRightArrowLeft aria-hidden="true" />
        {t(swapSource === null ? 'bingo.swap' : 'bingo.cancel_swap')}
      </Button>
      <Button
        size="xs"
        variant="ghost"
        hidden={gridSize % 2 === 0 || active !== Math.floor(current.cells.length / 2)}
        onClick={() => {
          const cells = [...current.cells];
          cells[active] = null;
          update({ ...current, freeIndex: active, cells });
        }}
      >
        <FaStar aria-hidden="true" />
        {t('bingo.use_free')}
      </Button>
      <Button
        size="xs"
        variant="ghost"
        hidden={!current.cells[active]}
        onClick={() => {
          const cells = [...current.cells];
          cells[active] = null;
          update({ ...current, cells });
        }}
      >
        <FaEraser aria-hidden="true" />
        {t('bingo.clear_cell')}
      </Button>
    </HStack>
  );

  const renderPicker = (withMini: boolean) => (
    <Stack flex="1" gap="0" minW="0" minH="0">
      <HStack
        gap="3"
        alignItems="start"
        borderColor="border.subtle"
        borderBottomWidth="1px"
        py="3"
        px="4"
      >
        {withMini && miniGrid}
        <Stack flex="1" gap="1" minW="0">
          <Text
            style={{ color: 'var(--bingo-accent)' }}
            fontSize="2xs"
            fontWeight="bold"
            letterSpacing="0.14em"
          >
            {t('bingo.pick_slot', { number: active + 1 })}
          </Text>
          <Text fontSize="sm" fontWeight="semibold" lineClamp="2">
            {active === current.freeIndex
              ? t('bingo.free')
              : (activeSong?.name ?? t('bingo.empty_cell'))}
          </Text>
          {slotActions}
          {swapSource !== null && (
            <Text role="status" color="fg.muted" fontSize="xs">
              {t('bingo.swap_prompt')}
            </Text>
          )}
          {selected.size === songTotal && (
            <Text color="fg.muted" fontSize="xs">
              {t('bingo.complete')}
            </Text>
          )}
        </Stack>
      </HStack>
      <HStack gap="3" borderColor="border.subtle" borderBottomWidth="1px" py="2.5" px="4">
        <Box style={{ color: 'var(--bingo-accent)' }} fontSize="md">
          <FaMagnifyingGlass aria-hidden="true" />
        </Box>
        <Input
          id="bingo-song-search"
          aria-label={t('bingo.search_songs')}
          placeholder={t('bingo.search_songs')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          border="none"
          outline="none"
          h="auto"
          px="0"
          fontSize="md"
          bgColor="transparent"
          _focus={{ boxShadow: 'none' }}
        />
        {query && (
          <Button
            size="xs"
            variant="ghost"
            aria-label={t('bingo.clear_search')}
            onClick={() => setQuery('')}
          >
            <FaXmark aria-hidden="true" />
          </Button>
        )}
      </HStack>
      <HStack
        aria-label={t('bingo.series')}
        gap="1.5"
        flexShrink="0"
        minW="0"
        py="2.5"
        px="4"
        overflowX="auto"
      >
        {[
          { id: '', name: t('bingo.all_series'), color: '#e4007f' },
          ...(performance ? [{ id: 'live', name: t('bingo.this_live'), color: colors[0] }] : []),
          ...series
        ].map((item) => (
          <styled.button
            key={item.id || 'all'}
            type="button"
            aria-pressed={seriesId === item.id}
            onClick={() => setSeriesId(item.id)}
            style={{
              background: seriesId === item.id ? item.color : undefined,
              color: seriesId === item.id ? foregroundFor(item.color) : undefined,
              borderColor: seriesId === item.id ? item.color : undefined
            }}
            cursor="pointer"
            flexShrink="0"
            borderColor="border.default"
            borderRadius="full"
            borderWidth="1px"
            h="8"
            px="3"
            fontSize="xs"
            fontWeight="semibold"
            whiteSpace="nowrap"
            _focusVisible={{ outline: '2px solid', outlineOffset: '2px' }}
            _hover={{ bg: seriesId === item.id ? undefined : 'bg.subtle' }}
          >
            {item.id && item.id !== 'live' ? getSeriesShortName(item.id, item.name) : item.name}
          </styled.button>
        ))}
      </HStack>
      <HStack aria-label={t('events.category')} gap="1.5" flexShrink="0" px="4" pb="2.5">
        {SONG_CATEGORIES.map((category) => {
          const on = categories.includes(category);
          return (
            <styled.button
              key={category}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setCategories(
                  on ? categories.filter((item) => item !== category) : [...categories, category]
                )
              }
              cursor="pointer"
              borderColor={on ? 'fg.default' : 'border.default'}
              borderRadius="full"
              borderWidth="1px"
              h="7"
              px="3"
              color={on ? 'bg.default' : 'fg.default'}
              fontSize="xs"
              fontWeight="semibold"
              bg={on ? 'fg.default' : 'transparent'}
              whiteSpace="nowrap"
              _focusVisible={{ outline: '2px solid', outlineOffset: '2px' }}
              _hover={{ bg: on ? 'fg.default' : 'bg.subtle' }}
            >
              {t(`mypick.row_${category}`)}
            </styled.button>
          );
        })}
      </HStack>
      <Text px="4" pb="1" color="fg.muted" fontSize="xs">
        {t('bingo.results', { count: results.length, shown: results.length })}
      </Text>
      <Box ref={setSongScrollElement} flex="1" minH="0" px="2" pb="2" overflowY="auto">
        {results.length === 0 && (
          <Text py="4" px="2" fontSize="sm">
            {t('bingo.no_results')}
          </Text>
        )}
        <Box style={{ height: songVirtualizer.getTotalSize() }} position="relative">
          {songVirtualizer.getVirtualItems().map((row) => {
            const song = results[row.index];
            const used = selected.has(song.id);
            const here = current.cells[active] === song.id;
            const color = franchiseColor(song.seriesIds);
            return (
              <styled.button
                ref={songVirtualizer.measureElement}
                data-index={row.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${row.start}px)`
                }}
                type="button"
                key={song.id}
                disabled={used && !here}
                onClick={() => pick(song.id)}
                cursor="pointer"
                display="flex"
                gap="3"
                alignItems="center"
                borderRadius="md"
                minH="60px"
                py="2"
                px="2"
                textAlign="left"
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
                _focusVisible={{ outline: '2px solid', outlineColor: 'accent.default' }}
                _active={{ bg: 'bg.muted' }}
                _hover={{ bg: 'bg.subtle' }}
              >
                <Box
                  style={{ boxShadow: `inset 0 -3px 0 ${color}` }}
                  position="relative"
                  flexShrink="0"
                  borderRadius="sm"
                  w="11"
                  h="11"
                  bg="bg.muted"
                  overflow="hidden"
                >
                  {hasSongThumb(song.id) && (
                    <img
                      src={getPicUrl(song.id, 'thumbnail')}
                      alt=""
                      width="44"
                      height="44"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <Box
                    style={{ background: color }}
                    position="absolute"
                    left="0"
                    right="0"
                    bottom="0"
                    h="3px"
                  />
                </Box>
                <Stack flex="1" gap="0.5" minW="0">
                  <Text fontSize="sm" fontWeight="semibold" lineClamp="1">
                    {song.name}
                  </Text>
                  <HStack gap="1.5" minW="0">
                    {song.seriesIds.slice(0, 1).map((id) => (
                      <SeriesBadge key={id} seriesId={String(id)} />
                    ))}
                    <Text color="fg.muted" fontSize="xs" lineClamp="1">
                      {here
                        ? t('bingo.in_slot')
                        : used
                          ? t('bingo.picked')
                          : song.artists
                              ?.map((artist) => artistById.get(artist.id)?.name)
                              .filter(Boolean)
                              .join(' / ')}
                    </Text>
                  </HStack>
                </Stack>
                <Box
                  style={
                    used
                      ? { background: 'var(--bingo-accent)', color: 'var(--bingo-foreground)' }
                      : { borderColor: 'var(--bingo-accent)', color: 'var(--bingo-accent)' }
                  }
                  display="grid"
                  flexShrink="0"
                  borderRadius="full"
                  borderWidth={used ? '0' : '1.5px'}
                  w="7"
                  h="7"
                  fontSize="xs"
                  placeItems="center"
                >
                  {used ? <FaCheck aria-hidden="true" /> : <FaPlus aria-hidden="true" />}
                </Box>
              </styled.button>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );

  const actions = [
    {
      key: 'x',
      icon: <FaXTwitter aria-hidden="true" />,
      label: t('bingo.share_x'),
      onClick: shareToX
    },
    { key: 'link', icon: <FaLink aria-hidden="true" />, label: t('bingo.share'), onClick: share },
    {
      key: 'image',
      icon: canShareImage ? <FaShareNodes aria-hidden="true" /> : <FaDownload aria-hidden="true" />,
      label: t(canShareImage ? 'bingo.share_image' : 'bingo.download'),
      onClick: download
    },
    ...(shared
      ? []
      : [
          {
            key: 'shuffle',
            icon: <FaShuffle aria-hidden="true" />,
            label: t('bingo.shuffle'),
            onClick: shuffle
          }
        ])
  ];

  return (
    <Stack as="main" style={themeStyle} gap="4" py={{ base: '4', md: '6' }}>
      <Text
        as="h1"
        color="fg.default"
        fontSize={{ base: 'xl', md: '2xl' }}
        fontWeight="900"
        textAlign="center"
      >
        {t('bingo.title')}
      </Text>
      {loadError ? (
        <Stack role="alert">
          <Text>{t('bingo.load_error')}</Text>
          <Button onClick={() => window.location.reload()}>{t('bingo.reload')}</Button>
        </Stack>
      ) : !data ? (
        <Text role="status">{t('bingo.loading')}</Text>
      ) : (
        <>
          <Dialog.Root
            lazyMount
            unmountOnExit
            open={eventPicking}
            onOpenChange={(event) => setEventPicking(event.open)}
          >
            <Portal>
              <Dialog.Backdrop zIndex="modal" />
              <Dialog.Positioner zIndex="modal">
                <Dialog.Content
                  w="calc(100vw - 24px)"
                  minW="0"
                  maxW="680px"
                  maxH="85dvh"
                  overflowY="auto"
                >
                  <Stack gap="4" p="4">
                    <HStack justifyContent="space-between">
                      <Dialog.Title>{t('bingo.choose_performance')}</Dialog.Title>
                      <Dialog.CloseTrigger asChild>
                        <Button variant="ghost">
                          <FaXmark aria-hidden="true" />
                          {t('bingo.done')}
                        </Button>
                      </Dialog.CloseTrigger>
                    </HStack>
                    <styled.label htmlFor="bingo-event-search">
                      {t('bingo.search_performances')}
                    </styled.label>
                    <Input
                      id="bingo-event-search"
                      value={eventQuery}
                      onChange={(event) => setEventQuery(event.target.value)}
                    />
                    <Box ref={setEventScrollElement} h="55dvh" overflowY="auto">
                      {events.length === 0 && <Text>{t('bingo.no_results')}</Text>}
                      <Box style={{ height: eventVirtualizer.getTotalSize() }} position="relative">
                        {eventVirtualizer.getVirtualItems().map((row) => {
                          const event = events[row.index];
                          const accent =
                            event.seriesIds.length === 1
                              ? (series.find((item) => item.id === event.seriesIds[0])?.color ??
                                '#e4007f')
                              : '#e4007f';
                          const dates = sortedPerformances
                            .filter(
                              (day) =>
                                day.tourName === event.tourName &&
                                day.date >= new Date().toLocaleDateString('sv-SE')
                            )
                            .map((day) => day.date)
                            .toSorted();
                          return (
                            <Card.Root key={event.id} asChild>
                              <styled.button
                                ref={eventVirtualizer.measureElement}
                                data-index={row.index}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  transform: `translateY(${row.start}px)`,
                                  borderColor: `${accent}80`,
                                  boxShadow: `0 4px 12px ${accent}20`
                                }}
                                type="button"
                                key={event.id}
                                onClick={() => {
                                  update({ ...current, performanceId: `-${event.id}` });
                                  setSeriesId('live');
                                  setEventPicking(false);
                                }}
                                cursor="pointer"
                                flexShrink="0"
                                borderColor="border.default"
                                borderRadius="lg"
                                borderWidth="1px"
                                w="full"
                                minW="0"
                                minH="64px"
                                p="0"
                                textAlign="left"
                                overflowWrap="anywhere"
                                whiteSpace="normal"
                                _focusVisible={{
                                  outline: '2px solid',
                                  outlineColor: 'accent.default'
                                }}
                                _hover={{ bg: 'bg.subtle' }}
                              >
                                <Card.Body p="3">
                                  <HStack gap="2" alignItems="start">
                                    <Stack flex="1" gap="1" minW="0">
                                      <Text color="fg.muted" fontSize="xs">
                                        {dates[0] === dates.at(-1)
                                          ? dates[0]
                                          : `${dates[0]} ~ ${dates.at(-1)}`}{' '}
                                      </Text>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="semibold"
                                        overflowWrap="anywhere"
                                        whiteSpace="normal"
                                      >
                                        {event.tourName}
                                      </Text>
                                      <HStack gap="1" flexWrap="wrap">
                                        {event.seriesIds.map((id) => (
                                          <SeriesBadge key={id} seriesId={id} />
                                        ))}
                                      </HStack>
                                    </Stack>
                                    <EventThumb performance={event} tourOnly />
                                  </HStack>
                                </Card.Body>
                              </styled.button>
                            </Card.Root>
                          );
                        })}
                      </Box>
                    </Box>
                  </Stack>
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>
          <Grid
            gap={{ base: '4', lg: '8' }}
            justifyContent="center"
            alignItems="start"
            gridTemplateColumns={{
              base: 'minmax(0, 1fr)',
              lg: shared ? 'minmax(0, 600px)' : 'minmax(0, 580px) minmax(0, 1fr)'
            }}
          >
            <Stack gap="3" minW="0">
              {shared ? (
                <HStack gap="2" justifyContent="space-between" flexWrap="wrap">
                  <Text color="fg.muted" fontSize="xs">
                    {t('bingo.shared')}
                  </Text>
                  <HStack gap="1" flexWrap="wrap">
                    <Button
                      size="sm"
                      onClick={() => {
                        update({ ...shared, cells: [...shared.cells] });
                        setSeriesId(shared.performanceId ? 'live' : '');
                        setShared(null);
                        window.history.replaceState(
                          null,
                          '',
                          window.location.pathname + window.location.search
                        );
                      }}
                      style={{
                        background: skin.pink,
                        color: foregroundFor(skin.pink)
                      }}
                      borderRadius="full"
                      fontWeight="500"
                    >
                      {t('bingo.copy')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShared(null);
                        window.history.replaceState(
                          null,
                          '',
                          window.location.pathname + window.location.search
                        );
                      }}
                      borderRadius="full"
                      fontWeight="500"
                    >
                      {t('bingo.own')}
                    </Button>
                  </HStack>
                </HStack>
              ) : (
                <Stack gap="2">
                  <HStack gap="2" flexWrap="wrap">
                    <styled.button
                      type="button"
                      onClick={() => setEventPicking(true)}
                      cursor="pointer"
                      display="flex"
                      flex="1"
                      gap="2"
                      alignItems="center"
                      borderColor="border.default"
                      borderRadius="full"
                      borderWidth="1px"
                      minW="0"
                      minH="10"
                      py="1.5"
                      pl="1.5"
                      pr="4"
                      textAlign="left"
                      bg="bg.default"
                      _focusVisible={{ outline: '2px solid', outlineOffset: '2px' }}
                      _hover={{ bg: 'bg.subtle' }}
                    >
                      <Box
                        style={{
                          background: 'var(--bingo-accent)',
                          color: 'var(--bingo-foreground)'
                        }}
                        display="grid"
                        flexShrink="0"
                        borderRadius="full"
                        w="7"
                        h="7"
                        fontSize="xs"
                        placeItems="center"
                      >
                        <FaCalendarDays aria-hidden="true" />
                      </Box>
                      <Text fontSize="sm" fontWeight="semibold" lineClamp="1">
                        {performance?.tourName ?? t('bingo.choose_performance')}
                      </Text>
                    </styled.button>
                    {current.performanceId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          update({ ...current, performanceId: '' });
                          setSeriesId('');
                        }}
                      >
                        <FaXmark aria-hidden="true" />
                        {t('bingo.remove_live')}
                      </Button>
                    )}
                  </HStack>
                  <HStack gap="2" flexWrap="wrap">
                    {performance && (
                      <Box flex="1" minW="160px">
                        <NativeSelect
                          aria-label={t('bingo.choose_day')}
                          value={
                            current.performanceId.startsWith('-') ? 'any' : current.performanceId
                          }
                          onChange={(value) =>
                            update({
                              ...current,
                              performanceId: value === 'any' ? `-${performance.id}` : value
                            })
                          }
                          options={[
                            { value: 'any', label: t('bingo.any_day') },
                            ...liveDays
                              .filter(
                                (day) =>
                                  day.date >= new Date().toLocaleDateString('sv-SE') &&
                                  !day.canceled
                              )
                              .map((day) => ({
                                value: day.id,
                                label: `${day.date} ${day.performanceName ?? day.concertName ?? ''}`
                              }))
                          ]}
                        />
                      </Box>
                    )}
                    <HStack
                      aria-label={t('bingo.grid_size')}
                      gap="0"
                      borderColor="border.default"
                      borderRadius="full"
                      borderWidth="1px"
                      p="0.5"
                      bg="bg.default"
                    >
                      {[3, 4, 5].map((size) => (
                        <styled.button
                          key={size}
                          type="button"
                          aria-pressed={gridSize === size}
                          onClick={() => {
                            gridDrafts.current[String(gridSize)] = current;
                            const saved = gridDrafts.current[String(size)];
                            if (saved) {
                              update({ ...saved, performanceId: current.performanceId });
                              setActive(0);
                              return;
                            }
                            const freeIndex =
                              current.freeIndex === null || size % 2 === 0
                                ? null
                                : Math.floor((size * size) / 2);
                            const ids = current.cells.filter((id) => id !== null);
                            const cells = Array.from({ length: size * size }, (_, index) =>
                              index === freeIndex ? null : (ids.shift() ?? null)
                            );
                            update({ ...current, cells, freeIndex });
                            setActive(0);
                          }}
                          style={
                            gridSize === size
                              ? {
                                  background: 'var(--bingo-accent)',
                                  color: 'var(--bingo-foreground)'
                                }
                              : undefined
                          }
                          cursor="pointer"
                          borderRadius="full"
                          h="8"
                          px="3"
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {size}×{size}
                        </styled.button>
                      ))}
                    </HStack>
                    <Text
                      flex="1"
                      color="fg.muted"
                      fontSize="xs"
                      textAlign="right"
                      whiteSpace="nowrap"
                    >
                      {t('bingo.filled', { count: selected.size, total: songTotal })}
                    </Text>
                  </HStack>
                </Stack>
              )}

              <Box
                ref={cardRef}
                style={{ background: skin.paper, color: skin.ink, borderColor: skin.line }}
                position="relative"
                borderRadius="3xl"
                borderWidth="3px"
                px={{ base: '3', md: '5' }}
                pb={{ base: '3', md: '4' }}
                fontFamily="'Zen Maru Gothic', sans-serif"
                overflow="hidden"
              >
                {skin.party && (
                  <Box
                    aria-hidden="true"
                    style={{
                      backgroundImage: `radial-gradient(${skin.ink}14 1.2px, transparent 1.6px)`,
                      backgroundSize: '14px 14px'
                    }}
                    inset="0"
                    position="absolute"
                    pointerEvents="none"
                  />
                )}
                {skin.party && (
                  <HStack
                    aria-hidden="true"
                    style={{ borderColor: BROWN }}
                    position="relative"
                    gap="0"
                    justifyContent="space-between"
                    borderTopWidth="2px"
                    mx={{ base: '-2', md: '-4' }}
                    px="2"
                    borderStyle="dotted"
                  >
                    {Array.from({ length: 11 }, (_, index) => (
                      <Box
                        key={index}
                        style={{
                          background: BUNTING[index % BUNTING.length],
                          clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
                        }}
                        w={{ base: '4', md: '6' }}
                        h={{ base: '4', md: '6' }}
                      />
                    ))}
                  </HStack>
                )}
                {skin.party &&
                  [
                    { top: '14%', left: '5%', size: '14px', color: '#ffd84d' },
                    { top: '9%', right: '7%', size: '18px', color: '#8fd3ff' },
                    { top: '22%', right: '3%', size: '10px', color: PINK }
                  ].map((sparkle, index) => (
                    <Box
                      key={index}
                      aria-hidden="true"
                      style={{
                        top: sparkle.top,
                        left: sparkle.left,
                        right: sparkle.right,
                        width: sparkle.size,
                        height: sparkle.size,
                        background: sparkle.color,
                        clipPath:
                          'polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)'
                      }}
                      position="absolute"
                    />
                  ))}
                <Stack
                  position="relative"
                  gap="1"
                  alignItems="center"
                  pt="2"
                  pb="2"
                  textAlign="center"
                >
                  {performance && !current.performanceId.startsWith('-') && (
                    <Text fontSize={{ base: '2xs', md: 'xs' }} fontWeight="700" opacity="0.75">
                      {performance.date}{' '}
                      {performance.performanceName ?? performance.concertName ?? ''}
                    </Text>
                  )}
                  <Text
                    as="h2"
                    textWrap="balance"
                    fontSize={{ base: 'lg', md: '2xl' }}
                    fontWeight="700"
                    lineHeight="1.25"
                    overflowWrap="anywhere"
                  >
                    {performance ? performance.tourName : t('bingo.default_title')}
                  </Text>
                  {current.performanceId && !performance && (
                    <Text fontSize="sm">
                      {t('bingo.unknown_performance', { id: current.performanceId })}
                    </Text>
                  )}
                  <Text
                    aria-hidden="true"
                    style={{ color: skin.pink }}
                    pl="0.3em"
                    fontSize={{ base: 'xl', md: '3xl' }}
                    fontWeight="900"
                    letterSpacing="0.3em"
                    lineHeight="1"
                  >
                    BINGO
                  </Text>
                </Stack>
                <Grid
                  style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                  position="relative"
                  gap={{ base: '2', md: '3' }}
                >
                  {current.cells.map((id, index) => {
                    const song = id ? data.songs.songById.get(id) : null;
                    const free = index === current.freeIndex;
                    const marked = score.available && score.marked[index];
                    const winning = score.winningCells.has(index);
                    const franchise = franchiseColor(song?.seriesIds);
                    const thumb = song && hasSongThumb(song.id);
                    const isActive =
                      !shared && !exporting && active === index && (picking || isDesktop);
                    const label = free
                      ? t('bingo.free')
                      : (song?.name ??
                        (id ? t('bingo.unknown_song', { id }) : t('bingo.empty_cell')));
                    return (
                      <styled.button
                        type="button"
                        key={index}
                        disabled={Boolean(shared)}
                        aria-label={`${index + 1}: ${label}${marked ? ` (${t('bingo.hit')})` : ''}`}
                        aria-pressed={!shared && !free ? active === index : undefined}
                        onClick={() => openSquare(index)}
                        data-bingo-cell={index}
                        data-hit={marked || undefined}
                        data-franchise={song ? franchise : undefined}
                        style={{
                          borderColor: skin.party ? skin.line : 'transparent',
                          background: free ? skin.pink : '#ffffff',
                          boxShadow: `0 1px 4px rgba(42,37,48,0.12)${isActive ? `, 0 0 0 2px ${skin.paper}, 0 0 0 4px ${skin.ink}` : ''}`
                        }}
                        cursor={shared ? 'default' : 'pointer'}
                        display="flex"
                        position="relative"
                        flexDirection="column"
                        borderRadius={{ base: 'md', md: 'lg' }}
                        borderWidth={skin.party ? '1.5px' : '0'}
                        minW="0"
                        minH="0"
                        p="0"
                        color="inherit"
                        fontFamily="inherit"
                        overflow="hidden"
                        transition="transform 120ms ease"
                        _focusVisible={{ outline: '3px solid', outlineOffset: '2px' }}
                        _hover={!shared ? { transform: 'translateY(-1px)' } : undefined}
                      >
                        {song && (
                          <Box position="relative" aspectRatio="1" overflow="hidden">
                            {thumb && (
                              <img
                                src={getPicUrl(song.id, 'thumbnail')}
                                alt=""
                                width="180"
                                height="180"
                                crossOrigin="anonymous"
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            )}
                          </Box>
                        )}
                        {song && (
                          <Box
                            style={{ borderColor: franchise }}
                            display="flex"
                            flexShrink="0"
                            justifyContent="center"
                            alignItems="center"
                            borderTopWidth="3px"
                            h="calc(2.4em + 6px)"
                            px="1"
                            fontSize={{ base: '8px', sm: '10px', md: '11px' }}
                          >
                            <Text
                              fontSize="inherit"
                              fontWeight="500"
                              lineHeight="1.2"
                              textAlign="center"
                              lineClamp="2"
                              overflowWrap="anywhere"
                            >
                              {label}
                            </Text>
                          </Box>
                        )}
                        {!song && !free && (
                          <Stack
                            gap="0"
                            justifyContent="center"
                            alignItems="center"
                            aspectRatio="1"
                            opacity="0.4"
                          >
                            <Text fontSize={{ base: 'xs', md: 'md' }} fontWeight="900">
                              {String(index + 1).padStart(2, '0')}
                            </Text>
                            {!shared && (
                              <Box fontSize="2xs">
                                <FaPlus aria-hidden="true" />
                              </Box>
                            )}
                          </Stack>
                        )}
                        {free && (
                          <Stack
                            gap="0"
                            justifyContent="center"
                            alignItems="center"
                            aspectRatio="1"
                          >
                            <Text
                              style={{ color: '#ffffff' }}
                              fontSize={{ base: 'sm', md: 'xl' }}
                              fontWeight="900"
                              letterSpacing="0.08em"
                              lineHeight="1"
                            >
                              FREE
                            </Text>
                            <Text style={{ color: '#ffffff' }} fontSize={{ base: 'xs', md: 'md' }}>
                              ♡
                            </Text>
                          </Stack>
                        )}
                        {!song && (
                          <Box
                            h="calc(2.4em + 6px)"
                            fontSize={{ base: '8px', sm: '10px', md: '11px' }}
                          />
                        )}
                        {marked && !free && (
                          <Box
                            aria-hidden="true"
                            style={{
                              background: winning ? franchise : '#ffffff',
                              color: winning ? foregroundFor(franchise) : franchise,
                              borderColor: skin.ink
                            }}
                            display="grid"
                            position="absolute"
                            top="1"
                            right="1"
                            transform="rotate(-8deg)"
                            borderRadius="full"
                            borderWidth="2px"
                            w={{ base: '5', md: '7' }}
                            h={{ base: '5', md: '7' }}
                            fontSize={{ base: '2xs', md: 'xs' }}
                            placeItems="center"
                          >
                            <FaCheck />
                          </Box>
                        )}
                      </styled.button>
                    );
                  })}
                </Grid>
                {score.available && (
                  <HStack
                    position="relative"
                    gap="2"
                    justifyContent="center"
                    pt="4"
                    flexWrap="wrap"
                  >
                    <Text
                      style={{ background: skin.party ? GREEN : skin.pink }}
                      borderRadius="full"
                      py="1"
                      px="4"
                      color="white"
                      fontSize={{ base: 'sm', md: 'md' }}
                      fontWeight="900"
                    >
                      {t('bingo.hits', { count: score.hits, total: songTotal })} ·{' '}
                      {t('bingo.lines', { count: score.lines })}
                    </Text>
                    {score.unresolved > 0 && (
                      <Text fontSize="xs" opacity="0.75">
                        {t('bingo.unresolved', { count: score.unresolved })}
                      </Text>
                    )}
                  </HStack>
                )}
              </Box>

              <Grid
                aria-label={t('bingo.sharing')}
                style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
                gap="1"
              >
                {actions.map((action) => (
                  <styled.button
                    key={action.key}
                    type="button"
                    disabled={
                      (action.key === 'image' && exporting) ||
                      (action.key === 'shuffle' && selected.size < 2)
                    }
                    onClick={action.onClick}
                    cursor="pointer"
                    display="flex"
                    gap="1.5"
                    flexDirection="column"
                    alignItems="center"
                    borderRadius="xl"
                    minW="0"
                    py="2.5"
                    px="1"
                    _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
                    _focusVisible={{ outline: '2px solid', outlineOffset: '2px' }}
                    _hover={{ bg: 'bg.subtle' }}
                  >
                    <Box
                      style={
                        action.key === 'x'
                          ? {
                              background: '#000000',
                              color: '#ffffff',
                              boxShadow: '0 1px 4px rgba(42,37,48,0.15)'
                            }
                          : {
                              background: action.key === 'shuffle' ? '#ffd84d' : skin.pink,
                              color: action.key === 'shuffle' ? skin.ink : foregroundFor(skin.pink),
                              boxShadow: '0 1px 4px rgba(42,37,48,0.15)'
                            }
                      }
                      display="grid"
                      borderRadius="full"
                      borderWidth="0"
                      w="11"
                      h="11"
                      fontSize="lg"
                      placeItems="center"
                    >
                      {action.icon}
                    </Box>
                    <Text
                      fontSize="11px"
                      fontWeight="500"
                      lineHeight="1.2"
                      textAlign="center"
                      whiteSpace="nowrap"
                    >
                      {action.label}
                    </Text>
                  </styled.button>
                ))}
              </Grid>
              <Box role="status" aria-live="polite">
                {message && <Text fontSize="sm">{message}</Text>}
                {shareLink && (
                  <Input
                    aria-label={t('bingo.share')}
                    readOnly
                    value={shareLink}
                    onFocus={(event) => event.target.select()}
                  />
                )}
              </Box>
            </Stack>

            {!shared && isDesktop && (
              <Stack
                position="sticky"
                top="6"
                gap="0"
                borderColor="border.default"
                borderRadius="2xl"
                borderWidth="1px"
                h="calc(100dvh - 160px)"
                minH="520px"
                bg="bg.default"
                shadow="sm"
                overflow="hidden"
              >
                {renderPicker(false)}
              </Stack>
            )}
          </Grid>

          {!shared && !isDesktop && (
            <Box
              zIndex="docked"
              position="sticky"
              bottom={{ base: 'calc(env(safe-area-inset-bottom) + 72px)', md: '4' }}
            >
              <Button
                size="lg"
                onClick={() => setPicking(true)}
                style={{
                  background: skin.pink,
                  color: foregroundFor(skin.pink),
                  boxShadow: '0 6px 18px rgba(42,37,48,0.22)'
                }}
                borderRadius="full"
                w="full"
                fontWeight="700"
              >
                <FaMusic aria-hidden="true" />
                {t('bingo.choose_songs')}
                <Text as="span" fontSize="sm" opacity="0.8">
                  {selected.size}/{songTotal}
                </Text>
              </Button>
            </Box>
          )}

          {!shared && !isDesktop && (
            <Dialog.Root
              lazyMount
              unmountOnExit
              open={picking}
              onOpenChange={(event) => setPicking(event.open)}
            >
              <Portal>
                <Dialog.Backdrop zIndex="modal" />
                <Dialog.Positioner zIndex="modal" alignItems="flex-end" p="0">
                  <Dialog.Content
                    style={themeStyle}
                    display="flex"
                    flexDirection="column"
                    borderTopRadius="2xl"
                    borderBottomRadius="0"
                    w="full"
                    maxW="640px"
                    h="88dvh"
                    p="0"
                    overflow="hidden"
                  >
                    <HStack justifyContent="space-between" px="4" pt="3" pb="1">
                      <Dialog.Title fontSize="md" fontWeight="black">
                        {t('bingo.choose_songs')}
                      </Dialog.Title>
                      <Dialog.CloseTrigger asChild>
                        <Button
                          size="sm"
                          style={{
                            background: 'var(--bingo-accent)',
                            color: 'var(--bingo-foreground)'
                          }}
                        >
                          <FaCheck aria-hidden="true" />
                          {t('bingo.done')}
                        </Button>
                      </Dialog.CloseTrigger>
                    </HStack>
                    {renderPicker(true)}
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          )}
        </>
      )}
    </Stack>
  );
}
