import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaChevronLeft, FaCopy, FaStar, FaXmark } from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Textarea } from '~/components/ui/textarea';
import { SeriesBadge } from './SeriesBadge';
import { CategoryBadge } from './CategoryBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { NativeSelect } from './NativeSelect';
import { VenueText } from './VenueText';
import { EventShareActions } from './EventShareActions';
import { SetlistDiffDialog } from './SetlistDiffDialog';
import { SetlistItemRow } from './SetlistItemRow';
import { SetlistBar } from '~/components/setlist/SetlistBar';
import { buildSetlistFlow } from '~/utils/setlist-flow';
import { useAttendance } from '~/hooks/useAttendance';
import { performanceById as allPerformanceById, sortedPerformances } from '~/data/core';
import { useSongById } from '~/hooks/useSongData';
import { useAllSetlists } from '~/hooks/useSetlists';
import { useAbbreviations } from '~/hooks/useAbbreviations';
import { useCopyText } from '~/hooks/useCopyText';
import { daysFromToday, isFutureEvent } from '~/utils/event-filter';
import { formatSetlistText, numberSongs } from '~/utils/setlist-text';
import {
  buildWitnessBySong,
  buildSetlistInsights,
  songWitnessInfo
} from '~/utils/setlist-insights';
import { isWitnessed } from '~/utils/attendance/witness';
import type { Performance } from '~/types';
import type { WatchType } from '~/types/attendance';

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
  const { t } = useTranslation();
  const copyText = useCopyText();
  const { short, ready } = useAbbreviations();
  const { get, records, updateAttendance } = useAttendance();
  const setlists = useAllSetlists();
  const performances = sortedPerformances;
  const setlist = performance ? setlists[performance.id] : undefined;
  const songById = useSongById();
  const record = performance ? get(performance.id) : undefined;
  const [memo, setMemo] = useState('');
  const [showArtists, setShowArtists] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  useEffect(() => {
    setMemo(record?.memo ?? '');
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

  const songNumbers = numberSongs(setlist);
  const witnessBySong = (() => {
    if (!isWitnessed(record, performance) || !setlist) return null;
    return buildWitnessBySong(performance, records, allPerformanceById, setlists);
  })();

  const sections =
    setlist && setlist.sections.length > 0
      ? setlist.sections
      : setlist
        ? [{ name: '', startIndex: 0, endIndex: setlist.items.length - 1, type: 'main' }]
        : [];
  const setlistFlow = buildSetlistFlow(setlist, sections);
  const setlistInsights = setlist
    ? buildSetlistInsights(performance, performances, setlists)
    : undefined;
  const hasComparableSetlists = performances.filter((p) => setlists[p.id]).length > 1;
  const siblingPerformances = onNavigate
    ? performances
        .filter((candidate) => candidate.tourName === performance.tourName)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    : [];
  const formatDaysSincePrevious = (count: number | undefined) =>
    count === undefined ? undefined : t('events.days_since_previous', { count });
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
                  category={performance.category}
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

              <EventShareActions performance={performance} />

              <Stack gap="2">
                <HStack gap="2" justifyContent="space-between" flexWrap="wrap">
                  <Text fontWeight="semibold">{t('events.setlist')}</Text>
                  {setlist && (
                    <HStack gap="1" flexWrap="wrap">
                      {hasComparableSetlists && (
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
                        onClick={() =>
                          void copyText(formatSetlistText(performance, setlist, songById))
                        }
                      >
                        <FaCopy />
                        {t('events.copy_setlist')}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={!ready}
                        onClick={() =>
                          void copyText(formatSetlistText(performance, setlist, songById, short))
                        }
                      >
                        <FaCopy />
                        {t('events.copy_setlist_short')}
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
                        <SetlistBar flow={setlistFlow} />
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
                                item.type === 'song'
                                  ? songWitnessInfo(witnessBySong, item.songId, performance)
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

      <SetlistDiffDialog
        key={performance.id}
        performance={performance}
        previousPerformanceId={setlistInsights?.previousPerformance?.id}
        open={diffOpen}
        onOpenChange={setDiffOpen}
      />
    </>
  );
}
