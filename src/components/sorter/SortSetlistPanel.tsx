import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleExclamation } from 'react-icons/fa6';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { SetlistItemRow } from '~/components/events/EventDetailDialog';
import { Tabs } from '~/components/ui/tabs';
import { Text } from '~/components/ui/styled/text';
import { useDetail } from '~/components/detail/DetailStack';
import { usePerformanceById, useSetlists } from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import { legTabLabel, type SortCandidate } from '~/utils/live-sort';
import {
  buildWitnessBySong,
  songWitnessInfo,
  type SongSetlistInsight
} from '~/utils/setlist-insights';
import type { Performance } from '~/types';

interface SortSetlistPanelProps {
  candidate: SortCandidate;
  /** performanceId -> songId -> how many earlier performances played it. */
  songOrdinals: Map<string, Map<string, number>>;
}

function Remark({ note }: { note: string }) {
  const { t } = useTranslation();
  return (
    <Stack gap="1" borderColor="border.subtle" borderTopWidth="1px" pt="2">
      <HStack gap="1.5" color="fg.muted">
        <FaCircleExclamation />
        <Text fontSize="xs" fontWeight="semibold">
          {t('sort.remarks')}
        </Text>
      </HStack>
      <Text color="fg.muted" fontSize="xs">
        {note}
      </Text>
    </Stack>
  );
}

function LegSetlist({
  performance,
  songOrdinals
}: {
  performance: Performance;
  songOrdinals: Map<string, Map<string, number>>;
}) {
  const { t } = useTranslation();
  const setlists = useSetlists();
  const performanceById = usePerformanceById();
  const { records } = useAttendance();
  const { openSong } = useDetail();
  const setlist = setlists[performance.id];
  const ordinals = songOrdinals.get(performance.id);

  // "The Nth time you've seen this song", same tally the event dialog shows. Only
  // meaningful for a live you attended, so it is skipped otherwise.
  const attended = records.some(
    (record) => record.performanceId === performance.id && record.status === 'attended'
  );
  const witnessBySong = useMemo(
    () => (attended ? buildWitnessBySong(performance, records, performanceById, setlists) : null),
    [attended, performance, records, performanceById, setlists]
  );

  if (!setlist || setlist.items.length === 0) {
    return (
      <Text color="fg.subtle" fontSize="xs">
        {t('sort.no_setlist')}
      </Text>
    );
  }

  // Non-song rows (MC, VTR) sit between songs but must not consume a track number,
  // so number the songs up front rather than mutating a counter during render.
  const songNumbers = new Map<string, number>();
  for (const item of setlist.items) {
    if (item.type === 'song') songNumbers.set(item.id, songNumbers.size + 1);
  }

  return (
    <Stack gap="1">
      {setlist.items.map((item) => {
        const performedBefore = item.songId ? ordinals?.get(item.songId) : undefined;
        // A song with no earlier performance is a debut; SetlistItemRow renders the
        // 初披露 badge off `isDebut`, so derive it from the same ordinal rather than
        // running the far heavier buildSetlistInsights per card.
        const insight: SongSetlistInsight | undefined =
          performedBefore === undefined ? undefined : { isDebut: performedBefore === 0 };
        return (
          <SetlistItemRow
            key={item.id}
            item={item}
            index={songNumbers.get(item.id) ?? 0}
            showArtists={false}
            setlistInsight={insight}
            witnessInfo={
              item.type === 'song'
                ? songWitnessInfo(witnessBySong, item.songId, performance)
                : undefined
            }
            performedBeforeCount={performedBefore}
            onSelectSong={openSong}
          />
        );
      })}
    </Stack>
  );
}

export function SortSetlistPanel({ candidate, songOrdinals }: SortSetlistPanelProps) {
  const legs = candidate.performances;
  const [activeLegId, setActiveLegId] = useState(legs[0]?.id ?? '');

  const active = legs.find((leg) => leg.id === activeLegId) ?? legs[0]!;

  // Performance mode ranks one show per card, so a tab strip would be a single tab on
  // both sides — noise, and no alignment risk since neither card has one. Live mode
  // keeps the strip even for a one-leg tour, because its opponent may have six and the
  // two setlists have to start at the same height.
  if (candidate.unit === 'performance') {
    return (
      <Stack gap="3" pt="2">
        <LegSetlist performance={active} songOrdinals={songOrdinals} />
        {active.note && <Remark note={active.note} />}
      </Stack>
    );
  }

  // A tour can run 30+ dates. Stacking every leg's setlist makes one enormous scroll,
  // so each leg gets a tab and only the selected one renders.

  return (
    <Tabs.Root
      value={active.id}
      onValueChange={(details) => setActiveLegId(details.value)}
      size="sm"
      pt="2"
    >
      <Box mx="-1" px="1" overflowX="auto" overflowY="hidden">
        <Tabs.List width="max-content" minW="full">
          {legs.map((leg) => {
            const label = legTabLabel(leg);
            return (
              <Tabs.Trigger
                key={leg.id}
                value={leg.id}
                title={label.full}
                flexShrink={0}
                maxW="15rem"
                // The recipe sizes the trigger for one line of text, so two lines need an
                // explicit height plus room under the venue for the 2px active indicator
                // the list draws at its bottom edge. The `line` variant sets that padding
                // as `_horizontal: { pb: '2.5' }` — an attribute selector that outranks a
                // flat `pb` prop, so the override has to use the same condition.
                h="auto"
                pt="2"
                _horizontal={{ pb: '3.5' }}
              >
                {/* The trigger's `textStyle: sm` sets `lineHeight: 1.25rem` — an absolute
                    length, which the smaller venue line would inherit verbatim and sit in
                    a line box half again its own height. A unitless ratio makes each line
                    lead proportionally to its own font size. */}
                <Stack gap="0.5" alignItems="flex-start" minW="0" lineHeight="1.3">
                  <HStack gap="1" minW="0">
                    <Box maxW="full" textOverflow="ellipsis" overflow="hidden" whiteSpace="nowrap">
                      {label.primary}
                    </Box>
                    {leg.note && (
                      // Flag legs carrying a remark so a caveat on date 17 of 30 is not
                      // invisible until you happen to click that tab.
                      <Box
                        aria-hidden
                        flexShrink={0}
                        borderRadius="full"
                        w="1.5"
                        h="1.5"
                        bgColor="fg.muted"
                      />
                    )}
                  </HStack>
                  {label.secondary && (
                    <Box
                      maxW="full"
                      color="fg.subtle"
                      fontSize="xs"
                      fontWeight="normal"
                      textOverflow="ellipsis"
                      overflow="hidden"
                      whiteSpace="nowrap"
                    >
                      {label.secondary}
                    </Box>
                  )}
                </Stack>
              </Tabs.Trigger>
            );
          })}
          <Tabs.Indicator />
        </Tabs.List>
      </Box>

      {/* Only the selected leg gets a panel. A 30-date tour would otherwise build 30
          setlists per card for no benefit, and mounting them lazily inside Tabs is
          the one part of the machine that does not behave under jsdom. */}
      <Tabs.Content value={active.id}>
        <Stack gap="3">
          <LegSetlist performance={active} songOrdinals={songOrdinals} />
          {active.note && <Remark note={active.note} />}
        </Stack>
      </Tabs.Content>
    </Tabs.Root>
  );
}
