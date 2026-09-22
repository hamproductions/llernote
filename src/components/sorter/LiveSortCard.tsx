import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/styled/text';
import { CategoryBadge } from '~/components/events/CategoryBadge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { SortSetlistPanel } from './SortSetlistPanel';
import { LiveHero } from './LiveHero';
import { candidateSongIds, type SortCandidate } from '~/utils/live-sort';
import { useSetlists } from '~/hooks/useData';
import { clickable } from '~/utils/clickable';

interface LiveSortCardProps {
  candidate: SortCandidate;
  onPick: () => void;
  setlistOpen: boolean;
  onToggleSetlist: () => void;
  songOrdinals: Map<string, Map<string, number>>;
}

const dateRange = (candidate: SortCandidate) =>
  candidate.startDate === candidate.endDate
    ? candidate.startDate
    : `${candidate.startDate} – ${candidate.endDate}`;

export function LiveSortCard({
  candidate,
  onPick,
  setlistOpen,
  onToggleSetlist,
  songOrdinals
}: LiveSortCardProps) {
  const { t } = useTranslation();
  const setlists = useSetlists();
  const lead = candidate.performances[0];
  const songCount = candidateSongIds(candidate, setlists).length;
  const venues = [...new Set(candidate.performances.map((p) => p.venue).filter(Boolean))];

  // Spans the parent's two shared rows via `subgrid`, so this card's details block and
  // its sibling's are sized as one row and their setlists line up. Where subgrid is
  // unsupported the card falls back to its own auto rows — misaligned, but intact.
  // Stacks as a plain column below `md`, where the cards are not side by side.
  return (
    <Stack
      display={{ md: 'grid' }}
      gap="0"
      gridRow={{ md: 'span 2' }}
      gridTemplateRows={{ md: 'subgrid' }}
      borderColor="border.default"
      borderRadius="l3"
      borderWidth="1px"
      minW="0"
      bgColor="bg.default"
      overflow="hidden"
    >
      {/* Portrait hero beside the details rather than above them: the card is far wider
          than a 3:4 poster, so stacking it would strand dead space either side, while the
          text happily fills the width the poster cannot. It also lets the hero stay put
          when the setlist opens, so nothing resizes.

          Content hugs the top of the shared details row; any slack from the taller
          sibling sits just above the divider. */}
      <HStack
        {...clickable(onPick)}
        cursor="pointer"
        gap="4"
        alignItems="flex-start"
        minH="0"
        p="4"
        _hover={{ bgColor: 'bg.subtle' }}
      >
        <LiveHero candidate={candidate} />

        <Stack flex="1" gap="2.5" minW="0">
          <Stack gap="1">
            <Text fontSize="lg" fontWeight="bold" lineClamp={3}>
              {candidate.title}
            </Text>
            {candidate.subtitle && (
              // In performance mode the specific show is the thing being ranked, so it
              // reads as part of the title rather than as muted supporting text.
              <Text color="accent.text" fontSize="md" fontWeight="bold" lineClamp={2}>
                {candidate.subtitle}
              </Text>
            )}
            <Text color="fg.subtle" fontSize="xs" fontVariantNumeric="tabular-nums">
              {dateRange(candidate)}
            </Text>
            {venues.length > 0 && (
              <Text color="fg.subtle" fontSize="xs" lineClamp={2}>
                {venues.slice(0, 3).join('・')}
                {venues.length > 3 ? '…' : ''}
              </Text>
            )}
          </Stack>

          <Wrap gap="1">
            {candidate.seriesIds.map((seriesId) => (
              <SeriesBadge key={seriesId} seriesId={seriesId} />
            ))}
            {lead && <CategoryBadge category={lead.category} tourType={lead.tourType} />}
          </Wrap>

          <HStack gap="3" color="fg.muted" fontSize="xs" fontVariantNumeric="tabular-nums">
            <Text>{t('sort.song_count', { count: songCount })}</Text>
            {candidate.performances.length > 1 && (
              <Text>{t('sort.leg_count', { count: candidate.performances.length })}</Text>
            )}
          </HStack>
        </Stack>
      </HStack>

      {/* Fills the shared setlist row so an expanded setlist scrolls inside it rather
          than leaving the space empty. `minH="0"` lets the scroll child shrink below its
          content height, which neither a flex nor a grid item does by default. */}
      <Stack
        display="flex"
        flex="1"
        gap="0"
        borderColor="border.subtle"
        borderTopWidth="1px"
        minH="0"
        overflow="hidden"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSetlist}
          aria-expanded={setlistOpen}
          flexShrink={0}
          borderRadius="0"
          width="full"
        >
          {setlistOpen ? <FaChevronUp /> : <FaChevronDown />}
          {setlistOpen ? t('sort.hide_setlist') : t('sort.show_setlist')}
        </Button>
        {setlistOpen && (
          <Box flex="1" minH="0" maxH="26rem" px="4" pb="4" overflowY="auto">
            <SortSetlistPanel candidate={candidate} songOrdinals={songOrdinals} />
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
