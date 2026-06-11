import type { Performance } from '~/types';

export interface TourGroup {
  tourName: string;
  seriesIds: string[];
  legs: Performance[];
  startDate: string;
  endDate: string;
}

export const groupByTour = (performances: Performance[]): TourGroup[] => {
  const groups = new Map<string, Performance[]>();
  for (const p of performances) {
    groups.set(p.tourName, [...(groups.get(p.tourName) ?? []), p]);
  }
  return [...groups.values()]
    .map((legs) => {
      const sorted = [...legs].sort((a, b) => a.date.localeCompare(b.date));
      return {
        tourName: sorted[0]!.tourName,
        seriesIds: [...new Set(sorted.flatMap((p) => p.seriesIds))],
        legs: sorted,
        startDate: sorted[0]!.date,
        endDate: sorted[sorted.length - 1]!.date
      };
    })
    .sort((a, b) => b.endDate.localeCompare(a.endDate));
};
