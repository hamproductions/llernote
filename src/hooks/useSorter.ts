import shuffle from 'lodash-es/shuffle';
import { useEffect, useCallback, useRef } from 'react';
import cloneDeep from 'lodash-es/cloneDeep';
import type { SortState } from '../utils/sort';
import { step, initSort, calculateMaxComparisons, estimateComparisonsMade } from '../utils/sort';
import { useLocalStorage } from './useLocalStorage';

export const useSorter = <T>(items: T[], statePrefix?: string) => {
  const prefix = statePrefix ? statePrefix + '-' : '';
  const stateKey = `${prefix}sort-state`;
  const historyKey = `${prefix}sort-state-history`;
  const countKey = `${prefix}comparisons-count`;

  const [state, setState] = useLocalStorage<SortState<T>>(stateKey);
  const [history, setHistory] = useLocalStorage<SortState<T>[]>(historyKey, undefined);
  const [comparisonsCount, setComparisonsCount] = useLocalStorage<number | undefined>(
    countKey,
    undefined
  );

  // Discard sort state written by an older, incompatible shape (pre tie-bucket `I[][]`).
  // Only this sorter's own keys are removed — never `localStorage.clear()`, which would
  // also wipe attendance records, MyPick slots and app settings.
  useEffect(() => {
    if (
      (state && !state?.arr) ||
      (state?.arr[0] && !Array.isArray(state?.arr[0])) ||
      (history?.[0]?.arr[0] && !Array.isArray(history?.[0]?.arr[0]))
    ) {
      setState(undefined);
      setHistory(undefined);
      setComparisonsCount(undefined);
    }
  }, [state, history, setState, setHistory, setComparisonsCount]);

  const loadState = (stateData: { state: SortState<T>; history: SortState<T>[] }) => {
    const { state, history } = stateData;
    setState(state);
    setHistory(history);
  };

  const stateRef = useRef(state);
  const historyRef = useRef(history);
  const comparisonsCountRef = useRef(comparisonsCount);

  stateRef.current = state;
  historyRef.current = history;
  comparisonsCountRef.current = comparisonsCount;

  const handleStep = useCallback(
    (value: 'left' | 'right' | 'tie') => () => {
      const currentState = stateRef.current;
      if (currentState) {
        let newHistory = [...(historyRef.current ?? []), cloneDeep(currentState)];
        if (newHistory.length > 50) {
          newHistory = newHistory.slice(-50);
        }
        setHistory(newHistory);
        const currentCount = comparisonsCountRef.current ?? estimateComparisonsMade(currentState);
        setComparisonsCount(currentCount + 1);
        const nextStep = step(value, currentState);
        setState(nextStep);
      }
    },
    [setHistory, setState, setComparisonsCount]
  );

  const reset = useCallback(() => {
    setState(initSort(shuffle(items)));
    setHistory([]);
    setComparisonsCount(1);
  }, [items, setState, setHistory, setComparisonsCount]);

  const handleUndo = useCallback(() => {
    const currentHistory = historyRef.current;
    if (!currentHistory || currentHistory?.length === 0) return;
    const previousState = currentHistory.at(-1);
    if (previousState) {
      setState(previousState);
      setHistory(currentHistory.slice(0, -1));
      setComparisonsCount(Math.max(0, (comparisonsCountRef.current ?? 1) - 1));
    }
  }, [setState, setHistory, setComparisonsCount]);

  const sortedN = state?.arr.length ?? items.length;
  const maxComparisons = calculateMaxComparisons(sortedN);
  const estimatedProgress =
    state && maxComparisons > 0 ? estimateComparisonsMade(state) / maxComparisons : 0;

  const clear = () => {
    setHistory(undefined);
    setState(undefined);
    setComparisonsCount(undefined);
  };

  const progress = Math.max(0, Math.min(1, estimatedProgress));
  const isEnded = state?.status === 'end';

  const isEstimatedCount = comparisonsCount === undefined && state !== undefined;
  const actualComparisonsCount = comparisonsCount ?? (state ? estimateComparisonsMade(state) : 0);

  return {
    state,
    history,
    comparisonsCount: actualComparisonsCount,
    isEstimatedCount,
    maxComparisons,
    init: () => reset(),
    left: handleStep('left'),
    right: handleStep('right'),
    tie: handleStep('tie'),
    undo: () => handleUndo(),
    progress,
    isEnded,
    reset,
    loadState,
    clear
  };
};
