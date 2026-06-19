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
import type { Scope } from '~/utils/attendance/witness';
import type { Song } from '~/types';

type CountBadge = { key: 'inperson_count' | 'remote_count'; n: number; palette?: 'blue' };

export function SongCard({
  song,
  scope,
  heardCount,
  watchedCount = 0,
  performedCount,
  onClick
}: {
  song: Song;
  scope: Scope;
  heardCount: number;
  watchedCount?: number;
  performedCount: number;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const artistById = useArtistById();
  // Only surface the attendance counts the selected scope is asking about, so the
  // lead badge reflects the active In-person / Remote / All mode.
  const counts = [
    scope !== 'remote' && heardCount > 0
      ? ({ key: 'inperson_count', n: heardCount } as CountBadge)
      : null,
    scope !== 'inperson' && watchedCount > 0
      ? ({ key: 'remote_count', n: watchedCount, palette: 'blue' } as CountBadge)
      : null
  ].filter((c): c is CountBadge => c != null);
  const [primary, secondary] = counts;
  const seen = counts.length > 0;
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
      borderColor={seen ? 'accent.7' : 'border.subtle'}
      borderRadius="l2"
      borderWidth="1px"
      h="full"
      minH="16"
      p="2"
      bgColor={seen ? 'accent.a2' : 'bg.default'}
      transition="colors"
      _hover={{ borderColor: 'accent.8' }}
    >
      {hasSongThumb(song.id) && <SongThumb songId={song.id} dim={!seen} />}
      <Stack flex="1" gap="0.5" minW="0">
        <HStack gap="2" alignItems="flex-start" minW="0">
          <Text
            title={song.name}
            flex="1"
            minW="0"
            color={seen ? 'fg.default' : 'fg.muted'}
            fontSize="sm"
            fontWeight="medium"
            lineClamp={2}
          >
            {localizedName(i18n.language, song.name, song.englishName)}
          </Text>
          {primary ? (
            <Badge size="sm" variant="solid" colorPalette={primary.palette} flexShrink={0}>
              {t(`songs.${primary.key}`, { count: primary.n })}
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
          {secondary && (
            <Badge size="sm" variant="solid" colorPalette={secondary.palette} flexShrink={0}>
              {t(`songs.${secondary.key}`, { count: secondary.n })}
            </Badge>
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
