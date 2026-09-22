import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSorter } from './useSorter';
import { useSortTimer } from './useSortTimer';
import { useAttendance } from './useAttendance';
import { useAllPerformances, useAllSetlists, usePerformances } from './useData';
import { useToaster } from '~/context/ToasterContext';
import { getCurrentItem } from '~/utils/sort';
import { buildSongPerformanceOrdinals } from '~/utils/setlist-insights';
import { isFutureEvent } from '~/utils/event-filter';
import {
  LIVE_SORT_PREFIX,
  buildSortCandidates,
  type SortCandidate,
  type SortUnit
} from '~/utils/live-sort';
import type { Performance } from '~/types';

export interface LiveSortFilters {
  attendedOnly: boolean;
  seriesIds: string[];
  categories: string[];
  yearFrom?: number;
  yearTo?: number;
  search: string;
}

export const EMPTY_LIVE_SORT_FILTERS: LiveSortFilters = {
  attendedOnly: true,
  seriesIds: [],
  categories: [],
  search: ''
};

/**
 * Someone else's festival that a LoveLive act guested at — not a LoveLive live, so it
 * does not belong in a ranking of them.
 *
 * Deliberately not `外部イベント内のライブ`, which despite the similar name covers real
 * standalone lives that happened to sit inside a larger event (Aqours World LoveLive!
 * in LA, for one).
 */
const EXCLUDED_TOUR_TYPE = '外部のフェス';

const matchesFilters = (
  performance: Performance,
  filters: LiveSortFilters,
  attendedIds: Set<string>
) => {
  if (performance.tourType === EXCLUDED_TOUR_TYPE) return false;
  // A live you have not seen yet cannot be ranked, and imported attendance covers
  // tickets for future shows, so those would otherwise land in the default pool.
  // Filtered per-performance, so a tour in progress keeps only the legs already played.
  if (isFutureEvent(performance)) return false;
  if (filters.attendedOnly && !attendedIds.has(performance.id)) return false;
  if (
    filters.seriesIds.length > 0 &&
    !performance.seriesIds.some((id) => filters.seriesIds.includes(id))
  )
    return false;
  if (filters.categories.length > 0 && !filters.categories.includes(performance.category))
    return false;
  const year = Number(performance.date.slice(0, 4));
  if (filters.yearFrom !== undefined && year < filters.yearFrom) return false;
  if (filters.yearTo !== undefined && year > filters.yearTo) return false;
  if (filters.search.trim()) {
    const needle = filters.search.trim().toLowerCase();
    const haystack = [performance.tourName, performance.performanceName, performance.venue]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
};

export const useLiveSortData = (filters: LiveSortFilters, unit: SortUnit) => {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const performances = usePerformances();
  const allPerformances = useAllPerformances();
  const allSetlists = useAllSetlists();
  const { map: attendanceMap } = useAttendance();

  const attendedIds = useMemo(
    () =>
      new Set(
        Object.values(attendanceMap)
          .filter((record) => record && !record.deleted && record.status === 'attended')
          .map((record) => record.performanceId)
      ),
    [attendanceMap]
  );

  const candidates = useMemo(
    () =>
      buildSortCandidates(
        performances.filter((performance) => matchesFilters(performance, filters, attendedIds)),
        unit
      ),
    [performances, filters, attendedIds, unit]
  );

  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id, candidate])),
    [candidates]
  );

  const candidateIds = useMemo(() => candidates.map((candidate) => candidate.id), [candidates]);

  // "Performed before" is a property of the live, not of the viewer, so it counts every
  // performance — including the TV and online ones that `inPersonOnly` hides.
  const songOrdinals = useMemo(
    () => buildSongPerformanceOrdinals(allPerformances, allSetlists),
    [allPerformances, allSetlists]
  );

  const prefix = LIVE_SORT_PREFIX[unit];
  const sorter = useSorter<string>(candidateIds, prefix);
  const timer = useSortTimer(prefix);

  const { state, isEnded, left, right, tie, undo, init, clear } = sorter;
  const { startTimer, clearTimer, recordTick, removeLastTick, markEnded } = timer;

  const currentPair = useMemo(() => {
    if (!state || isEnded) return undefined;
    const current = getCurrentItem(state);
    const leftId = current?.left?.[0];
    const rightId = current?.right?.[0];
    if (!leftId || !rightId) return undefined;
    const leftCandidate = candidateById.get(leftId);
    const rightCandidate = candidateById.get(rightId);
    if (!leftCandidate || !rightCandidate) return undefined;
    return { left: leftCandidate, right: rightCandidate };
  }, [state, isEnded, candidateById]);

  const pickLeft = useCallback(() => {
    recordTick();
    left();
  }, [recordTick, left]);

  const pickRight = useCallback(() => {
    recordTick();
    right();
  }, [recordTick, right]);

  const pickTie = useCallback(() => {
    recordTick();
    tie();
    toast({ title: t('sort.tie_toast'), duration: 1500 });
  }, [recordTick, tie, toast, t]);

  const pickUndo = useCallback(() => {
    removeLastTick();
    undo();
  }, [removeLastTick, undo]);

  const start = useCallback(() => {
    startTimer();
    init();
  }, [startTimer, init]);

  const reset = useCallback(() => {
    clearTimer();
    clear();
  }, [clearTimer, clear]);

  useEffect(() => {
    if (isEnded) markEnded();
  }, [isEnded, markEnded]);

  useEffect(() => {
    if (!currentPair) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Don't hijack arrows while a dialog (e.g. the song detail modal) is focused,
      // or while the user is typing in the filter bar.
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [role="dialog"]')) return;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          pickLeft();
          break;
        case 'ArrowRight':
          event.preventDefault();
          pickRight();
          break;
        case 'ArrowDown':
          event.preventDefault();
          pickTie();
          break;
        case 'ArrowUp':
          event.preventDefault();
          pickUndo();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPair, pickLeft, pickRight, pickTie, pickUndo]);

  /** Rank buckets, tie sentinels removed, resolved back to candidates. */
  const ranking = useMemo((): SortCandidate[][] => {
    if (!state || !isEnded) return [];
    return state.arr
      .filter((bucket) => bucket.length > 0)
      .map((bucket) =>
        bucket
          .map((id) => candidateById.get(id))
          .filter((candidate): candidate is SortCandidate => candidate !== undefined)
      )
      .filter((bucket) => bucket.length > 0);
  }, [state, isEnded, candidateById]);

  return {
    ...sorter,
    candidates,
    candidateById,
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
  };
};
