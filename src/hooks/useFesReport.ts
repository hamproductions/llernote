import { useMemo } from 'react';
import { useAllSetlists } from './useSetlists';
import { useSongById } from './useSongData';
import { usePerformances } from './useData';
import lineupJson from '../../data/performance-lineups.json';
import overrideJson from '../../data/show-overrides.json';
import { artistById } from '~/data/core';
import { characters } from '~/data/characters';
import {
  buildFesDay,
  type FesContext,
  type FesDay,
  type FesLineup,
  type FesOverrides
} from '~/utils/fes-report';
import { groupByTour, type TourGroup } from '~/utils/tour';

/** A tour counts as a festival-style event when 3+ franchises share it and at least one day has a setlist. */
export const FES_MIN_SERIES = 3;

const characterById = new Map(characters.map((c) => [c.id, c]));
export const fesCharacterById = characterById;

export interface FesEvent {
  key: string;
  tour: TourGroup;
  /** performances with a setlist, oldest first */
  days: { performanceId: string; date: string; label: string }[];
}

export const useFesEvents = (): FesEvent[] => {
  const performances = usePerformances();
  const setlists = useAllSetlists();
  return useMemo(
    () =>
      groupByTour(performances)
        .filter((t) => t.seriesIds.length >= FES_MIN_SERIES)
        .map((tour): FesEvent => {
          const withSetlist = tour.legs.filter(
            (p) => (setlists[p.id]?.items.filter((i) => i.type === 'song').length ?? 0) >= 10
          );
          return {
            key: `${tour.tourName}|${tour.startDate}`,
            tour,
            days: withSetlist.map((p) => ({
              performanceId: p.id,
              date: p.date,
              label: p.performanceName ?? p.date
            }))
          };
        })
        .filter((e) => e.days.length > 0),
    [performances, setlists]
  );
};

export const useFesDays = (event: FesEvent | undefined): FesDay[] | undefined => {
  const setlists = useAllSetlists();
  const songById = useSongById();
  const performances = usePerformances();
  return useMemo(() => {
    if (!event || songById.size === 0) return undefined;
    const ctx: FesContext = {
      songById,
      artistById,
      characterById,
      characters,
      lineups: lineupJson as Record<string, FesLineup>,
      overrides: overrideJson as FesOverrides
    };
    const byId = new Map(performances.map((p) => [p.id, p]));
    return event.days.flatMap((d, i) => {
      const performance = byId.get(d.performanceId);
      const setlist = setlists[d.performanceId];
      return performance && setlist ? [buildFesDay(performance, setlist, d.label, i, ctx)] : [];
    });
  }, [event, setlists, songById, performances]);
};
