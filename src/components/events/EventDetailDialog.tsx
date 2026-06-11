import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaStar, FaXmark, FaXTwitter, FaCopy, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Textarea } from '~/components/ui/textarea';
import { Link } from '~/components/ui/link';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from './SeriesBadge';
import { CategoryBadge } from './CategoryBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { NativeSelect } from './NativeSelect';
import { useAttendance } from '~/hooks/useAttendance';
import { useArtistById, useSetlist, useSongById } from '~/hooks/useData';
import { useToaster } from '~/context/ToasterContext';
import { isFutureEvent } from '~/utils/event-filter';
import { localizedName } from '~/utils/names';
import {
  copyTextToClipboard,
  eventernoteSearchUrl,
  formatEventShareText,
  xShareUrl
} from '~/utils/share';
import type { Performance, SetlistItem } from '~/types';
import type { WatchType } from '~/types/attendance';

function SetlistItemRow({
  item,
  index,
  showArtists
}: {
  item: SetlistItem;
  index: number;
  showArtists: boolean;
}) {
  const { i18n } = useTranslation();
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
  const artistNames = [
    ...new Set(
      (song?.artists ?? [])
        .map((a) => artistById.get(a.id))
        .filter(Boolean)
        .map((a) => localizedName(i18n.language, a!.name, a!.englishName))
    )
  ].join('・');
  return (
    <HStack gap="2" alignItems="baseline" py="0.5">
      <Text
        minW="8"
        color="fg.subtle"
        fontSize="sm"
        fontVariantNumeric="tabular-nums"
        textAlign="right"
      >
        {index}.
      </Text>
      <Text fontSize="sm">
        {song ? localizedName(i18n.language, song.name, song.englishName) : item.customSongName}
      </Text>
      {showArtists && artistNames && (
        <Text color="fg.muted" fontSize="xs" lineClamp={1}>
          {artistNames}
        </Text>
      )}
      {item.remarks && (
        <Text color="fg.subtle" fontSize="xs" lineClamp={1}>
          {item.remarks}
        </Text>
      )}
    </HStack>
  );
}

export function EventDetailDialog({
  performance,
  open,
  onClose
}: {
  performance?: Performance;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const { get, updateAttendance } = useAttendance();
  const setlist = useSetlist(performance?.id);
  const songById = useSongById();
  const record = performance ? get(performance.id) : undefined;
  const [memo, setMemo] = useState('');
  const [showArtists, setShowArtists] = useState(false);

  useEffect(() => {
    setMemo(record?.memo ?? '');
  }, [record?.memo, performance?.id]);

  if (!performance) return null;

  const watchTypeOptions: { value: WatchType; label: string }[] = [
    { value: 'live', label: t('events.watched_live') },
    { value: 'stream', label: t('events.watched_stream') },
    { value: 'delay', label: t('events.watched_delay') }
  ];

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
  const sections =
    setlist && setlist.sections.length > 0
      ? setlist.sections
      : setlist
        ? [{ name: '', startIndex: 0, endIndex: setlist.items.length - 1, type: 'main' }]
        : [];

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content w="full" maxW="2xl" maxH="85vh" mx="4" overflowY="auto">
          <Stack gap="4" p={{ base: '4', md: '6' }}>
            <Stack gap="1" borderColor="border.subtle" borderBottomWidth="1px" pr="8" pb="3">
              <Wrap gap="2">
                <Text color="fg.muted" fontSize="sm">
                  {performance.date}
                </Text>
                {performance.seriesIds.map((id) => (
                  <SeriesBadge key={id} seriesId={id} />
                ))}
                <CategoryBadge category={performance.category} tourType={performance.tourType} />
              </Wrap>
              <Dialog.Title>{performance.tourName}</Dialog.Title>
              {(performance.concertName ?? performance.performanceName) && (
                <Text fontSize="sm" fontWeight="medium">
                  {[performance.concertName, performance.performanceName].filter(Boolean).join(' ')}
                </Text>
              )}
              <Text color="fg.muted" fontSize="sm">
                {performance.venue}
                {performance.openTime ? `・開場 ${performance.openTime}` : ''}
                {performance.startTime ? `・開演 ${performance.startTime}` : ''}
              </Text>
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
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          updateAttendance(performance.id, {
                            rating: record.rating === star ? undefined : star
                          })
                        }
                        color={record.rating && record.rating >= star ? 'amber.9' : 'fg.subtle'}
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
                  await copyTextToClipboard(formatEventShareText(performance));
                  toast({ title: t('share.copied'), type: 'success' });
                }}
              >
                <FaCopy />
                {t('share.copy_text')}
              </Button>
              <Link
                href={xShareUrl(`${formatEventShareText(performance)} #LLerNote`)}
                target="_blank"
              >
                <Button size="xs" variant="outline">
                  <FaXTwitter />
                  {t('share.share_x')}
                </Button>
              </Link>
              <Link href={eventernoteSearchUrl(performance)} target="_blank">
                <Button size="xs" variant="outline">
                  <FaArrowUpRightFromSquare />
                  {t('share.eventernote')}
                </Button>
              </Link>
            </Wrap>

            <Stack gap="2">
              <HStack gap="2" justifyContent="space-between" flexWrap="wrap">
                <Text fontWeight="semibold">{t('events.setlist')}</Text>
                {setlist && (
                  <HStack gap="1">
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
                        await copyTextToClipboard(lines.join('\n'));
                        toast({ title: t('share.copied'), type: 'success' });
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
                      {setlist.items.slice(section.startIndex, section.endIndex + 1).map((item) => (
                        <SetlistItemRow
                          key={item.id}
                          item={item}
                          index={songNumbers.get(item.id) ?? 0}
                          showArtists={showArtists}
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
  );
}
