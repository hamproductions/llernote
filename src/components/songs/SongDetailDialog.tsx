import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaXmark } from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { SongThumb } from './SongThumb';
import { hasSongThumb } from '~/utils/song-thumbs';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { ScopeTabs } from '~/components/events/ScopeTabs';
import { scopeMatches, type Scope } from '~/utils/attendance/witness';
import { useArtistById } from '~/hooks/useData';
import { daysFromToday } from '~/utils/event-filter';
import { localizedName } from '~/utils/names';
import { clickable } from '~/utils/clickable';
import type { Performance, Song } from '~/types';

interface SongWithVideo extends Song {
  musicVideo?: { videoId: string } | null;
}

export function SongDetailDialog({
  song,
  heardAt,
  watchedAt = [],
  performedAt,
  debutPerformance,
  firstWitnessPerformance,
  open,
  layer = 50,
  onClose,
  onBack,
  onSelectEvent
}: {
  song?: Song;
  heardAt: Performance[];
  watchedAt?: Performance[];
  performedAt: Performance[];
  debutPerformance?: Performance;
  firstWitnessPerformance?: Performance;
  performanceCount: number;
  open: boolean;
  layer?: number;
  onClose: () => void;
  onBack?: () => void;
  onSelectEvent?: (performance: Performance) => void;
}) {
  const { t, i18n } = useTranslation();
  const artistById = useArtistById();
  const [scope, setScope] = useState<Scope>('all');

  if (!song) return null;

  const artistNames = [
    ...new Set(
      (song.artists ?? [])
        .map((a) => artistById.get(a.id))
        .filter(Boolean)
        .map((a) => localizedName(i18n.language, a!.name, a!.englishName))
    )
  ].join('・');
  const videoId = (song as SongWithVideo).musicVideo?.videoId;
  const visiblePerformed = performedAt.filter((p) => scopeMatches(scope, p.category));
  const latestPerformance = visiblePerformed.length
    ? visiblePerformed.reduce((a, b) => (a.date >= b.date ? a : b))
    : undefined;
  const lastWitnessPerformance = heardAt.length
    ? heardAt.reduce((a, b) => (a.date >= b.date ? a : b))
    : undefined;
  const relativeDate = (date: string) => {
    const days = daysFromToday(date);
    if (days === 0) return t('events.today');
    if (days > 0) return t('events.days_until', { count: days });
    return t('events.days_ago', { count: Math.abs(days) });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop zIndex={layer} />
      <Dialog.Positioner zIndex={layer + 1}>
        <Dialog.Content w="full" maxW="lg" maxH="85vh" mx="4" overflowY="auto">
          <Stack gap="4" p={{ base: '4', md: '6' }}>
            <HStack
              gap="3"
              alignItems="flex-start"
              borderColor="border.subtle"
              borderBottomWidth="1px"
              pl={onBack ? '8' : undefined}
              pr="8"
              pb="3"
            >
              {hasSongThumb(song.id) && <SongThumb songId={song.id} large />}
              <Stack gap="1" minW="0">
                <Dialog.Title>
                  {localizedName(i18n.language, song.name, song.englishName)}
                </Dialog.Title>
                {artistNames && (
                  <Text color="fg.muted" fontSize="sm">
                    {artistNames}
                  </Text>
                )}
                <Wrap gap="1">
                  {song.seriesIds.map((id) => (
                    <SeriesBadge key={id} seriesId={String(id)} />
                  ))}
                  {song.releasedOn && (
                    <Badge size="sm" variant="outline">
                      {song.releasedOn}
                    </Badge>
                  )}
                </Wrap>
              </Stack>
            </HStack>

            {videoId && (
              <Box
                style={{ aspectRatio: '16 / 9' }}
                position="relative"
                borderRadius="l2"
                w="full"
                overflow="hidden"
              >
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                  title={song.name}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 0
                  }}
                />
              </Box>
            )}

            <HStack justifyContent="flex-end">
              <ScopeTabs value={scope} onChange={setScope} size="xs" />
            </HStack>

            <Stack gap="2">
              <HStack gap="2" alignItems="baseline">
                <Text fontWeight="semibold">{t('songs.song_history')}</Text>
              </HStack>
              <Stack gap="1">
                {(
                  [
                    {
                      key: 'debut',
                      perf: debutPerformance,
                      label: t('songs.debut_performance'),
                      variant: 'solid'
                    },
                    {
                      key: 'first_witness',
                      perf: scope === 'remote' ? undefined : firstWitnessPerformance,
                      label: t('songs.first_witness_performance'),
                      variant: 'outline'
                    },
                    {
                      key: 'latest',
                      perf:
                        latestPerformance && latestPerformance.id !== debutPerformance?.id
                          ? latestPerformance
                          : undefined,
                      label: t('songs.latest_performance'),
                      variant: 'outline'
                    },
                    {
                      key: 'last_witness',
                      perf:
                        scope !== 'remote' &&
                        lastWitnessPerformance &&
                        lastWitnessPerformance.id !== firstWitnessPerformance?.id
                          ? lastWitnessPerformance
                          : undefined,
                      label: t('songs.last_witness_performance'),
                      variant: 'solid'
                    }
                  ] as const
                )
                  .filter((m): m is typeof m & { perf: Performance } => Boolean(m.perf))
                  .map(({ key, perf, label, variant }) => (
                    <HStack
                      key={key}
                      {...(onSelectEvent ? clickable(() => onSelectEvent(perf)) : {})}
                      cursor={onSelectEvent ? 'pointer' : undefined}
                      gap="2"
                      alignItems="baseline"
                      borderRadius="l1"
                      py="1"
                      px="1.5"
                      _hover={onSelectEvent ? { bgColor: 'bg.subtle' } : undefined}
                    >
                      <Badge size="sm" variant={variant} flexShrink={0}>
                        {label}
                      </Badge>
                      <Text
                        flexShrink={0}
                        color="fg.muted"
                        fontSize="xs"
                        fontVariantNumeric="tabular-nums"
                      >
                        {perf.date}
                      </Text>
                      <Text lang="ja" color="accent.text" fontSize="sm" lineClamp={1}>
                        {perf.tourName}
                      </Text>
                    </HStack>
                  ))}
              </Stack>
            </Stack>

            {scope !== 'remote' && (
              <Stack gap="2">
                <HStack gap="2" alignItems="baseline">
                  <Text fontWeight="semibold">{t('songs.witnessed_at')}</Text>
                  <Text color="fg.muted" fontSize="sm">
                    {t('songs.times', { count: heardAt.length })}
                  </Text>
                </HStack>
                {heardAt.length === 0 ? (
                  <Text color="fg.muted" fontSize="sm">
                    {t('songs.never_heard')}
                  </Text>
                ) : (
                  <Stack gap="0.5">
                    {heardAt.map((p) => (
                      <HStack
                        key={p.id}
                        {...(onSelectEvent ? clickable(() => onSelectEvent(p)) : {})}
                        cursor={onSelectEvent ? 'pointer' : undefined}
                        gap="2"
                        alignItems="baseline"
                        borderRadius="l1"
                        py="1"
                        px="1.5"
                        transition="colors"
                        _hover={onSelectEvent ? { bgColor: 'bg.subtle' } : undefined}
                      >
                        <Text
                          flexShrink={0}
                          color="fg.muted"
                          fontSize="xs"
                          fontVariantNumeric="tabular-nums"
                        >
                          {p.date}
                        </Text>
                        <Stack flex="1" gap="0" minW="0">
                          <Text
                            lang="ja"
                            color={onSelectEvent ? 'accent.text' : undefined}
                            fontSize="sm"
                            lineClamp={2}
                          >
                            {p.tourName}
                          </Text>
                          <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                            {[p.concertName, p.performanceName, p.venue].filter(Boolean).join('・')}
                          </Text>
                        </Stack>
                        <Text flexShrink={0} color="fg.subtle" fontSize="xs">
                          {relativeDate(p.date)}
                        </Text>
                      </HStack>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}

            {scope !== 'inperson' && watchedAt.length > 0 && (
              <Stack gap="2">
                <HStack gap="2" alignItems="baseline">
                  <Text color="blue.11" fontWeight="semibold">
                    {t('songs.watched_at')}
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    {t('songs.times', { count: watchedAt.length })}
                  </Text>
                </HStack>
                <Stack gap="0.5">
                  {watchedAt.map((p) => (
                    <HStack
                      key={p.id}
                      {...(onSelectEvent ? clickable(() => onSelectEvent(p)) : {})}
                      cursor={onSelectEvent ? 'pointer' : undefined}
                      gap="2"
                      alignItems="baseline"
                      borderRadius="l1"
                      py="1"
                      px="1.5"
                      transition="colors"
                      _hover={onSelectEvent ? { bgColor: 'bg.subtle' } : undefined}
                    >
                      <Text
                        flexShrink={0}
                        color="fg.muted"
                        fontSize="xs"
                        fontVariantNumeric="tabular-nums"
                      >
                        {p.date}
                      </Text>
                      <Stack flex="1" gap="0" minW="0">
                        <Text
                          lang="ja"
                          color={onSelectEvent ? 'accent.text' : undefined}
                          fontSize="sm"
                          lineClamp={2}
                        >
                          {p.tourName}
                        </Text>
                        <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                          {[p.concertName, p.performanceName, p.venue].filter(Boolean).join('・')}
                        </Text>
                      </Stack>
                    </HStack>
                  ))}
                </Stack>
              </Stack>
            )}

            <Stack gap="2">
              <HStack gap="2" alignItems="baseline">
                <Text fontWeight="semibold">{t('songs.performed_at')}</Text>
                <Text color="fg.muted" fontSize="sm">
                  {t('songs.times', { count: visiblePerformed.length })}
                </Text>
              </HStack>
              <Stack gap="0.5" maxH="56" overflowY="auto">
                {visiblePerformed.map((p) => (
                  <HStack
                    key={p.id}
                    {...(onSelectEvent ? clickable(() => onSelectEvent(p)) : {})}
                    cursor={onSelectEvent ? 'pointer' : undefined}
                    gap="2"
                    alignItems="baseline"
                    borderRadius="l1"
                    py="1"
                    px="1.5"
                    transition="colors"
                    _hover={onSelectEvent ? { bgColor: 'bg.subtle' } : undefined}
                  >
                    <Text
                      flexShrink={0}
                      color="fg.muted"
                      fontSize="xs"
                      fontVariantNumeric="tabular-nums"
                    >
                      {p.date}
                    </Text>
                    <Stack flex="1" gap="0" minW="0">
                      <Text lang="ja" color="accent.text" fontSize="sm" lineClamp={2}>
                        {p.tourName}
                      </Text>
                      <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                        {[p.concertName, p.performanceName, p.venue].filter(Boolean).join('・')}
                      </Text>
                    </Stack>
                    <Text flexShrink={0} color="fg.subtle" fontSize="xs">
                      {relativeDate(p.date)}
                    </Text>
                  </HStack>
                ))}
              </Stack>
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
  );
}
