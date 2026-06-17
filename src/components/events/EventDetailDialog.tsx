import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaCircleInfo,
  FaCopy,
  FaStar,
  FaXTwitter,
  FaXmark
} from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from './SeriesBadge';
import { CategoryBadge } from './CategoryBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { NativeSelect } from './NativeSelect';
import { VenueText } from './VenueText';
import { legLabel } from './TourCard';
import { SongDetailDialog } from '~/components/songs/SongDetailDialog';
import { SongThumb } from '~/components/songs/SongThumb';
import { useAttendance } from '~/hooks/useAttendance';
import {
  useArtistById,
  usePerformanceById,
  usePerformances,
  useSetlist,
  useSetlists,
  useSongById
} from '~/hooks/useData';
import { useToaster } from '~/context/ToasterContext';
import { daysFromToday, isFutureEvent } from '~/utils/event-filter';
import { localizedName } from '~/utils/names';
import {
  copyTextToClipboard,
  eventernoteSearchUrl,
  formatEventShareText,
  xShareUrl
} from '~/utils/share';
import { hasSongThumb } from '~/utils/song-thumbs';
import { groupByTour } from '~/utils/tour';
import {
  buildSetlistInsights,
  compareSetlists,
  getSongDebutPerformance,
  getSongFirstWitnessPerformance,
  isPerformanceAtOrBefore,
  type SongSetlistInsight
} from '~/utils/setlist-insights';
import type { Performance, SetlistItem } from '~/types';
import type { WatchType } from '~/types/attendance';

type SetlistPerformanceOption = {
  value: string;
  date: string;
  title: string;
  subtitle: string;
  venue: string;
  isSameTour: boolean;
  searchText: string;
};

function SetlistPerformancePicker({
  label,
  value,
  options,
  currentPerformanceId,
  previousPerformanceId,
  onChange
}: {
  label: string;
  value: string;
  options: SetlistPerformanceOption[];
  currentPerformanceId: string;
  previousPerformanceId?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const matches = normalizedQuery
      ? options.filter((option) => option.searchText.includes(normalizedQuery))
      : options.filter((option) => option.isSameTour);
    const fallbackMatches = normalizedQuery || matches.length > 0 ? matches : options;
    return fallbackMatches.slice(0, normalizedQuery ? 50 : 20);
  }, [normalizedQuery, options]);

  return (
    <Stack
      gap="2"
      borderColor="border.subtle"
      borderRadius="l2"
      borderWidth="1px"
      minW="0"
      p="3"
      bgColor="bg.canvas"
    >
      <HStack gap="2" justifyContent="space-between" alignItems="center">
        <Text color="fg.muted" fontSize="xs" fontWeight="semibold">
          {label}
        </Text>
        <HStack gap="1">
          {previousPerformanceId && (
            <Button size="xs" variant="ghost" onClick={() => onChange(previousPerformanceId)}>
              {t('events.setlist_picker_previous')}
            </Button>
          )}
          <Button size="xs" variant="ghost" onClick={() => onChange(currentPerformanceId)}>
            {t('events.setlist_picker_current')}
          </Button>
        </HStack>
      </HStack>

      {selected && (
        <Stack gap="0.5" borderRadius="l2" py="2" px="3" bgColor="bg.subtle">
          <Text fontSize="xs" fontWeight="semibold" lineClamp={2}>
            {selected.title}
          </Text>
          <Text color="fg.muted" fontSize="2xs" lineClamp={2}>
            {selected.date} · {selected.subtitle}
            {selected.venue ? ` · ${selected.venue}` : ''}
          </Text>
        </Stack>
      )}

      <Input
        size="sm"
        value={query}
        aria-label={t('events.setlist_picker_search')}
        placeholder={t('events.setlist_picker_search')}
        onChange={(event) => setQuery(event.target.value)}
      />

      <Stack gap="1" maxH="64" pr="1" overflowY="auto">
        {filteredOptions.map((option) => {
          const isSelected = option.value === value;
          return (
            <Button
              key={option.value}
              size="sm"
              variant={isSelected ? 'subtle' : 'ghost'}
              onClick={() => onChange(option.value)}
              justifyContent="flex-start"
              h="auto"
              py="2"
              px="2"
              textAlign="left"
            >
              <Stack gap="0.5" alignItems="stretch" minW="0">
                <Text fontSize="xs" fontWeight={isSelected ? 'semibold' : 'medium'} lineClamp={2}>
                  {option.title}
                </Text>
                <Text color="fg.muted" fontSize="2xs" lineClamp={2}>
                  {option.date} · {option.subtitle}
                  {option.venue ? ` · ${option.venue}` : ''}
                </Text>
              </Stack>
            </Button>
          );
        })}
        {filteredOptions.length === 0 && (
          <Text py="3" px="2" color="fg.muted" fontSize="xs">
            {t('common.no_results')}
          </Text>
        )}
      </Stack>

      <Text color="fg.subtle" fontSize="2xs">
        {normalizedQuery
          ? t('events.setlist_picker_filtered_hint', { count: filteredOptions.length })
          : t('events.setlist_picker_relevant_hint')}
      </Text>
    </Stack>
  );
}

export function SetlistItemRow({
  item,
  index,
  showArtists,
  witnessInfo,
  setlistInsight,
  onSelectSong
}: {
  item: SetlistItem;
  index: number;
  showArtists: boolean;
  witnessInfo?: { count: number; isFirst: boolean };
  setlistInsight?: SongSetlistInsight;
  onSelectSong?: (songId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const songById = useSongById();
  const artistById = useArtistById();
  if (item.type !== 'song') {
    return (
      <HStack gap="2" py="0.5">
        <Box minW="8" />
        <Badge size="sm" variant="outline" color="fg.muted">
          {item.title ?? item.customSongName ?? item.type.toUpperCase()}
        </Badge>
      </HStack>
    );
  }
  const song = item.songId ? songById.get(item.songId) : undefined;
  const songLabel = song
    ? localizedName(i18n.language, song.name, song.englishName)
    : (item.customSongName ?? '');
  const artistNames = [
    ...new Set(
      (song?.artists ?? [])
        .map((a) => artistById.get(a.id))
        .filter(Boolean)
        .map((a) => localizedName(i18n.language, a!.name, a!.englishName))
    )
  ].join('・');
  return (
    <HStack gap="2" alignItems="flex-start" py="1">
      <Text
        minW="8"
        pt="1"
        color="fg.subtle"
        fontSize="sm"
        fontVariantNumeric="tabular-nums"
        textAlign="right"
      >
        {index}.
      </Text>
      {song && hasSongThumb(song.id) && <SongThumb songId={song.id} />}
      <Stack flex="1" gap="0.5" minW="0">
        <Text fontSize="sm" lineClamp={1}>
          {songLabel}
        </Text>
        <Wrap gap="1" color="fg.subtle" fontSize="2xs">
          {setlistInsight?.isDebut && (
            <Badge size="sm" variant="solid">
              {t('events.song_debut')}
            </Badge>
          )}
          {witnessInfo?.isFirst && (
            <Badge size="sm" variant="solid">
              {t('events.first_witness')}
            </Badge>
          )}
          {setlistInsight?.daysSincePreviousPerformance !== undefined && (
            <Text fontVariantNumeric="tabular-nums">
              {t('events.song_days_since_previous', {
                count: setlistInsight.daysSincePreviousPerformance
              })}
            </Text>
          )}
          {witnessInfo && witnessInfo.count > 1 && (
            <Text color="accent.text" fontSize="xs" fontVariantNumeric="tabular-nums">
              ×{witnessInfo.count}
            </Text>
          )}
          {showArtists && artistNames && <Text lineClamp={1}>{artistNames}</Text>}
          {item.remarks && <Text lineClamp={1}>{item.remarks}</Text>}
        </Wrap>
      </Stack>
      {song && onSelectSong && (
        <IconButton
          aria-label={`${t('events.view_detail')}: ${songLabel}`}
          title={t('events.view_detail')}
          variant="ghost"
          size="xs"
          onClick={() => onSelectSong(song.id)}
          flexShrink={0}
        >
          <FaCircleInfo />
        </IconButton>
      )}
    </HStack>
  );
}

export function EventDetailDialog({
  performance: externalPerformance,
  open,
  onClose
}: {
  performance?: Performance;
  open: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const { get, records, updateAttendance } = useAttendance();
  const setlists = useSetlists();
  const performances = usePerformances();
  const performanceById = usePerformanceById();
  const [activePerformanceId, setActivePerformanceId] = useState<string>();
  // The other dates/legs that belong to the same event as the opened one.
  const tourLegs = useMemo(() => {
    if (!externalPerformance) return [];
    const group = groupByTour(performances).find((g) =>
      g.legs.some((leg) => leg.id === externalPerformance.id)
    );
    return group?.legs ?? [externalPerformance];
  }, [performances, externalPerformance]);
  // Honor an in-dialog leg switch only while it points at a sibling of the
  // opened performance; otherwise fall back to the externally provided one.
  const performance =
    (activePerformanceId && tourLegs.some((leg) => leg.id === activePerformanceId)
      ? performanceById.get(activePerformanceId)
      : undefined) ?? externalPerformance;
  const setlist = useSetlist(performance?.id);
  const songById = useSongById();
  const record = performance ? get(performance.id) : undefined;
  const [memo, setMemo] = useState('');
  const [showArtists, setShowArtists] = useState(false);
  const [diffFromPerformanceId, setDiffFromPerformanceId] = useState('');
  const [diffToPerformanceId, setDiffToPerformanceId] = useState('');
  const [diffOpen, setDiffOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string>();

  // Reset the in-dialog leg selection whenever the dialog is (re)opened or
  // pointed at a new event, so a previously navigated leg never carries over.
  useEffect(() => {
    setActivePerformanceId(undefined);
  }, [externalPerformance?.id, open]);

  useEffect(() => {
    setMemo(record?.memo ?? '');
    setDiffFromPerformanceId('');
    setDiffToPerformanceId('');
    setDiffOpen(false);
    setSelectedSongId(undefined);
  }, [record?.memo, performance?.id]);

  if (!performance) return null;

  const watchTypeOptions: { value: WatchType; label: string }[] = [
    { value: 'live', label: t('events.watched_live') },
    { value: 'stream', label: t('events.watched_stream') },
    { value: 'delay', label: t('events.watched_delay') }
  ];
  const days = daysFromToday(performance.date);
  const relativeDate =
    days === 0
      ? t('events.today')
      : days > 0
        ? t('events.days_until', { count: days })
        : t('events.days_ago', { count: Math.abs(days) });

  const songNumbers = new Map<string, number>();
  if (setlist) {
    let songIndex = 0;
    for (const item of setlist.items) {
      if (item.type === 'song') {
        songIndex += 1;
        songNumbers.set(item.id, songIndex);
      }
    }
  }
  const witnessBySong = (() => {
    if (record?.status !== 'attended' || !setlist) return null;
    const map = new Map<string, { count: number; firstPerformanceId: string }>();
    for (const r of records) {
      if (r.status !== 'attended') continue;
      const perf = performanceById.get(r.performanceId);
      const sl = setlists[r.performanceId];
      if (!perf || !sl) continue;
      if (!isPerformanceAtOrBefore(perf, performance)) continue;
      const songIdsInPerformance = new Set(
        sl.items.filter((it) => it.type === 'song' && it.songId).map((it) => it.songId!)
      );
      for (const songId of songIdsInPerformance) {
        const prev = map.get(songId);
        if (!prev) map.set(songId, { count: 1, firstPerformanceId: perf.id });
        else {
          prev.count += 1;
          const firstPerformance = performanceById.get(prev.firstPerformanceId);
          if (!firstPerformance || isPerformanceAtOrBefore(perf, firstPerformance)) {
            prev.firstPerformanceId = perf.id;
          }
        }
      }
    }
    return map;
  })();

  const sections =
    setlist && setlist.sections.length > 0
      ? setlist.sections
      : setlist
        ? [{ name: '', startIndex: 0, endIndex: setlist.items.length - 1, type: 'main' }]
        : [];
  const setlistInsights = setlist
    ? buildSetlistInsights(performance, performances, setlists)
    : undefined;
  const nearestSameTourSetlistPerformance = performances
    .filter(
      (candidate) =>
        candidate.id !== performance.id &&
        candidate.tourName === performance.tourName &&
        Boolean(setlists[candidate.id])
    )
    .sort((a, b) => {
      const distanceA = Math.abs(new Date(a.date).getTime() - new Date(performance.date).getTime());
      const distanceB = Math.abs(new Date(b.date).getTime() - new Date(performance.date).getTime());
      return distanceA - distanceB || a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    })[0];
  const defaultDiffFromPerformanceId =
    nearestSameTourSetlistPerformance?.id ?? setlistInsights?.previousPerformance?.id ?? '';
  const selectedDiffFromPerformanceId = diffFromPerformanceId || defaultDiffFromPerformanceId;
  const selectedDiffToPerformanceId = diffToPerformanceId || performance.id;
  const setlistDiff = compareSetlists(
    setlists[selectedDiffFromPerformanceId],
    setlists[selectedDiffToPerformanceId]
  );
  const setlistPerformanceOptions: SetlistPerformanceOption[] = performances
    .filter((candidate) => setlists[candidate.id])
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map((candidate) => {
      const title = candidate.tourName;
      const subtitle = [candidate.concertName, candidate.performanceName].filter(Boolean).join(' ');
      const venue = candidate.venue;
      return {
        value: candidate.id,
        date: candidate.date,
        title,
        subtitle,
        venue,
        isSameTour: candidate.tourName === performance.tourName,
        searchText: [candidate.date, title, subtitle, venue, candidate.note]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      };
    });
  const formatDaysSincePrevious = (count: number | undefined) =>
    count === undefined ? undefined : t('events.days_since_previous', { count });
  const formatSongName = (songId: string) => {
    const song = songById.get(songId);
    return song ? localizedName(i18n.language, song.name, song.englishName) : songId;
  };
  const selectedDiffFromLabel = (() => {
    const selected = setlistPerformanceOptions.find(
      (option) => option.value === selectedDiffFromPerformanceId
    );
    return selected ? `${selected.date} ${selected.title}` : t('events.setlist_diff_from');
  })();
  const selectedDiffToLabel = (() => {
    const selected = setlistPerformanceOptions.find(
      (option) => option.value === selectedDiffToPerformanceId
    );
    return selected ? `${selected.date} ${selected.title}` : t('events.setlist_diff_to');
  })();
  const selectedSong = selectedSongId ? songById.get(selectedSongId) : undefined;
  const selectedSongHeardAt = selectedSong
    ? records
        .filter((r) => r.status === 'attended')
        .map((r) => performanceById.get(r.performanceId))
        .filter((p): p is Performance => Boolean(p))
        .filter((p) =>
          Boolean(
            setlists[p.id]?.items.some(
              (item) => item.type === 'song' && item.songId === selectedSong.id
            )
          )
        )
    : [];
  const selectedSongPerformedAt = selectedSong
    ? performances.filter((p) =>
        Boolean(
          setlists[p.id]?.items.some(
            (item) => item.type === 'song' && item.songId === selectedSong.id
          )
        )
      )
    : [];

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
        <Dialog.Backdrop zIndex="60" />
        <Dialog.Positioner zIndex="61">
          <Dialog.Content w="full" maxW="2xl" maxH="85vh" mx="4" overflowY="auto">
            <Stack gap="4" p={{ base: '4', md: '6' }}>
              <Stack gap="1" borderColor="border.subtle" borderBottomWidth="1px" pr="8" pb="3">
                <Wrap gap="2">
                  <Text color="fg.muted" fontSize="sm">
                    {performance.date}
                  </Text>
                  <Text color="fg.subtle" fontSize="sm">
                    {relativeDate}
                  </Text>
                  {performance.seriesIds.map((id) => (
                    <SeriesBadge key={id} seriesId={id} />
                  ))}
                  <CategoryBadge category={performance.category} tourType={performance.tourType} />
                </Wrap>
                <Dialog.Title>{performance.tourName}</Dialog.Title>
                {(performance.concertName ?? performance.performanceName) && (
                  <Text fontSize="sm" fontWeight="medium">
                    {[performance.concertName, performance.performanceName]
                      .filter(Boolean)
                      .join(' ')}
                  </Text>
                )}
                <Stack gap="0.5" color="fg.muted" fontSize="sm">
                  <VenueText performance={performance} />
                  <Text>
                    {performance.openTime ? `${t('events.doors')} ${performance.openTime}` : ''}
                    {performance.openTime && performance.startTime ? '・' : ''}
                    {performance.startTime ? `${t('events.start')} ${performance.startTime}` : ''}
                  </Text>
                </Stack>
                {performance.note && (
                  <Text color="fg.subtle" fontSize="xs">
                    {performance.note}
                  </Text>
                )}
              </Stack>

              {tourLegs.length > 1 && (
                <Stack gap="1.5">
                  <Text color="fg.muted" fontSize="xs" fontWeight="semibold">
                    {t('events.event_legs')}
                  </Text>
                  <Box
                    display="grid"
                    gap="1.5"
                    gridTemplateColumns="repeat(auto-fill, minmax(10rem, 1fr))"
                  >
                    {tourLegs.map((leg) => {
                      const isCurrent = leg.id === performance.id;
                      const legRecord = get(leg.id);
                      const label = legLabel(leg);
                      return (
                        <Button
                          key={leg.id}
                          size="xs"
                          variant={isCurrent ? 'solid' : 'outline'}
                          aria-current={isCurrent ? 'true' : undefined}
                          onClick={() => !isCurrent && setActivePerformanceId(leg.id)}
                          w="full"
                          minW="0"
                        >
                          <Box
                            flexShrink={0}
                            borderRadius="full"
                            w="1.5"
                            h="1.5"
                            bgColor={
                              isCurrent
                                ? 'transparent'
                                : legRecord?.status === 'attended'
                                  ? 'accent.default'
                                  : legRecord?.status === 'interested'
                                    ? 'amber.9'
                                    : 'border.emphasized'
                            }
                          />
                          <Text fontVariantNumeric="tabular-nums">
                            {leg.date.slice(5).replace('-', '/')}
                          </Text>
                          {label && <Text lineClamp={1}>{label}</Text>}
                        </Button>
                      );
                    })}
                  </Box>
                </Stack>
              )}

              <Wrap gap="2">
                <AttendanceButtons
                  performanceId={performance.id}
                  future={isFutureEvent(performance)}
                  size="sm"
                />
              </Wrap>

              {record?.status === 'attended' && (
                <Stack gap="3">
                  <HStack gap="3" flexWrap="wrap">
                    <NativeSelect
                      aria-label={t('events.attendance_filter')}
                      value={record.watchType ?? 'live'}
                      options={watchTypeOptions}
                      onChange={(watchType) =>
                        updateAttendance(performance.id, { watchType: watchType as WatchType })
                      }
                    />
                    <HStack gap="1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <IconButton
                          key={star}
                          aria-label={`${t('events.rating')} ${star}`}
                          aria-pressed={record.rating != null && record.rating >= star}
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            updateAttendance(performance.id, {
                              rating: record.rating === star ? undefined : star
                            })
                          }
                          color={
                            record.rating && record.rating >= star ? 'accent.default' : 'fg.subtle'
                          }
                        >
                          <FaStar />
                        </IconButton>
                      ))}
                    </HStack>
                  </HStack>
                  <Stack gap="1">
                    <Text fontSize="sm" fontWeight="medium">
                      {t('events.memo')}
                    </Text>
                    <Textarea
                      size="sm"
                      rows={3}
                      aria-label={t('events.memo')}
                      value={memo}
                      placeholder={t('events.memo_placeholder')}
                      onChange={(e) => setMemo(e.target.value)}
                      onBlur={() => updateAttendance(performance.id, { memo })}
                    />
                  </Stack>
                </Stack>
              )}

              <Wrap gap="2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await copyTextToClipboard(formatEventShareText(performance));
                      toast({ title: t('share.copied'), type: 'success' });
                    } catch {
                      toast({ title: t('share.copy_failed'), type: 'error' });
                    }
                  }}
                >
                  <FaCopy />
                  {t('share.copy_text')}
                </Button>
                <Button asChild size="xs" variant="outline">
                  <a
                    href={xShareUrl(`${formatEventShareText(performance)} #LLerNote`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaXTwitter />
                    {t('share.share_x')}
                  </a>
                </Button>
                <Button asChild size="xs" variant="outline">
                  <a href={eventernoteSearchUrl(performance)} target="_blank" rel="noreferrer">
                    <FaArrowUpRightFromSquare />
                    {t('share.eventernote')}
                  </a>
                </Button>
              </Wrap>

              <Stack gap="2">
                <HStack gap="2" justifyContent="space-between" flexWrap="wrap">
                  <Text fontWeight="semibold">{t('events.setlist')}</Text>
                  {setlist && (
                    <HStack gap="1">
                      {setlistPerformanceOptions.length > 1 && (
                        <Button size="xs" variant="outline" onClick={() => setDiffOpen(true)}>
                          {t('events.setlist_diff_mode')}
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant={showArtists ? 'subtle' : 'ghost'}
                        onClick={() => setShowArtists((v) => !v)}
                      >
                        {t('events.show_artists')}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={async () => {
                          const lines = [
                            formatEventShareText(performance),
                            ...setlist.items.map((item) => {
                              if (item.type !== 'song') {
                                return `-- ${item.title ?? item.type.toUpperCase()}`;
                              }
                              const song = item.songId ? songById.get(item.songId) : undefined;
                              return `${String(songNumbers.get(item.id) ?? '-').padStart(2, '0')}. ${song?.name ?? item.customSongName ?? ''}`;
                            })
                          ];
                          try {
                            await copyTextToClipboard(lines.join('\n'));
                            toast({ title: t('share.copied'), type: 'success' });
                          } catch {
                            toast({ title: t('share.copy_failed'), type: 'error' });
                          }
                        }}
                      >
                        <FaCopy />
                        {t('events.copy_setlist')}
                      </Button>
                    </HStack>
                  )}
                </HStack>
                {setlist ? (
                  <Stack gap="3">
                    {setlistInsights?.previousPerformance && (
                      <Text color="fg.subtle" fontSize="2xs">
                        {t('events.previous_performance')}:{' '}
                        {setlistInsights.previousPerformance.date} ·{' '}
                        {formatDaysSincePrevious(setlistInsights.daysSincePreviousPerformance)}
                      </Text>
                    )}
                    {sections.map((section) => (
                      <Box key={`${section.name}-${section.startIndex}`}>
                        {section.name && (
                          <Text
                            mb="1"
                            color="fg.muted"
                            fontSize="xs"
                            fontWeight="bold"
                            textTransform="uppercase"
                          >
                            {section.name}
                          </Text>
                        )}
                        {setlist.items
                          .slice(section.startIndex, section.endIndex + 1)
                          .map((item) => (
                            <SetlistItemRow
                              key={item.id}
                              item={item}
                              index={songNumbers.get(item.id) ?? 0}
                              showArtists={showArtists}
                              witnessInfo={
                                item.type === 'song' && item.songId && witnessBySong
                                  ? {
                                      count: witnessBySong.get(item.songId)?.count ?? 0,
                                      isFirst:
                                        witnessBySong.get(item.songId)?.firstPerformanceId ===
                                        performance.id
                                    }
                                  : undefined
                              }
                              setlistInsight={
                                item.type === 'song' && item.songId
                                  ? setlistInsights?.songInsights.get(item.songId)
                                  : undefined
                              }
                              onSelectSong={setSelectedSongId}
                            />
                          ))}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Text color="fg.muted" fontSize="sm">
                    {t('events.no_setlist')}
                  </Text>
                )}
              </Stack>
            </Stack>
            <Dialog.CloseTrigger asChild position="absolute" top="2" right="2">
              <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                <FaXmark />
              </IconButton>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {selectedSong && (
        <SongDetailDialog
          song={selectedSong}
          heardAt={selectedSongHeardAt}
          performedAt={selectedSongPerformedAt}
          debutPerformance={getSongDebutPerformance(selectedSong.id, performanceById, setlists)}
          firstWitnessPerformance={getSongFirstWitnessPerformance(
            selectedSong.id,
            records,
            performanceById,
            setlists
          )}
          performanceCount={selectedSongPerformedAt.length}
          open={selectedSong !== undefined}
          layer={90}
          onClose={() => setSelectedSongId(undefined)}
        />
      )}

      <Dialog.Root open={diffOpen} onOpenChange={(e) => setDiffOpen(e.open)}>
        <Dialog.Backdrop zIndex="70" />
        <Dialog.Positioner zIndex="71">
          <Dialog.Content w="full" maxW="3xl" maxH="85vh" mx="4" overflowY="auto">
            <Stack gap="4" p={{ base: '4', md: '6' }}>
              <Stack gap="1" pr="8">
                <Dialog.Title>{t('events.setlist_diff_mode')}</Dialog.Title>
                <Text color="fg.muted" fontSize="sm">
                  {t('events.setlist_diff_description')}
                </Text>
              </Stack>

              <Box display="grid" gap="3" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}>
                <SetlistPerformancePicker
                  label={t('events.setlist_diff_from')}
                  value={selectedDiffFromPerformanceId}
                  options={setlistPerformanceOptions}
                  currentPerformanceId={performance.id}
                  previousPerformanceId={setlistInsights?.previousPerformance?.id}
                  onChange={setDiffFromPerformanceId}
                />
                <SetlistPerformancePicker
                  label={t('events.setlist_diff_to')}
                  value={selectedDiffToPerformanceId}
                  options={setlistPerformanceOptions}
                  currentPerformanceId={performance.id}
                  previousPerformanceId={setlistInsights?.previousPerformance?.id}
                  onChange={setDiffToPerformanceId}
                />
              </Box>

              <HStack gap="3" flexWrap="wrap">
                <Badge size="sm" variant="outline">
                  {t('events.setlist_shared', { count: setlistDiff.sharedSongIds.length })}
                </Badge>
                <Badge size="sm" variant="solid">
                  {t('events.setlist_added', { count: setlistDiff.addedSongIds.length })}
                </Badge>
                <Badge size="sm" variant="outline">
                  {t('events.setlist_removed', { count: setlistDiff.removedSongIds.length })}
                </Badge>
              </HStack>

              <Stack
                gap="0"
                borderColor="border.subtle"
                borderRadius="l2"
                borderWidth="1px"
                overflow="hidden"
              >
                <HStack
                  gap="2"
                  borderBottomWidth="1px"
                  borderBottomColor="border.subtle"
                  py="2"
                  px="3"
                  bgColor="bg.subtle"
                >
                  <Text flex="1" color="fg.muted" fontSize="2xs" lineClamp={1}>
                    − {selectedDiffFromLabel}
                  </Text>
                  <Text flex="1" color="fg.muted" fontSize="2xs" lineClamp={1}>
                    + {selectedDiffToLabel}
                  </Text>
                </HStack>
                {setlistDiff.rows.map((row, rowIndex) => (
                  <HStack
                    key={`${row.type}-${row.songId}-${rowIndex}`}
                    gap="2"
                    alignItems="center"
                    borderBottomWidth="1px"
                    borderBottomColor="border.subtle"
                    py="1.5"
                    px="3"
                    bgColor={
                      row.type === 'added'
                        ? 'green.950/35'
                        : row.type === 'removed'
                          ? 'red.950/35'
                          : 'transparent'
                    }
                  >
                    <Text
                      minW="4"
                      color={
                        row.type === 'added'
                          ? 'green.300'
                          : row.type === 'removed'
                            ? 'red.300'
                            : 'fg.subtle'
                      }
                      fontFamily="mono"
                      fontSize="sm"
                    >
                      {row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}
                    </Text>
                    <Text minW="8" color="fg.subtle" fontFamily="mono" fontSize="xs">
                      {String(rowIndex + 1).padStart(2, '0')}
                    </Text>
                    <Text fontSize="sm" lineClamp={1}>
                      {formatSongName(row.songId)}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            </Stack>
            <Dialog.CloseTrigger asChild position="absolute" top="2" right="2">
              <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                <FaXmark />
              </IconButton>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
}
