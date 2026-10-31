import { useTranslation } from 'react-i18next';
import { Grid, HStack, Stack } from 'styled-system/jsx';
import { SongThumb } from '~/components/songs/SongThumb';
import { hasSongThumb } from '~/utils/song-thumbs';
import { clickable } from '~/utils/clickable';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import type { CostumeSummary } from '~/utils/costumes';

export function CostumeCard({
  costume,
  name,
  signature,
  onClick
}: {
  costume: CostumeSummary;
  name: string;
  signature?: { name: string; pct?: number };
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const seen = costume.attendedCount > 0;
  const hasThumb = costume.imageSongId != null && hasSongThumb(costume.imageSongId);
  // The summary is already scope-filtered, so witnessed (in-person) and watched
  // (remote) only carry counts for the active mode — lead with whichever applies.
  const counts = [
    costume.witnessedCount > 0
      ? ({ key: 'witnessed_count', n: costume.witnessedCount } as const)
      : null,
    costume.watchedCount > 0
      ? ({ key: 'watched_count', n: costume.watchedCount, palette: 'blue' } as const)
      : null
  ].filter((c) => c != null);
  const [primary, secondary] = counts;

  return (
    <Grid
      {...clickable(onClick)}
      cursor="pointer"
      gap="2.5"
      gridTemplateColumns={hasThumb ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr)'}
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
      {hasThumb && <SongThumb songId={costume.imageSongId!} dim={!seen} />}
      <Stack flex="1" gap="0.5" minW="0">
        <HStack gap="2" alignItems="flex-start" minW="0">
          <Text
            title={costume.name}
            flex="1"
            minW="0"
            color={seen ? 'fg.default' : 'fg.muted'}
            fontSize="sm"
            fontWeight="medium"
            lineClamp={2}
          >
            {name}
          </Text>
          {primary ? (
            <Badge
              size="sm"
              variant="solid"
              colorPalette={'palette' in primary ? primary.palette : undefined}
              flexShrink={0}
            >
              {t(`costumes.${primary.key}`, { count: primary.n })}
            </Badge>
          ) : (
            <Badge size="sm" variant="outline" flexShrink={0} color="fg.subtle">
              {t('costumes.lives_count', { count: costume.liveCount })}
            </Badge>
          )}
        </HStack>
        <HStack gap="1.5" alignItems="center" flexWrap="wrap">
          {costume.seriesIds.slice(0, 2).map((id) => (
            <SeriesBadge key={id} seriesId={id} />
          ))}
          {signature && (
            <Text flex="1" minW="0" color="fg.muted" fontSize="2xs" lineClamp={1}>
              {signature.name}
              {signature.pct != null ? ` · ${signature.pct}%` : ''}
            </Text>
          )}
          {secondary && (
            <Badge size="sm" variant="solid" colorPalette="blue" flexShrink={0}>
              {t(`costumes.${secondary.key}`, { count: secondary.n })}
            </Badge>
          )}
          <Text flexShrink={0} color="fg.subtle" fontSize="2xs">
            {t('costumes.songs_count', { count: costume.uniqueSongCount })}
          </Text>
        </HStack>
      </Stack>
    </Grid>
  );
}
