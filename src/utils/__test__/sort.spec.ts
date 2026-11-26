import { describe, expect, it } from 'vitest';
import shuffle from 'lodash-es/shuffle';
import {
  getCurrentItem,
  initSort,
  step,
  calculateMaxComparisons,
  collectItems,
  estimateComparisonsMade,
  removeItems,
  type SortState
} from '../sort';

const createNumberArray = (n = 10) =>
  Array(n)
    .fill(undefined)
    .map((_, i) => i);

describe('Sorting', () => {
  describe('initSort function', () => {
    it('create sorting state', () => {
      const state = initSort(createNumberArray());
      expect(state).toEqual({
        arr: [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]],
        currentSize: 1,
        leftStart: 0,
        mergeState: {
          arrIdx: 0,
          end: 1,
          leftArr: [[0]],
          leftArrIdx: 0,
          mid: 0,
          rightArr: [[1]],
          rightArrIdx: 0,
          start: 0
        }
      });
    });
  });

  describe('Sort Function', () => {
    describe('Sorts the array', () => {
      it('In original order', () => {
        let state = initSort(createNumberArray());
        while (state.status !== 'end') {
          state = step('left', state);
        }
        expect(state.arr).toEqual([[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]]);
      });

      it('Reversed array', () => {
        let state = initSort(createNumberArray().toReversed());
        while (state.status !== 'end') {
          state = step('right', state);
        }
        expect(state.arr).toEqual([[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]]);
      });

      it('Random Array', () => {
        // Init Random Array
        let state = initSort(shuffle(createNumberArray()));

        // Loop until sort ends
        while (state.status !== 'end') {
          const { left, right } = getCurrentItem(state) ?? {};
          if (!left || !right) throw new Error('Invalid State');
          const direction = left[0] === right[0] ? 'tie' : left[0] < right[0] ? 'left' : 'right';
          // Update new sort state
          state = step(direction, state);
        }

        expect(state.arr).toEqual([[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]]);
      });

      it('All tied', () => {
        // Init Random Array
        let state = initSort(createNumberArray());

        // Loop until sort ends
        while (state.status !== 'end') {
          state = step('tie', state);
        }
        expect(state.arr.filter((s) => s.length > 0)).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]]);
      });

      it('With ties', () => {
        // Init Random Array
        let state = initSort(shuffle(createNumberArray(20).map((a) => Math.floor(a / 2))));

        // Loop until sort ends
        while (state.status !== 'end') {
          const { left, right } = getCurrentItem(state) ?? {};
          if (!left || !right) throw new Error('Invalid State');
          const direction = left[0] === right[0] ? 'tie' : left[0] < right[0] ? 'left' : 'right';

          // Update new sort state
          state = step(direction, state);
        }

        expect(state.arr.filter((s) => s.length > 0)).toEqual([
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 4],
          [5, 5],
          [6, 6],
          [7, 7],
          [8, 8],
          [9, 9]
        ]);
      });

      it("Doesn't show empty array in intermediate state", () => {
        const sort = () => {
          // Init Random Array
          let state = initSort(shuffle(createNumberArray(100).map((a) => Math.floor(a / 2))));

          // Loop until sort ends
          while (state.status !== 'end') {
            const { left, right } = getCurrentItem(state) ?? {};
            if (!left || !right) throw new Error('Invalid State');
            if (left.length === 0 || right.length === 0) throw new Error('Empty Array');
            const direction = left[0] === right[0] ? 'tie' : left[0] < right[0] ? 'left' : 'right';
            // Update new sort state
            state = step(direction, state);
          }
        };

        expect(sort).not.toThrow();
      });
    });
  });

  describe('calculateMaxComparisons', () => {
    it('returns 0 for n=0', () => {
      expect(calculateMaxComparisons(0)).toBe(0);
    });

    it('returns 0 for n=1', () => {
      expect(calculateMaxComparisons(1)).toBe(0);
    });

    it('returns correct max for n=2', () => {
      expect(calculateMaxComparisons(2)).toBe(1);
    });

    it('returns correct max for n=10', () => {
      expect(calculateMaxComparisons(10)).toBe(29);
    });
  });

  describe('estimateComparisonsMade', () => {
    it('returns 0 at initial state', () => {
      const state = initSort(createNumberArray());
      expect(estimateComparisonsMade(state)).toBe(0);
    });

    it('increases after each step', () => {
      let state = initSort(createNumberArray());
      const initial = estimateComparisonsMade(state);

      state = step('left', state);
      const afterOne = estimateComparisonsMade(state);

      state = step('right', state);
      const afterTwo = estimateComparisonsMade(state);

      expect(afterOne).toBeGreaterThan(initial);
      expect(afterTwo).toBeGreaterThan(afterOne);
    });

    it('increases monotonically throughout sorting', () => {
      let state = initSort(shuffle(createNumberArray()));
      let prevCount = estimateComparisonsMade(state);

      while (state.status !== 'end') {
        const { left, right } = getCurrentItem(state) ?? {};
        if (!left || !right) throw new Error('Invalid State');
        const direction = left[0] < right[0] ? 'left' : 'right';
        state = step(direction, state);

        const currentCount = estimateComparisonsMade(state);
        expect(currentCount).toBeGreaterThanOrEqual(prevCount);
        prevCount = currentCount;
      }
    });

    it('derives n from state.arr.length, not external parameter', () => {
      const state = initSort(createNumberArray(20));
      const stepped = step('left', step('left', step('left', state)));
      const estimate = estimateComparisonsMade(stepped);
      expect(estimate).toBeGreaterThan(0);
      const max = calculateMaxComparisons(stepped.arr.length);
      expect(estimate).toBeLessThanOrEqual(max);
    });

    it('never exceeds max comparisons for the same array size', () => {
      for (const size of [5, 10, 20, 50]) {
        let state = initSort(shuffle(createNumberArray(size)));
        const max = calculateMaxComparisons(size);

        while (state.status !== 'end') {
          const estimate = estimateComparisonsMade(state);
          expect(estimate).toBeLessThanOrEqual(max);
          expect(estimate).toBeGreaterThanOrEqual(0);

          const { left, right } = getCurrentItem(state) ?? {};
          if (!left || !right) break;
          state = step(left[0] < right[0] ? 'left' : 'right', state);
        }
      }
    });

    it('produces non-negative progress ratio throughout sorting', () => {
      let state = initSort(shuffle(createNumberArray(15)));
      const max = calculateMaxComparisons(state.arr.length);

      while (state.status !== 'end') {
        const progress = estimateComparisonsMade(state) / max;
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1.1);

        const { left, right } = getCurrentItem(state) ?? {};
        if (!left || !right) break;
        state = step(left[0] < right[0] ? 'left' : 'right', state);
      }
    });
  });
});

describe('removeItems', () => {
  /** Answer every comparison truthfully (smaller first) until the sort ends. */
  const finish = (state: SortState<number>, onPair?: (pair: number[]) => void) => {
    let guard = 0;
    while (state.status !== 'end' && guard++ < 1000) {
      const current = getCurrentItem(state);
      const left = current?.left?.[0];
      const right = current?.right?.[0];
      if (left === undefined || right === undefined) throw new Error('no pair to compare');
      onPair?.([left, right]);
      state = step(left < right ? 'left' : 'right', state);
    }
    return state;
  };
  const ranking = (state: SortState<number>) =>
    state.arr.filter((bucket) => bucket.length > 0).map((bucket) => bucket[0]);

  it('removes an item before any comparison and still sorts the rest', () => {
    const state = removeItems(initSort([3, 1, 2, 0]), (item) => item === 2);
    expect(ranking(finish(state))).toEqual([0, 1, 3]);
  });

  it('skips past a pending comparison whose side was emptied', () => {
    const state = initSort([5, 4]);
    const next = removeItems(state, (item) => item === 5);
    // Nothing left to compare 4 against, so the sort is over.
    expect(next.status).toBe('end');
    expect(ranking(next)).toEqual([4]);
  });

  it('never offers a removed item again, wherever in the merge it is removed', () => {
    for (let trial = 0; trial < 200; trial++) {
      const n = 2 + (trial % 15);
      let state = initSort(shuffle(createNumberArray(n)));
      const removed = new Set<number>();
      let guard = 0;
      while (state.status !== 'end' && guard++ < 1000) {
        const current = getCurrentItem(state);
        const left = current!.left![0]!;
        const right = current!.right![0]!;
        expect(removed.has(left) || removed.has(right)).toBe(false);
        if (Math.random() < 0.25) {
          const victim = Math.random() < 0.5 ? left : right;
          removed.add(victim);
          state = removeItems(state, (item) => item === victim);
        } else {
          state = step(left < right ? 'left' : 'right', state);
        }
      }
      const expected = createNumberArray(n).filter((item) => !removed.has(item));
      expect(ranking(state)).toEqual(expected);
    }
  });

  it('only shrinks a tied bucket rather than emptying it', () => {
    let state = initSort([0, 1, 2]);
    state = step('tie', state);
    const tiedBucket = state.arr.find((bucket) => bucket.length === 2)!;
    const victim = tiedBucket[0]!;
    state = finish(removeItems(state, (item) => item === victim));
    expect(collectItems(state)).toEqual(new Set([0, 1, 2].filter((item) => item !== victim)));
  });

  it('prunes a finished ranking without reordering it', () => {
    const done = finish(initSort([2, 0, 1, 3]));
    expect(ranking(removeItems(done, (item) => item === 1))).toEqual([0, 2, 3]);
  });

  it('does not mutate the state it was given', () => {
    const state = initSort([3, 1, 2, 0]);
    const snapshot = JSON.parse(JSON.stringify(state));
    removeItems(state, (item) => item === state.mergeState!.leftArr![0]![0]);
    expect(state).toEqual(snapshot);
  });
});
