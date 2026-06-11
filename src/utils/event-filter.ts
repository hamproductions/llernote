import type { EventCategory, Performance } from '~/types';
import type { AttendanceMap } from '~/utils/attendance/storage';

export interface EventFilters {
  search: string;
  seriesIds: string[];
  years: string[];
  characterIds: string[];
  categories: EventCategory[];
  attendance?: 'attended' | 'interested' | 'none';
}

export const EMPTY_FILTERS: EventFilters = {
  search: '',
  seriesIds: [],
  years: [],
  characterIds: [],
  categories: []
};

export const todayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const isFutureEvent = (performance: Performance) => performance.date > todayString();

export const filterEvents = (
  performances: Performance[],
  filters: EventFilters,
  attendanceMap: AttendanceMap,
  performanceCharacters?: Map<string, Set<string>>
): Performance[] => {
  const search = filters.search.trim().toLowerCase();

  return performances.filter((p) => {
    if (search && !`${p.tourName} ${p.venue}`.toLowerCase().includes(search)) return false;
    if (filters.seriesIds.length > 0 && !p.seriesIds.some((id) => filters.seriesIds.includes(id))) {
      return false;
    }
    if (filters.years.length > 0 && !filters.years.includes(p.date.slice(0, 4))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(p.category)) return false;
    if (filters.attendance) {
      const record = attendanceMap[p.id];
      const status = record && !record.deleted ? record.status : undefined;
      if (filters.attendance === 'none' ? status !== undefined : status !== filters.attendance) {
        return false;
      }
    }
    if (filters.characterIds.length > 0) {
      const cast = performanceCharacters?.get(p.id);
      if (!cast || !filters.characterIds.some((id) => cast.has(id))) return false;
    }
    return true;
  });
};
