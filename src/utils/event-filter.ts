import type { Performance } from '~/types';
import type { AttendanceMap } from '~/utils/attendance/storage';

export interface EventFilters {
  search: string;
  seriesIds: string[];
  year?: string;
  attendance?: 'attended' | 'interested' | 'none';
  characterId?: string;
  category?: Performance['category'];
}

export const EMPTY_FILTERS: EventFilters = {
  search: '',
  seriesIds: []
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
    if (filters.year && !p.date.startsWith(filters.year)) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (filters.attendance) {
      const record = attendanceMap[p.id];
      const status = record && !record.deleted ? record.status : undefined;
      if (filters.attendance === 'none' ? status !== undefined : status !== filters.attendance) {
        return false;
      }
    }
    if (filters.characterId) {
      if (!performanceCharacters?.get(p.id)?.has(filters.characterId)) return false;
    }
    return true;
  });
};
