import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { useArtistById, usePerformances, useSeriesById, useSongById } from '~/hooks/useData';
import type { MyPick } from '~/types/attendance';

export const MyPickCard = forwardRef<HTMLDivElement, { myPick: MyPick }>(function MyPickCard(
  { myPick },
  ref
) {
  const { t } = useTranslation();
  const performances = usePerformances();
  const artistById = useArtistById();
  const songById = useSongById();
  const seriesById = useSeriesById();

  const events = myPick.eventIds
    .map((id) => performances.find((p) => p.id === id))
    .filter((p) => p !== undefined);
  const artists = myPick.artistIds.map((id) => artistById.get(id)).filter((a) => a !== undefined);
  const songs = myPick.songIds.map((id) => songById.get(id)).filter((s) => s !== undefined);

  return (
    <Box
      ref={ref}
      borderColor="accent.default"
      borderRadius="l3"
      borderWidth="2px"
      w="full"
      maxW="xl"
      p="6"
      bgColor="bg.default"
    >
      <Stack gap="4">
        <HStack justifyContent="space-between" alignItems="baseline">
          <Text color="accent.default" fontSize="xl" fontWeight="bold">
            {t('mypick.share_title')}
          </Text>
          <Text color="fg.subtle" fontSize="xs">
            {t('stats.generated_by')}
          </Text>
        </HStack>
        {myPick.year != null && (
          <HStack gap="2">
            <Text fontSize="sm" fontWeight="semibold">
              {t('mypick.favorite_year')}
            </Text>
            <Badge variant="solid">{myPick.year}</Badge>
          </HStack>
        )}
        {artists.length > 0 && (
          <Stack gap="1">
            <Text fontSize="sm" fontWeight="semibold">
              {t('mypick.favorite_groups')}
            </Text>
            <Wrap gap="1">
              {artists.map((artist) => {
                const color = seriesById.get(String(artist.seriesIds[0] ?? ''))?.color;
                return (
                  <Badge
                    key={artist.id}
                    style={color ? { backgroundColor: color, color: 'white' } : undefined}
                  >
                    {artist.name}
                  </Badge>
                );
              })}
            </Wrap>
          </Stack>
        )}
        {events.length > 0 && (
          <Stack gap="1">
            <Text fontSize="sm" fontWeight="semibold">
              {t('mypick.favorite_events')}
            </Text>
            {events.map((event) => (
              <HStack key={event.id} gap="2">
                <Text color="fg.muted" fontSize="xs" fontVariantNumeric="tabular-nums">
                  {event.date}
                </Text>
                <Text fontSize="sm" lineClamp={1}>
                  {event.tourName}
                </Text>
              </HStack>
            ))}
          </Stack>
        )}
        {songs.length > 0 && (
          <Stack gap="1">
            <Text fontSize="sm" fontWeight="semibold">
              {t('mypick.favorite_songs')}
            </Text>
            <Wrap gap="1">
              {songs.map((song) => (
                <Badge key={song.id} variant="outline">
                  {song.name}
                </Badge>
              ))}
            </Wrap>
          </Stack>
        )}
      </Stack>
    </Box>
  );
});
