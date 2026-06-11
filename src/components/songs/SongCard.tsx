import { useTranslation } from 'react-i18next';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { getPicUrl } from '~/utils/assets';
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
  const { t } = useTranslation();
  const heard = heardCount > 0;

  return (
    <HStack
      onClick={onClick}
      cursor="pointer"
      gap="3"
      borderColor={heard ? 'accent.7' : 'border.subtle'}
      borderRadius="l2"
      borderWidth="1px"
      p="2.5"
      bgColor={heard ? 'accent.a2' : 'bg.default'}
      transition="colors"
      _hover={{ borderColor: 'accent.8' }}
    >
      <Box
        flexShrink={0}
        borderRadius="l1"
        w="11"
        h="11"
        bgColor="bg.subtle"
        opacity={heard ? 1 : 0.55}
        overflow="hidden"
        filter={heard ? undefined : 'grayscale(1)'}
      >
        <img
          src={getPicUrl(song.id, 'thumbnail')}
          alt=""
          loading="lazy"
          width="44"
          height="44"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
      </Box>
      <Stack flex="1" gap="0.5" minW="0">
        <Text
          color={heard ? 'fg.default' : 'fg.muted'}
          fontSize="sm"
          fontWeight="medium"
          lineClamp={1}
        >
          {song.name}
        </Text>
        <HStack gap="1">
          {song.seriesIds.map((id) => (
            <SeriesBadge key={id} seriesId={String(id)} />
          ))}
        </HStack>
      </Stack>
      {heard ? (
        <Badge size="sm" variant="solid" flexShrink={0}>
          {t('songs.times_other', { count: heardCount })}
        </Badge>
      ) : (
        <Badge size="sm" variant="outline" flexShrink={0} color="fg.subtle">
          {t('songs.unheard')}
        </Badge>
      )}
    </HStack>
  );
}
