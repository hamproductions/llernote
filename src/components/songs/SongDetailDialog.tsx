import { useTranslation } from 'react-i18next';
import { FaXmark, FaYoutube } from 'react-icons/fa6';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { SongThumb } from './SongThumb';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { useArtistById } from '~/hooks/useData';
import { localizedName } from '~/utils/names';
import type { Performance, Song } from '~/types';

interface SongWithVideo extends Song {
  musicVideo?: { videoId: string } | null;
}

export function SongDetailDialog({
  song,
  heardAt,
  open,
  onClose
}: {
  song?: Song;
  heardAt: Performance[];
  open: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const artistById = useArtistById();

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

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content w="full" maxW="lg" maxH="85vh" mx="4" overflowY="auto">
          <Stack gap="4" p={{ base: '4', md: '6' }}>
            <HStack
              gap="3"
              alignItems="flex-start"
              borderColor="border.subtle"
              borderBottomWidth="1px"
              pr="8"
              pb="3"
            >
              <SongThumb songId={song.id} large />
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
              <Button asChild size="xs" variant="outline">
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaYoutube />
                  YouTube
                </a>
              </Button>
            )}

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
                <Stack gap="1">
                  {heardAt.map((p) => (
                    <HStack key={p.id} gap="2" alignItems="baseline">
                      <Text
                        flexShrink={0}
                        color="fg.muted"
                        fontSize="xs"
                        fontVariantNumeric="tabular-nums"
                      >
                        {p.date}
                      </Text>
                      <Text fontSize="sm" lineClamp={1}>
                        {p.tourName}
                      </Text>
                    </HStack>
                  ))}
                </Stack>
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
