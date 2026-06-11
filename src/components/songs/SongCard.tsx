import { useTranslation } from 'react-i18next';
import { HStack, Stack } from 'styled-system/jsx';
import { SongThumb } from './SongThumb';
import { localizedName } from '~/utils/names';
import { clickable } from '~/utils/clickable';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import type { Song } from '~/types';

export function SongCard({
  song,
  heardCount,
  onClick
}: {
  song: Song;
  heardCount: number;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const heard = heardCount > 0;

  return (
    <HStack
      {...clickable(onClick)}
      cursor="pointer"
      gap="2.5"
      borderColor={heard ? 'accent.7' : 'border.subtle'}
      borderRadius="l2"
      borderWidth="1px"
      p="2"
      bgColor={heard ? 'accent.a2' : 'bg.default'}
      transition="colors"
      _hover={{ borderColor: 'accent.8' }}
    >
      <SongThumb songId={song.id} dim={!heard} />
      <Stack flex="1" gap="0.5" minW="0">
        <Text
          title={song.name}
          color={heard ? 'fg.default' : 'fg.muted'}
          fontSize="sm"
          fontWeight="medium"
          lineClamp={2}
        >
          {localizedName(i18n.language, song.name, song.englishName)}
        </Text>
        <HStack gap="1">
          {song.seriesIds.map((id) => (
            <SeriesBadge key={id} seriesId={String(id)} />
          ))}
        </HStack>
      </Stack>
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
  );
}
