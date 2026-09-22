import { groupByTour } from './tour';
import { comparePerformancesChronologically } from './setlist-insights';
import type { Performance, Setlist } from '~/types';

/**
 * What a single comparison is about.
 *
 * `live` compares whole tours (a tour spans several city legs and days);
 * `performance` compares the individual shows those tours are made of.
 */
export type SortUnit = 'live' | 'performance';

export interface SortCandidate {
  /** Stable across rebuilds — persisted in sort state and share URLs. */
  id: string;
  unit: SortUnit;
  title: string;
  subtitle?: string;
  /** One entry for `performance`; every leg, chronologically, for `live`. */
  performances: Performance[];
  seriesIds: string[];
  startDate: string;
  endDate: string;
}

export const LIVE_SORT_PREFIX: Record<SortUnit, string> = {
  live: 'lives',
  performance: 'live-perfs'
};

/**
 * A tour has no id of its own in the source data — `groupByTour` derives groups from
 * `tourName` plus a season-gap split — so key it by name and start date. Index-based ids
 * would silently re-point at a different live whenever the candidate set changes.
 */
export const liveCandidateId = (tourName: string, startDate: string) =>
  `live:${startDate}:${tourName}`;

export const performanceCandidateId = (performanceId: string) => `perf:${performanceId}`;

const legLabel = (performance: Performance) =>
  performance.performanceName || performance.concertName || performance.date;

export interface LegTabLabel {
  /** The leg's own name, e.g. "石川公演 (Day.1)". */
  primary: string;
  /** Venue, shown as a second line so repeated city legs stay distinguishable. */
  secondary?: string;
  /** Untruncated "name — venue" for the tab's tooltip. */
  full: string;
}

export const legTabLabel = (performance: Performance): LegTabLabel => {
  const primary = legLabel(performance);
  const secondary = performance.venue || undefined;
  return {
    primary,
    secondary,
    full: [primary, secondary].filter(Boolean).join(' — ')
  };
};

export const buildSortCandidates = (
  performances: Performance[],
  unit: SortUnit
): SortCandidate[] => {
  if (unit === 'performance') {
    return [...performances].sort(comparePerformancesChronologically).map((performance) => ({
      id: performanceCandidateId(performance.id),
      unit,
      title: performance.tourName,
      subtitle: legLabel(performance),
      performances: [performance],
      seriesIds: performance.seriesIds,
      startDate: performance.date,
      endDate: performance.date
    }));
  }

  return groupByTour(performances).map((tour) => ({
    id: liveCandidateId(tour.tourName, tour.startDate),
    unit,
    title: tour.tourName,
    subtitle: undefined,
    performances: [...tour.legs].sort(comparePerformancesChronologically),
    seriesIds: tour.seriesIds,
    startDate: tour.startDate,
    endDate: tour.endDate
  }));
};

/**
 * Songs to tile into a card's hero when the live has no poster of its own.
 *
 * Only 21% of tours have a scraped poster, but 96% play at least one song with album art
 * and 66% play four or more — so a mosaic of the setlist is the fallback that actually
 * covers the catalogue. Taken in setlist order, so the opener leads.
 */
export const heroSongIds = (
  candidate: SortCandidate,
  setlists: Record<string, Setlist>,
  hasArt: (songId: string) => boolean,
  max: number
): string[] => {
  const picked: string[] = [];
  const seen = new Set<string>();
  for (const performance of candidate.performances) {
    for (const item of setlists[performance.id]?.items ?? []) {
      if (item.type !== 'song' || !item.songId) continue;
      if (seen.has(item.songId) || !hasArt(item.songId)) continue;
      seen.add(item.songId);
      picked.push(item.songId);
      if (picked.length >= max) return picked;
    }
  }
  return picked;
};

/**
 * Tile count and column count for a hero mosaic, chosen so the grid always comes out
 * rectangular — 5 tiles across 3 columns would leave a ragged second row.
 */
export const mosaicLayout = (available: number): { count: number; columns: number } => {
  if (available >= 6) return { count: 6, columns: 3 };
  if (available >= 4) return { count: 4, columns: 2 };
  if (available >= 2) return { count: 2, columns: 2 };
  return { count: Math.min(available, 1), columns: 1 };
};

/** Distinct songs across every leg of a candidate. */
export const candidateSongIds = (
  candidate: SortCandidate,
  setlists: Record<string, Setlist>
): string[] => {
  const seen = new Set<string>();
  for (const performance of candidate.performances) {
    for (const item of setlists[performance.id]?.items ?? []) {
      if (item.type === 'song' && item.songId) seen.add(item.songId);
    }
  }
  return [...seen];
};
