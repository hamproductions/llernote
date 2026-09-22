import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowRotateLeft, FaHandshake } from 'react-icons/fa6';
import { Box, Center, HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Text } from '~/components/ui/text';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { NativeSelect } from '~/components/events/NativeSelect';
import { ComparisonInfo } from '~/components/sorter/ComparisonInfo';
import { KeyboardShortcuts } from '~/components/sorter/KeyboardShortcuts';
import { SortTimer } from '~/components/sorter/SortTimer';
import { LiveSortCard } from '~/components/sorter/LiveSortCard';
import { LiveSortFiltersBar } from '~/components/sorter/LiveSortFiltersBar';
import { LiveSortResults } from '~/components/sorter/LiveSortResults';
import {
  EMPTY_LIVE_SORT_FILTERS,
  useLiveSortData,
  type LiveSortFilters
} from '~/hooks/useLiveSortData';
import { usePerformances } from '~/hooks/useData';
import { buildSortCandidates, type SortCandidate, type SortUnit } from '~/utils/live-sort';
import { decodeLiveSortResults } from '~/utils/live-sort-share';

const UNITS: SortUnit[] = ['live', 'performance'];

export default function Page() {
  const { t } = useTranslation();
  const [unit, setUnit] = useState<SortUnit>('live');
  const [filters, setFilters] = useState<LiveSortFilters>(EMPTY_LIVE_SORT_FILTERS);
  const [setlistOpen, setSetlistOpen] = useState(false);
  const [shared, setShared] = useState<{ unit: SortUnit; ranking: SortCandidate[][] }>();

  // `useLocalStorage` hydrates in a mount effect (SSR-safe), so the sorter state is
  // undefined on the first paint. Without this guard an in-progress ranking would
  // flash the setup screen before resuming.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const performances = usePerformances();
  const {
    state,
    isEnded,
    progress,
    comparisonsCount,
    isEstimatedCount,
    maxComparisons,
    candidates,
    songOrdinals,
    currentPair,
    ranking,
    timer,
    pickLeft,
    pickRight,
    pickTie,
    pickUndo,
    start,
    reset
  } = useLiveSortData(filters, unit);

  // A shared ranking arrives as candidate ids, which must be resolved against the
  // full catalogue rather than the current (attendance-filtered) pool.
  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get('d');
    if (!encoded) return;
    const decoded = decodeLiveSortResults(encoded);
    if (!decoded) return;
    const byId = new Map(
      buildSortCandidates(performances, decoded.unit).map((candidate) => [candidate.id, candidate])
    );
    const resolved = decoded.results
      .map((bucket) =>
        bucket
          .map((id) => byId.get(id))
          .filter((candidate): candidate is SortCandidate => candidate !== undefined)
      )
      .filter((bucket) => bucket.length > 0);
    if (resolved.length > 0) setShared({ unit: decoded.unit, ranking: resolved });
  }, [performances]);

  const unitOptions = useMemo(
    () => UNITS.map((value) => ({ value, label: t(`sort.unit_${value}`) })),
    [t]
  );

  const started = hydrated && state !== undefined && state !== null;

  if (shared) {
    return (
      <>
        <Metadata title={`${t('sort.shared_result')} - LLerNote`} helmet />
        <Stack gap="4">
          <LiveSortResults ranking={shared.ranking} unit={shared.unit} readOnly />
          <Box>
            <Button
              variant="outline"
              onClick={() => {
                setShared(undefined);
                window.history.replaceState(null, '', window.location.pathname);
              }}
            >
              {t('sort.back_to_sort')}
            </Button>
          </Box>
        </Stack>
      </>
    );
  }

  return (
    <>
      <Metadata title={`${t('sort.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <Stack gap="1">
          <SectionHeading size="2xl">{t('sort.title')}</SectionHeading>
          <Text color="fg.muted" fontSize="sm">
            {t('sort.subtitle')}
          </Text>
        </Stack>

        {!started && (
          <Stack gap="4">
            <HStack gap="3" alignItems="flex-end" flexWrap="wrap">
              <Stack gap="1">
                <Text
                  color="fg.subtle"
                  fontSize="2xs"
                  fontWeight="bold"
                  letterSpacing="wider"
                  textTransform="uppercase"
                >
                  {t('sort.unit')}
                </Text>
                <NativeSelect
                  value={unit}
                  aria-label={t('sort.unit')}
                  options={unitOptions}
                  onChange={(value) => setUnit(value as SortUnit)}
                />
              </Stack>
              <Text pb="2" color="fg.muted" fontSize="sm">
                {t(`sort.unit_${unit}_hint`)}
              </Text>
            </HStack>

            <LiveSortFiltersBar filters={filters} onChange={setFilters} />

            <HStack gap="3" flexWrap="wrap">
              <Button onClick={start} disabled={candidates.length < 2}>
                {t('sort.start')}
              </Button>
              <Text color="fg.muted" fontSize="sm">
                {candidates.length < 2
                  ? t('sort.not_enough')
                  : t('sort.candidates_count', { count: candidates.length })}
              </Text>
            </HStack>
          </Stack>
        )}

        {started && !isEnded && currentPair && (
          <Stack gap="4">
            <Stack gap="2">
              <Progress value={progress * 100} />
              <HStack gap="4" justifyContent="center" flexWrap="wrap">
                <ComparisonInfo
                  comparisonsCount={comparisonsCount}
                  isEstimatedCount={isEstimatedCount}
                  maxComparisons={maxComparisons}
                />
                <SortTimer active getElapsedMs={timer.getElapsedMs} />
              </HStack>
            </Stack>

            <Center>
              <Text fontWeight="bold">{t('sort.which_better')}</Text>
            </Center>

            {/* Two shared rows — details, then setlist — that both cards opt into with
                `subgrid`. The details row is sized to the taller of the two headers, so
                the setlists always start at the same height however the titles wrap. */}
            <Box
              display="grid"
              gap="3"
              alignItems="stretch"
              gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}
              gridTemplateRows={{ md: 'auto 1fr' }}
            >
              <LiveSortCard
                candidate={currentPair.left}
                onPick={pickLeft}
                setlistOpen={setlistOpen}
                onToggleSetlist={() => setSetlistOpen((v) => !v)}
                songOrdinals={songOrdinals}
              />
              <LiveSortCard
                candidate={currentPair.right}
                onPick={pickRight}
                setlistOpen={setlistOpen}
                onToggleSetlist={() => setSetlistOpen((v) => !v)}
                songOrdinals={songOrdinals}
              />
            </Box>

            <HStack gap="2" justifyContent="center" flexWrap="wrap">
              <Button variant="outline" onClick={pickTie}>
                <FaHandshake />
                {t('sort.tie')}
              </Button>
              <Button variant="outline" onClick={pickUndo}>
                <FaArrowRotateLeft />
                {t('sort.undo')}
              </Button>
              <Button variant="ghost" onClick={reset}>
                {t('sort.start_over')}
              </Button>
            </HStack>

            <Center>
              <KeyboardShortcuts noTieMode={false} />
            </Center>
          </Stack>
        )}

        {started && !isEnded && !currentPair && (
          <Stack gap="3">
            <Text color="fg.muted">{t('sort.resume_hint')}</Text>
            <Box>
              <Button variant="outline" onClick={reset}>
                {t('sort.start_over')}
              </Button>
            </Box>
          </Stack>
        )}

        {started && isEnded && (
          <Stack gap="4">
            <LiveSortResults ranking={ranking} unit={unit} />
            <HStack gap="2" flexWrap="wrap">
              <SortTimer active getElapsedMs={timer.getElapsedMs} frozen />
              <Button variant="outline" onClick={reset}>
                {t('sort.start_over')}
              </Button>
            </HStack>
          </Stack>
        )}
      </Stack>
    </>
  );
}
