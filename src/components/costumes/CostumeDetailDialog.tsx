import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaChevronLeft, FaXmark } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { SongThumb } from '~/components/songs/SongThumb';
import { useDetail } from '~/components/detail/DetailStack';
import { usePerformanceById } from '~/hooks/useData';
import { useSongById, useSongByName } from '~/hooks/useSongData';
import { useAttendance } from '~/hooks/useAttendance';
import { localizedName } from '~/utils/names';
import { hasSongThumb } from '~/utils/song-thumbs';
import { legLabel } from '~/components/events/TourCard';
import { costumeDisplayName, type CostumeSummary } from '~/utils/costumes';

function StatBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <Stack gap="0" alignItems="flex-start" borderRadius="l2" p="2.5" bgColor="bg.subtle">
      <Text fontSize="xl" fontWeight="bold" fontVariantNumeric="tabular-nums" lineHeight="1.1">
        {value}
      </Text>
      <Text color="fg.muted" fontSize="2xs">
        {label}
      </Text>
    </Stack>
  );
}

export function CostumeDetailDialog({
  costume,
  open,
  onClose,
  onBack
}: {
  costume?: CostumeSummary;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const songById = useSongById();
  const songByName = useSongByName();
  const performanceById = usePerformanceById();
  const { get } = useAttendance();
  const { openSong, openEvent } = useDetail();
  const [songSort, setSongSort] = useState<'worn' | 'rate'>('worn');

  if (!costume) return null;

  const songName = (songId: string) => {
    const song = songById.get(songId);
    return song ? localizedName(i18n.language, song.name, song.englishName) : songId;
  };

  const hasRates = costume.songs.some((song) => song.total > 0);
  const sortedSongs = [...costume.songs].sort((a, b) =>
    songSort === 'rate' ? b.rate - a.rate || b.worn - a.worn : b.worn - a.worn || b.rate - a.rate
  );

  const lives = costume.performanceIds
    .map((id) => performanceById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      {/* Below the song (50) and event (60) detail layers so opening one from
          here (via DetailStack) stacks above this dialog rather than behind it. */}
      <Dialog.Backdrop zIndex="40" />
      <Dialog.Positioner zIndex="41">
        <Dialog.Content w="full" maxW="xl" maxH="85vh" mx="4" overflowY="auto">
          <Stack gap="4" p={{ base: '4', md: '6' }}>
            <HStack gap="3" alignItems="flex-start" pl={onBack ? '8' : undefined} pr="8">
              {costume.imageSongId && hasSongThumb(costume.imageSongId) && (
                <SongThumb songId={costume.imageSongId} large />
              )}
              <Stack gap="1" minW="0">
                <Dialog.Title>
                  {costumeDisplayName(costume, i18n.language, songByName)}
                </Dialog.Title>
                <Text color="fg.muted" fontSize="sm" fontVariantNumeric="tabular-nums">
                  {costume.firstDate} – {costume.lastDate}
                </Text>
                <Wrap gap="1">
                  {costume.seriesIds.map((id) => (
                    <SeriesBadge key={id} seriesId={id} />
                  ))}
                </Wrap>
              </Stack>
            </HStack>

            <Grid gap="2" gridTemplateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }}>
              <StatBlock label={t('costumes.stat_lives')} value={costume.liveCount} />
              <StatBlock label={t('costumes.stat_events')} value={costume.eventCount} />
              <StatBlock label={t('costumes.stat_unique_songs')} value={costume.uniqueSongCount} />
              <StatBlock label={t('costumes.stat_witnessed')} value={costume.attendedCount} />
              <StatBlock label={t('costumes.stat_years')} value={costume.yearCount} />
              <StatBlock label={t('costumes.stat_venues')} value={costume.venueCount} />
            </Grid>

            <Stack gap="2">
              <HStack gap="2" justifyContent="space-between" flexWrap="wrap">
                <Text fontWeight="semibold">
                  {t('costumes.songs_worn_for', { count: costume.uniqueSongCount })}
                </Text>
                {hasRates && (
                  <HStack gap="1">
                    <Button
                      size="xs"
                      variant={songSort === 'worn' ? 'subtle' : 'ghost'}
                      onClick={() => setSongSort('worn')}
                    >
                      {t('costumes.song_sort_worn')}
                    </Button>
                    <Button
                      size="xs"
                      variant={songSort === 'rate' ? 'subtle' : 'ghost'}
                      onClick={() => setSongSort('rate')}
                    >
                      {t('costumes.song_sort_rate')}
                    </Button>
                  </HStack>
                )}
              </HStack>
              <Stack gap="1">
                {sortedSongs.map((song) => {
                  const pct = song.total > 0 ? Math.round(song.rate * 100) : undefined;
                  return (
                    <HStack
                      key={song.songId}
                      onClick={() => openSong(song.songId)}
                      cursor="pointer"
                      gap="2"
                      justifyContent="space-between"
                      borderRadius="l2"
                      py="1.5"
                      px="2.5"
                      _hover={{ bgColor: 'bg.subtle' }}
                    >
                      <Text fontSize="sm" lineClamp={1}>
                        {songName(song.songId)}
                      </Text>
                      <HStack
                        title={
                          pct != null
                            ? t('costumes.worn_share_title', {
                                worn: song.worn,
                                total: song.total,
                                pct
                              })
                            : undefined
                        }
                        gap="2"
                        flexShrink={0}
                        color="fg.muted"
                        fontSize="xs"
                        fontVariantNumeric="tabular-nums"
                      >
                        <Text>{t('costumes.worn_times', { count: song.worn })}</Text>
                        {pct != null && (
                          <Text
                            minW="9"
                            color="accent.default"
                            fontWeight="medium"
                            textAlign="right"
                          >
                            {pct}%
                          </Text>
                        )}
                      </HStack>
                    </HStack>
                  );
                })}
              </Stack>
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">
                {t('costumes.worn_in_lives', { count: costume.liveCount })}
              </Text>
              <Stack gap="1">
                {lives.map((p) => {
                  const attended = get(p.id)?.status === 'attended';
                  const label = legLabel(p);
                  return (
                    <HStack
                      key={p.id}
                      onClick={() => openEvent(p.id)}
                      cursor="pointer"
                      gap="2"
                      justifyContent="space-between"
                      borderRadius="l2"
                      py="1.5"
                      px="2.5"
                      _hover={{ bgColor: 'bg.subtle' }}
                    >
                      <Stack gap="0" minW="0">
                        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                          {p.tourName}
                        </Text>
                        <Text color="fg.muted" fontSize="2xs" lineClamp={1}>
                          {p.date}
                          {label ? ` · ${label}` : ''}
                          {p.venue ? ` · ${p.venue}` : ''}
                        </Text>
                      </Stack>
                      {attended && (
                        <Box title={t('costumes.witnessed')} flexShrink={0} color="accent.default">
                          <FaCheck />
                        </Box>
                      )}
                    </HStack>
                  );
                })}
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
