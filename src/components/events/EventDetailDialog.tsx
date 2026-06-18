import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaCheck,
  FaChevronLeft,
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
import { SongThumb } from '~/components/songs/SongThumb';
import { useAttendance } from '~/hooks/useAttendance';
import { useArtistById, usePerformanceById, usePerformances, useSongById } from '~/hooks/useData';
import { useSetlist, useSetlists } from '~/hooks/useSetlists';
import { useToaster } from '~/context/ToasterContext';
import { daysFromToday, isFutureEvent } from '~/utils/event-filter';
import { localizedName } from '~/utils/names';
import {
  copyTextToClipboard,
  eventernoteSearchUrl,
  formatEventShareText,
  llFansEventUrl,
  xShareUrl
} from '~/utils/share';
import { hasSongThumb } from '~/utils/song-thumbs';
import {
  buildSetlistInsights,
  compareSetlists,
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
  witnessInfo?: { count: number; isFirst: boolean; daysSinceSeen?: number };
  setlistInsight?: SongSetlistInsight;
  onSelectSong?: (songId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const songById = useSongById();
  const artistById = useArtistById();
  if (item.type !== 'song') {
    return (
      <HStack gap="2" alignItems="center" py="0.5">
        <Box minW="8" />
        <Badge size="sm" variant="outline" flexShrink={0} color="fg.muted">
          {item.title ?? item.customSongName ?? item.type.toUpperCase()}
        </Badge>
        {item.remarks && (
          <Text color="fg.muted" fontSize="xs" lineClamp={2}>
            {item.remarks}
          </Text>
        )}
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
  const hasLine2 =
    Boolean(item.remarks) ||
    setlistInsight?.daysSincePreviousPerformance !== undefined ||
    (showArtists && Boolean(artistNames));
  return (
    <HStack gap="2.5" alignItems="center" py="1.5">
      <Text
        flexShrink={0}
        minW="7"
        color="fg.subtle"
        fontSize="sm"
        fontVariantNumeric="tabular-nums"
        textAlign="right"
      >
        {index}.
      </Text>
      {song && hasSongThumb(song.id) && <SongThumb songId={song.id} />}
      <Stack flex="1" gap="0.5" minW="0">
        <HStack gap="1.5" minW="0" flexWrap="wrap">
          <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
            {songLabel}
          </Text>
          {setlistInsight?.isDebut && (
            <Badge size="sm" variant="solid">
              {t('events.song_debut')}
            </Badge>
          )}
          {witnessInfo?.isFirst ? (
            <Badge size="sm" variant="subtle">
              {t('events.first_witness')}
            </Badge>
          ) : (
            witnessInfo?.daysSinceSeen !== undefined && (
              <Text
                color="fg.subtle"
                fontSize="2xs"
                fontVariantNumeric="tabular-nums"
                whiteSpace="nowrap"
              >
                {t('events.song_days_since_witness', { count: witnessInfo.daysSinceSeen })}
              </Text>
            )
          )}
          {witnessInfo && witnessInfo.count > 1 && (
            <Text
              color="accent.text"
              fontSize="xs"
              fontWeight="semibold"
              fontVariantNumeric="tabular-nums"
            >
              ×{witnessInfo.count}
            </Text>
          )}
        </HStack>
        {hasLine2 && (
          <HStack gap="2" minW="0" color="fg.subtle" fontSize="2xs" flexWrap="wrap">
            {item.remarks && <Text lineClamp={1}>{item.remarks}</Text>}
            {setlistInsight?.daysSincePreviousPerformance !== undefined && (
              <Text fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                {t('events.song_days_since_previous', {
                  count: setlistInsight.daysSincePreviousPerformance
                })}
              </Text>
            )}
            {showArtists && artistNames && <Text lineClamp={1}>{artistNames}</Text>}
          </HStack>
        )}
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
  performance,
  open,
  onClose,
  onBack,
  onNavigate,
  onOpenSong
}: {
  performance?: Performance;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  onNavigate?: (performance: Performance) => void;
  onOpenSong?: (songId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const { get, records, updateAttendance } = useAttendance();
  const setlists = useSetlists();
  const performances = usePerformances();
  const performanceById = usePerformanceById();
  const setlist = useSetlist(performance?.id);
  const songById = useSongById();
  const record = performance ? get(performance.id) : undefined;
  const [memo, setMemo] = useState('');
  const [showArtists, setShowArtists] = useState(false);
  const [diffFromPerformanceId, setDiffFromPerformanceId] = useState('');
  const [diffToPerformanceId, setDiffToPerformanceId] = useState('');
  const [diffOpen, setDiffOpen] = useState(false);

  useEffect(() => {
    setMemo(record?.memo ?? '');
    setDiffFromPerformanceId('');
    setDiffToPerformanceId('');
    setDiffOpen(false);
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
    const map = new Map<
      string,
      { count: number; firstPerformanceId: string; prevSeenDate?: string }
    >();
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
          if (perf.id !== performance.id && perf.date < performance.date) {
            if (!prev.prevSeenDate || perf.date > prev.prevSeenDate) prev.prevSeenDate = perf.date;
          }
        }
      }
    }
    return map;
  })();
  const daysBetween = (from: string, to: string) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

  const sections =
    setlist && setlist.sections.length > 0
      ? setlist.sections
      : setlist
        ? [{ name: '', startIndex: 0, endIndex: setlist.items.length - 1, type: 'main' }]
        : [];
  const setlistFlow = (() => {
    type Run = { grow: number; color: string; songs: number; title: string };
    if (!setlist) return { runs: [] as Run[], counts: { songs: 0, mc: 0, vtr: 0, enc: 0 } };
    const items = setlist.items;
    const secType: string[] = Array.from({ length: items.length }, () => 'main');
    for (const s of sections)
      for (let i = s.startIndex; i <= s.endIndex && i < secType.length; i++) secType[i] = s.type;
    const C: Record<string, string> = {
      main: 'var(--colors-accent-default)',
      encore: 'var(--colors-accent-7)',
      mc: '#f59e0b',
      vtr: '#a855f7',
      other: 'var(--colors-fg-muted)'
    };
    const runs: Run[] = [];
    let lastK = '',
      mc = 0,
      vtr = 0,
      songs = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type === 'song') {
        songs++;
        const k = secType[i] === 'encore' ? 'encore' : 'main';
        const label = k === 'encore' ? 'Encore' : 'Main';
        if (k === lastK) {
          const last = runs[runs.length - 1];
          last.songs++;
          last.grow++;
          last.title = `${label}: ${last.songs}`;
        } else runs.push({ grow: 1, color: C[k], songs: 1, title: `${label}: 1` });
        lastK = k;
      } else if (it.type === 'mc') {
        mc++;
        runs.push({ grow: 1.2, color: C.mc, songs: 0, title: 'MC' });
        lastK = 'mc';
      } else if (it.type === 'vtr') {
        vtr++;
        runs.push({ grow: 1.2, color: C.vtr, songs: 0, title: 'VTR' });
        lastK = 'vtr';
      } else {
        runs.push({
          grow: 1,
          color: C.other,
          songs: 0,
          title: it.title ?? it.customSongName ?? '—'
        });
        lastK = 'other';
      }
    }
    return {
      runs,
      counts: { songs, mc, vtr, enc: sections.filter((s) => s.type === 'encore').length }
    };
  })();
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
  const siblingPerformances = onNavigate
    ? performances
        .filter((candidate) => candidate.tourName === performance.tourName)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    : [];
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
  return (
    <>
      <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
        <Dialog.Backdrop zIndex="60" />
        <Dialog.Positioner zIndex="61">
          <Dialog.Content w="full" maxW="2xl" maxH="85vh" mx="4" overflowY="auto">
            <Stack gap="4" p={{ base: '4', md: '6' }}>
              <Stack
                gap="1"
                borderColor="border.subtle"
                borderBottomWidth="1px"
                pl={onBack ? '8' : undefined}
                pr="8"
                pb="3"
              >
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

              <Wrap gap="2">
                <AttendanceButtons
                  performanceId={performance.id}
                  future={isFutureEvent(performance)}
                  size="sm"
                />
              </Wrap>

              {onNavigate && siblingPerformances.length > 1 && (
                <Stack gap="1.5">
                  <Text color="fg.muted" fontSize="xs" fontWeight="semibold">
                    {t('events.other_shows', { count: siblingPerformances.length })}
                  </Text>
                  <Wrap gap="1.5">
                    {siblingPerformances.map((sibling) => {
                      const isCurrent = sibling.id === performance.id;
                      const attended = get(sibling.id)?.status === 'attended';
                      const label =
                        sibling.performanceName ||
                        sibling.concertName ||
                        sibling.date.slice(5).replace('-', '/');
                      return (
                        <Button
                          key={sibling.id}
                          size="xs"
                          variant={isCurrent ? 'solid' : 'outline'}
                          aria-current={isCurrent}
                          title={`${sibling.date} · ${sibling.venue}`}
                          onClick={() => !isCurrent && onNavigate(sibling)}
                        >
                          {attended && <FaCheck />}
                          {label}
                        </Button>
                      );
                    })}
                  </Wrap>
                </Stack>
              )}

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
                {llFansEventUrl(performance) && (
                  <Button asChild size="xs" variant="outline">
                    <a href={llFansEventUrl(performance)} target="_blank" rel="noreferrer">
                      <FaArrowUpRightFromSquare />
                      {t('share.ll_fans')}
                    </a>
                  </Button>
                )}
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
                    {setlistFlow.runs.length > 0 && (
                      <Stack gap="1.5">
                        <HStack gap="0.5" borderRadius="l2" h="6" overflow="hidden">
                          {setlistFlow.runs.map((r, i) => (
                            <Box
                              key={i}
                              title={r.title}
                              style={{ flexGrow: r.grow, background: r.color }}
                              display="flex"
                              justifyContent="center"
                              alignItems="center"
                              minW="1"
                              h="full"
                            >
                              {r.songs > 1 && (
                                <Text color="white" fontSize="2xs" fontWeight="bold">
                                  {r.songs}
                                </Text>
                              )}
                            </Box>
                          ))}
                        </HStack>
                        <Text color="fg.muted" fontSize="xs" fontVariantNumeric="tabular-nums">
                          {[
                            t('events.struct_songs', { count: setlistFlow.counts.songs }),
                            ...(setlistFlow.counts.enc
                              ? [t('events.struct_encores', { count: setlistFlow.counts.enc })]
                              : []),
                            ...(setlistFlow.counts.mc
                              ? [t('events.struct_mc', { count: setlistFlow.counts.mc })]
                              : []),
                            ...(setlistFlow.counts.vtr
                              ? [t('events.struct_vtr', { count: setlistFlow.counts.vtr })]
                              : [])
                          ].join(' · ')}
                        </Text>
                      </Stack>
                    )}
                    {sections.map((section) => {
                      const sectionItems = setlist.items.slice(
                        section.startIndex,
                        section.endIndex + 1
                      );
                      const hasSong = sectionItems.some((it) => it.type === 'song');
                      return (
                        <Box key={`${section.name}-${section.startIndex}`}>
                          {section.name && hasSong && (
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
                          {sectionItems.map((item) => (
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
                                        performance.id,
                                      daysSinceSeen: witnessBySong.get(item.songId)?.prevSeenDate
                                        ? daysBetween(
                                            witnessBySong.get(item.songId)!.prevSeenDate!,
                                            performance.date
                                          )
                                        : undefined
                                    }
                                  : undefined
                              }
                              setlistInsight={
                                item.type === 'song' && item.songId
                                  ? setlistInsights?.songInsights.get(item.songId)
                                  : undefined
                              }
                              onSelectSong={onOpenSong}
                            />
                          ))}
                        </Box>
                      );
                    })}
                  </Stack>
                ) : (
                  <Text color="fg.muted" fontSize="sm">
                    {t('events.no_setlist')}
                  </Text>
                )}
              </Stack>
            </Stack>
            {onBack && (
              <IconButton
                aria-label={t('common.back')}
                variant="ghost"
                size="sm"
                onClick={onBack}
                position="absolute"
                top="2"
                left="2"
              >
                <FaChevronLeft />
              </IconButton>
            )}
            <Dialog.CloseTrigger asChild position="absolute" top="2" right="2">
              <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                <FaXmark />
              </IconButton>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

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
