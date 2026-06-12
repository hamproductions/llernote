import { useTranslation } from 'react-i18next';
import { Grid, HStack, Stack } from 'styled-system/jsx';
import { SongThumb } from './SongThumb';
import { hasSongThumb } from '~/utils/song-thumbs';
import { localizedName } from '~/utils/names';
import { useArtistById } from '~/hooks/useData';
import { clickable } from '~/utils/clickable';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import type { Song } from '~/types';

export function SongCard({
  song,
  heardCount,
  performedCount,
  onClick
}: {
  song: Song;
  heardCount: number;
  performedCount: number;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const artistById = useArtistById();
  const heard = heardCount > 0;
  const artistNames = [
    ...new Set(
      (song.artists ?? [])
        .map((a) => artistById.get(a.id))
        .filter(Boolean)
        .map((a) => localizedName(i18n.language, a!.name, a!.englishName))
    )
  ].join('・');

  return (
    <Grid
      {...clickable(onClick)}
      cursor="pointer"
      gap="2.5"
      gridTemplateColumns={hasSongThumb(song.id) ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr)'}
      borderColor={heard ? 'accent.7' : 'border.subtle'}
      borderRadius="l2"
      borderWidth="1px"
      h="full"
      minH="16"
      p="2"
      bgColor={heard ? 'accent.a2' : 'bg.default'}
      transition="colors"
      _hover={{ borderColor: 'accent.8' }}
    >
      {hasSongThumb(song.id) && <SongThumb songId={song.id} dim={!heard} />}
      <Stack flex="1" gap="0.5" minW="0">
        <HStack gap="2" alignItems="flex-start" minW="0">
          <Text
            title={song.name}
            flex="1"
            minW="0"
            color={heard ? 'fg.default' : 'fg.muted'}
            fontSize="sm"
            fontWeight="medium"
            lineClamp={2}
          >
            {localizedName(i18n.language, song.name, song.englishName)}
          </Text>
          {heard ? (
            <Badge size="sm" variant="solid" flexShrink={0}>
              {t('songs.times', { count: heardCount })}
            </Badge>
          ) : (
            <Badge size="sm" variant="outline" flexShrink={0} color="fg.subtle">
              {t('songs.unheard')}
            </Badge>
          )}
        </HStack>
        <HStack gap="1.5" alignItems="center" flexWrap="wrap">
          {song.seriesIds.slice(0, 2).map((id) => (
            <SeriesBadge key={id} seriesId={String(id)} />
          ))}
          {artistNames && (
            <Text flex="1" minW="0" color="fg.muted" fontSize="2xs" lineClamp={1}>
              {artistNames}
            </Text>
          )}
          {performedCount > 0 && (
            <Text flexShrink={0} color="fg.subtle" fontSize="2xs">
              {t('songs.performed_times', { count: performedCount })}
            </Text>
          )}
        </HStack>
      </Stack>
    </Grid>
  );
}
