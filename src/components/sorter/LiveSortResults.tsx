import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaLink, FaRegClipboard, FaRegFileLines } from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/styled/text';
import { LiveHero } from './LiveHero';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useToaster } from '~/context/ToasterContext';
import { useSeriesById } from '~/hooks/useData';
import { colorBarBackground, seriesColors } from '~/utils/series-contrast';
import {
  canCopyImageToClipboard,
  copyElementImageToClipboard,
  copyTextToClipboard,
  downloadElementAsImage
} from '~/utils/share';
import {
  encodeLiveSortResults,
  formatLiveSortText,
  liveSortShareUrl
} from '~/utils/live-sort-share';
import type { SortCandidate, SortUnit } from '~/utils/live-sort';

interface LiveSortResultsProps {
  /** Rank buckets; candidates sharing a bucket are tied. */
  ranking: SortCandidate[][];
  unit: SortUnit;
  readOnly?: boolean;
}

export function LiveSortResults({ ranking, unit, readOnly }: LiveSortResultsProps) {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const seriesById = useSeriesById();
  // Resolved on mount so the button set does not change between server and client render.
  const [canCopyImage, setCanCopyImage] = useState(false);
  useEffect(() => setCanCopyImage(canCopyImageToClipboard()), []);

  // Ties share a rank number, and the next bucket skips ahead by the tie width
  // (1, 2, 2, 4) rather than continuing sequentially.
  let nextRank = 1;
  const rows = ranking.map((bucket) => {
    const rank = nextRank;
    nextRank += bucket.length;
    return { rank, bucket };
  });

  const onCopyLink = async () => {
    const encoded = encodeLiveSortResults({
      unit,
      results: ranking.map((bucket) => bucket.map((candidate) => candidate.id))
    });
    await copyTextToClipboard(liveSortShareUrl(encoded));
    toast({ title: t('sort.link_copied'), type: 'success' });
  };

  const onCopyText = async () => {
    await copyTextToClipboard(formatLiveSortText(ranking));
    toast({ title: t('sort.text_copied'), type: 'success' });
  };

  const onSaveImage = async () => {
    if (!resultsRef.current) return;
    setSaving(true);
    try {
      await downloadElementAsImage(resultsRef.current, 'llernote-live-ranking.png');
    } finally {
      setSaving(false);
    }
  };

  const onCopyImage = async () => {
    if (!resultsRef.current) return;
    setCopying(true);
    try {
      await copyElementImageToClipboard(resultsRef.current);
      toast({ title: t('sort.image_copied'), type: 'success' });
    } catch {
      // Clipboard writes fail on a denied permission or an unfocused document; falling
      // back to a download still gets the user their image.
      await downloadElementAsImage(resultsRef.current, 'llernote-live-ranking.png');
    } finally {
      setCopying(false);
    }
  };

  return (
    <Stack gap="4">
      <HStack gap="2" justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <SectionHeading>{t('sort.results_title')}</SectionHeading>
        {!readOnly && (
          <HStack gap="2">
            <Button variant="outline" size="sm" onClick={onCopyLink}>
              <FaLink />
              {t('sort.copy_link')}
            </Button>
            <Button variant="outline" size="sm" onClick={onCopyText}>
              <FaRegFileLines />
              {t('sort.copy_text')}
            </Button>
            {canCopyImage && (
              <Button variant="outline" size="sm" onClick={onCopyImage} disabled={copying}>
                <FaRegClipboard />
                {t('sort.copy_image')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onSaveImage} disabled={saving}>
              <FaDownload />
              {t('sort.save_image')}
            </Button>
          </HStack>
        )}
      </HStack>

      {/* Reading-order blocks rather than one item per line: a poster only earns its
          space if several fit across, and the rank number carries the order that a
          single column would otherwise have to. Rows are separated by a rule so each
          band of ranks still reads as a row. */}
      <Stack ref={resultsRef} gap="0" borderRadius="l3" p="3" bgColor="bg.canvas">
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
    </Stack>
  );
}
