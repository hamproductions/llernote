import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/styled/text';
import { LiveHero } from './LiveHero';
import { useSeriesById } from '~/hooks/useData';
import { colorBarBackground, seriesColors } from '~/utils/series-contrast';
import type { SortCandidate } from '~/utils/live-sort';

export function LiveSortRankingGrid({
  ref,
  ranking
}: {
  ref?: Ref<HTMLDivElement>;
  ranking: SortCandidate[][];
}) {
  const { t } = useTranslation();
  const seriesById = useSeriesById();

  // Ties share a rank number, and the next bucket skips ahead by the tie width
  // (1, 2, 2, 4) rather than continuing sequentially.
  const rows = ranking.map((bucket, index) => ({
    rank: ranking.slice(0, index).flat().length + 1,
    bucket
  }));

  // Reading-order blocks rather than one item per line: a poster only earns its
  // space if several fit across, and the rank number carries the order that a
  // single column would otherwise have to. Rows are separated by a rule so each
  // band of ranks still reads as a row.
  return (
    <Stack ref={ref} gap="0" borderRadius="l3" p="3" bgColor="bg.canvas">
      {rows.map(({ rank, bucket }, rowIndex) => (
        <Grid
          key={bucket[0]!.id}
          gap="3"
          gridTemplateColumns={{
            base: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)'
          }}
          borderColor="border.subtle"
          borderTopWidth={rowIndex === 0 ? '0' : '1px'}
          py="3"
        >
          {bucket.map((candidate, indexInBucket) => (
            <Stack
              key={candidate.id}
              gap="0"
              borderColor="border.default"
              borderRadius="l2"
              borderWidth="1px"
              minW="0"
              bgColor="bg.default"
              overflow="hidden"
            >
              <Box position="relative">
                <LiveHero candidate={candidate} fill />
                {/* Rank sits on the poster so the cell is readable at a glance and the
                    artwork keeps the full width of its block. */}
                <Center
                  position="absolute"
                  top="1.5"
                  left="1.5"
                  borderRadius="l1"
                  minW="7"
                  h="7"
                  px="1.5"
                  color="white"
                  bgColor="rgba(0,0,0,0.66)"
                >
                  <Text fontSize="sm" fontWeight="bold" fontVariantNumeric="tabular-nums">
                    {indexInBucket === 0 ? rank : t('sort.tied')}
                  </Text>
                </Center>
              </Box>

              <HStack flex="1" gap="0" alignItems="stretch">
                {/* ll-fans-style series sidebar, flush to the cell edge. */}
                <Box
                  aria-hidden
                  style={{
                    background: colorBarBackground(seriesColors(candidate.seriesIds, seriesById))
                  }}
                  flexShrink={0}
                  alignSelf="stretch"
                  w="1.5"
                />
                <Stack flex="1" gap="0.5" minW="0" p="2">
                  <Text fontSize="xs" fontWeight="semibold" lineClamp={3}>
                    {candidate.title}
                  </Text>
                  {candidate.subtitle && (
                    <Text color="accent.text" fontSize="2xs" fontWeight="semibold" lineClamp={1}>
                      {candidate.subtitle}
                    </Text>
                  )}
                  <Text
                    color="fg.subtle"
                    fontSize="2xs"
                    fontVariantNumeric="tabular-nums"
                    lineClamp={1}
                  >
                    {candidate.startDate === candidate.endDate
                      ? candidate.startDate
                      : `${candidate.startDate} – ${candidate.endDate}`}
                  </Text>
                </Stack>
              </HStack>
            </Stack>
          ))}
        </Grid>
      ))}
    </Stack>
  );
}
