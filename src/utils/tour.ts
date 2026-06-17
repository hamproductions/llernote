import type { Performance } from '~/types';

export interface TourGroup {
  tourName: string;
  seriesIds: string[];
  legs: Performance[];
  startDate: string;
  endDate: string;
}

const MAX_LEG_GAP_DAYS = 60;

const splitBySeasonGap = (sorted: Performance[]): Performance[][] => {
  const chunks: Performance[][] = [];
  for (const p of sorted) {
    const current = chunks[chunks.length - 1];
    const last = current?.[current.length - 1];
    if (
      last &&
      (new Date(p.date).getTime() - new Date(last.date).getTime()) / 86400000 <= MAX_LEG_GAP_DAYS
    ) {
      current.push(p);
    } else {
      chunks.push([p]);
    }
  }
  return chunks;
};

export const groupByTour = (performances: Performance[]): TourGroup[] => {
  const groups = new Map<string, Performance[]>();
  for (const p of performances) {
    groups.set(p.tourName, [...(groups.get(p.tourName) ?? []), p]);
  }
  return [...groups.values()]
    .flatMap((legs) => splitBySeasonGap([...legs].sort((a, b) => a.date.localeCompare(b.date))))
    .map((legs) => {
      const sorted = legs;
      return {
        tourName: sorted[0]!.tourName,
        seriesIds: [...new Set(sorted.flatMap((p) => p.seriesIds))],
        legs: sorted,
        startDate: sorted[0]!.date,
        endDate: sorted[sorted.length - 1]!.date
      };
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.endDate.localeCompare(a.endDate));
};
