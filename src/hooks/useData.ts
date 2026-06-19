import { useMemo } from 'react';
import { useAppSettings } from './useAppSettings';
import {
  artistById,
  artists,
  eventernoteIdByPerformanceId,
  liveThumbByPerformanceId,
  liveThumbByTourName,
  livePerformanceById,
  livePerformances,
  performanceByEventernoteId,
  performanceById,
  remotePerformanceById,
  remotePerformances,
  series,
  seriesById,
  sortedPerformances,
  units,
  venueById,
  venues
} from '~/data/core';
import type { Performance } from '~/types';

export const usePerformances = () => {
  const { scope } = useAppSettings();
  return scope === 'inperson'
    ? livePerformances
    : scope === 'remote'
      ? remotePerformances
      : sortedPerformances;
};
export const usePerformanceById = () => {
  const { scope } = useAppSettings();
  return scope === 'inperson'
    ? livePerformanceById
    : scope === 'remote'
      ? remotePerformanceById
      : performanceById;
};
export const usePerformance = (id: string | undefined) => {
  const byId = usePerformanceById();
  return id !== undefined ? byId.get(id) : undefined;
};
export const useArtists = () => artists;
export const useArtistById = () => artistById;
export const useSeries = () => series;
export const useSeriesById = () => seriesById;
export const useUnits = () => units;
export const getLiveThumb = (performance: Performance | undefined, tourOnly = false) =>
  performance
    ? ((tourOnly ? undefined : liveThumbByPerformanceId.get(performance.id)) ??
      liveThumbByTourName.get(performance.tourName))
    : undefined;
export const useLiveThumb = (performance: Performance | undefined, tourOnly = false) =>
  getLiveThumb(performance, tourOnly);
export const useVenues = () => venues;
export const useVenueById = () => venueById;
export const useEventernoteIdByPerformanceId = () => eventernoteIdByPerformanceId;
export const usePerformanceByEventernoteId = () => performanceByEventernoteId;

export const useEventYears = () => {
  const visible = usePerformances();
  return useMemo(() => {
    const years = new Set(visible.map((p) => p.date.slice(0, 4)));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [visible]);
};
