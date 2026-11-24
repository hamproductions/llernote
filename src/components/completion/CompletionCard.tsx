import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { localizedName } from '~/utils/names';
import { Text } from '~/components/ui/text';
import type { computeCompletion } from '~/utils/completion';

export function CompletionCard({
  imageRef,
  compact = false,
  title,
  color,
  date,
  includeRemote,
  result
}: {
  imageRef?: RefObject<HTMLDivElement | null>;
  compact?: boolean;
  title: string;
  color: string;
  date: string;
  includeRemote: boolean;
  result: ReturnType<typeof computeCompletion>;
}) {
  const { t, i18n } = useTranslation();
  const rgb = color.match(/[a-f\d]{2}/gi)?.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) ?? [0, 0, 0];
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const foreground = luminance > 0.179 ? '#000000' : '#ffffff';
  const collected = result.catalog.filter((song) => result.heard.has(song.id));
  const highlights = [...(collected.length ? collected : result.catalog)]
    .sort(
      (a, b) =>
        (result.heard.get(b.id) ?? 0) - (result.heard.get(a.id) ?? 0) ||
        (b.releasedOn ?? '').localeCompare(a.releasedOn ?? '')
    )
    .slice(0, 4);
  const unheard = result.catalog
    .filter((song) => !result.heard.has(song.id))
    .sort((a, b) => (result.performed.get(b.id) ?? 0) - (result.performed.get(a.id) ?? 0))
    .slice(0, 4);

  if (!compact) {
    const columns = Math.max(12, Math.ceil(Math.sqrt(result.catalog.length * 3.5)));
    return (
      <Stack
        ref={imageRef}
        style={{ containerType: 'inline-size', color: foreground }}
        gap="0"
        borderRadius="l3"
        overflow="hidden"
      >
        <Stack
          style={{ backgroundColor: color }}
          gap="4"
          borderTopLeftRadius="l3"
          borderTopRightRadius="l3"
          p="6"
        >
          <HStack gap="3" justifyContent="space-between" alignItems="start" flexWrap="wrap">
            <Text fontSize="sm" fontWeight="bold">
              LLerNote
            </Text>
            <Text fontSize="sm" fontWeight="semibold" overflowWrap="anywhere">
              {title}
            </Text>
          </HStack>
          <Text
            textStyle="display"
            fontSize="clamp(1.5rem, 8cqw, 2.75rem)"
            fontWeight="bold"
            lineHeight="1.05"
            whiteSpace="pre-line"
          >
            {t(includeRemote ? 'completion.share_heading_remote' : 'completion.share_heading')}
          </Text>
          <HStack gap="4" alignItems="end" flexWrap="wrap">
            <Text
              fontSize="clamp(4rem, 25cqw, 8rem)"
              fontWeight="bold"
              fontVariantNumeric="tabular-nums"
              letterSpacing="-0.07em"
              lineHeight="0.9"
            >
              {result.heard.size}
            </Text>
            <Text maxW="10ch" fontSize="lg" fontWeight="semibold" lineHeight="1.2">
              {t('completion.share_catalog', { total: result.catalog.length })}
            </Text>
          </HStack>
          <HStack gap="3" justifyContent="space-between" alignItems="end" flexWrap="wrap">
            <Text fontSize="sm">
              {t('completion.remaining', { count: result.catalog.length - result.heard.size })}
            </Text>
            <Text fontSize="3xl" fontWeight="bold" fontVariantNumeric="tabular-nums" lineHeight="1">
              {result.percent}%
            </Text>
          </HStack>
        </Stack>
        <Box
          style={{ backgroundColor: color, borderColor: foreground }}
          borderBottomWidth="2px"
          h="3"
          borderBottomStyle="dashed"
        />
        <Stack style={{ backgroundColor: foreground, color }} gap="4" p="6">
          <Stack gap="2">
            <Grid
              aria-hidden="true"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              gap="2px"
            >
              {result.catalog.map((song) => (
                <Box
                  key={song.id}
                  style={{ backgroundColor: color, opacity: result.heard.has(song.id) ? 1 : 0.2 }}
                  aspectRatio="1"
                  borderRadius="full"
                />
              ))}
            </Grid>
            <HStack gap="3" justifyContent="space-between" flexWrap="wrap">
              <Text fontSize="xs">{t('completion.map_heard', { count: result.heard.size })}</Text>
              <Text fontSize="xs">
                {t('completion.map_unheard', { count: result.catalog.length - result.heard.size })}
              </Text>
            </HStack>
          </Stack>
          <Grid gap="4" gridTemplateColumns="repeat(2, minmax(0, 1fr))">
            <Stack gap="0">
              <Text fontSize="3xl" fontWeight="bold" fontVariantNumeric="tabular-nums">
                {result.shows}
              </Text>
              <Text fontSize="xs">{t('completion.share_shows')}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="3xl" fontWeight="bold" fontVariantNumeric="tabular-nums">
                {result.plays}
              </Text>
              <Text fontSize="xs">{t('completion.share_plays')}</Text>
            </Stack>
          </Grid>
          {collected.length > 0 && (
            <Stack gap="2">
              <Text fontSize="sm" fontWeight="semibold">
                {t('completion.highlights')}
              </Text>
              {highlights.slice(0, 3).map((song) => (
                <HStack key={song.id} gap="4" justifyContent="space-between" alignItems="start">
                  <Text minW="0" fontSize="sm" fontWeight="medium" overflowWrap="anywhere">
                    {localizedName(i18n.language, song.name, song.englishName)}
                  </Text>
                  <Text flexShrink={0} fontSize="xs" fontVariantNumeric="tabular-nums">
                    {result.heard.get(song.id)} / {result.performed.get(song.id)}
                  </Text>
                </HStack>
              ))}
            </Stack>
          )}
          {unheard.length > 0 && (
            <Stack gap="2">
              <Text fontSize="sm" fontWeight="semibold">
                {t('completion.unheard_highlights')}
              </Text>
              {unheard.slice(0, 3).map((song) => (
                <HStack key={song.id} gap="4" justifyContent="space-between" alignItems="start">
                  <Text minW="0" fontSize="sm" fontWeight="medium" overflowWrap="anywhere">
                    {localizedName(i18n.language, song.name, song.englishName)}
                  </Text>
                  <Text
                    flexShrink={0}
                    maxW="32"
                    fontSize="xs"
                    fontVariantNumeric="tabular-nums"
                    textAlign="right"
                  >
                    {result.performed.has(song.id)
                      ? `0 / ${result.performed.get(song.id)}`
                      : t('completion.never_performed')}
                  </Text>
                </HStack>
              ))}
            </Stack>
          )}
          <Text fontSize="xs">{t('completion.ratio_legend')}</Text>
          <HStack
            style={{ borderColor: `${color}66` }}
            gap="3"
            justifyContent="space-between"
            alignItems="start"
            borderTopWidth="1px"
            pt="4"
            flexWrap="wrap"
          >
            <Text fontSize="xs">
              {t(includeRemote ? 'completion.all_scope' : 'completion.live_scope')}
            </Text>
            <Text fontSize="xs">{t('completion.snapshot', { date })}</Text>
          </HStack>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack
      ref={imageRef}
      gap="0"
      borderColor="border.default"
      borderRadius="l3"
      borderWidth="1px"
      bgColor="bg.default"
      overflow="hidden"
    >
      <Stack
        style={{ backgroundColor: color, color: foreground }}
        gap="2"
        p={{ base: '3', lg: '4' }}
      >
        <HStack justifyContent="space-between" alignItems="start" flexWrap="wrap">
          <Stack flex="1 1 8rem" gap="1" minW="0">
            <Text hideBelow={compact ? 'lg' : undefined} fontSize="xs" fontWeight="semibold">
              LLerNote
            </Text>
            <Text textStyle="display" fontSize={compact ? { base: 'lg', lg: '2xl' } : '2xl'}>
              {title}
            </Text>
            <Text hideBelow={compact ? 'lg' : undefined} fontSize="xs">
              {t(includeRemote ? 'completion.all_scope' : 'completion.live_scope')}
            </Text>
          </Stack>
          <Text
            flexShrink={0}
            fontSize={compact ? { base: '2xl', lg: '4xl' } : '4xl'}
            fontWeight="bold"
            fontVariantNumeric="tabular-nums"
            lineHeight="1.2"
            whiteSpace="nowrap"
          >
            {result.percent}%
          </Text>
        </HStack>
        <Stack gap="2">
          <Text fontSize="sm" fontWeight="semibold">
            {t('completion.collected', { heard: result.heard.size, total: result.catalog.length })}
          </Text>
          <Box
            role="progressbar"
            aria-label={t('completion.title')}
            aria-valuenow={result.heard.size}
            aria-valuemin={0}
            aria-valuemax={result.catalog.length || 1}
            style={{ backgroundColor: `${foreground}33` }}
            borderRadius="full"
            h="1.5"
            overflow="hidden"
          >
            <Box
              style={{ width: `${result.percent}%`, backgroundColor: foreground }}
              borderRadius="full"
              h="full"
            />
          </Box>
          <Text fontSize="xs">
            {t('completion.remaining', { count: result.catalog.length - result.heard.size })}
          </Text>
        </Stack>
      </Stack>
      <Stack gap={{ base: '1', lg: '3' }} p={{ base: '3', lg: '4' }}>
        {highlights.length > 0 && collected.length > 0 && (
          <Stack hideBelow={compact ? 'lg' : undefined} gap="2">
            <Text color="fg.muted" fontSize="xs">
              {t('completion.highlights')}
            </Text>
            {highlights.map((song) => (
              <HStack key={song.id} gap="3" justifyContent="space-between" alignItems="start">
                <Text minW="0" fontSize="sm" fontWeight="medium">
                  {localizedName(i18n.language, song.name, song.englishName)}
                </Text>
                <Text flexShrink={0} color="fg.muted" fontSize="xs">
                  {result.heard.get(song.id)} / {result.performed.get(song.id)}
                </Text>
              </HStack>
            ))}
          </Stack>
        )}
        {unheard.length > 0 && (
          <Stack hideBelow={compact ? 'lg' : undefined} gap="2">
            <Text color="fg.muted" fontSize="xs">
              {t('completion.unheard_highlights')}
            </Text>
            {unheard.map((song) => (
              <HStack key={song.id} gap="3" justifyContent="space-between" alignItems="start">
                <Text minW="0" fontSize="sm" fontWeight="medium">
                  {localizedName(i18n.language, song.name, song.englishName)}
                </Text>
                <Text flexShrink={0} maxW="32" color="fg.muted" fontSize="xs" textAlign="right">
                  {result.performed.has(song.id)
                    ? `0 / ${result.performed.get(song.id)}`
                    : t('completion.never_performed')}
                </Text>
              </HStack>
            ))}
          </Stack>
        )}
        <Text hideBelow={compact ? 'lg' : undefined} color="fg.muted" fontSize="xs">
          {t('completion.ratio_legend')}
        </Text>
        <Grid
          hideBelow={compact ? 'lg' : undefined}
          gap="3"
          gridTemplateColumns="repeat(2, minmax(0, 1fr))"
        >
          <Stack gap="0">
            <Text fontSize="xl" fontWeight="bold" fontVariantNumeric="tabular-nums">
              {result.shows}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {t('completion.shows')}
            </Text>
          </Stack>
          <Stack gap="0">
            <Text fontSize="xl" fontWeight="bold" fontVariantNumeric="tabular-nums">
              {result.plays}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {t('completion.plays')}
            </Text>
          </Stack>
        </Grid>
        {compact && (
          <Text hideFrom="lg" fontSize="xs">
            {t('completion.counts_summary', { shows: result.shows, plays: result.plays })}
          </Text>
        )}
        <Text color="fg.muted" fontSize="xs">
          {t(includeRemote ? 'completion.all_scope' : 'completion.live_scope')} ·{' '}
          {t('completion.snapshot', { date })}
        </Text>
      </Stack>
    </Stack>
  );
}
