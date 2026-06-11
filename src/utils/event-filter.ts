import type { EventCategory, Performance } from '~/types';
import type { AttendanceMap } from '~/utils/attendance/storage';

export interface EventFilters {
  search: string;
  seriesIds: string[];
  yearFrom?: string;
  yearTo?: string;
  characterIds: string[];
  categories: EventCategory[];
  attendance?: 'attended' | 'interested' | 'none';
}

export const EMPTY_FILTERS: EventFilters = {
  search: '',
  seriesIds: [],
  characterIds: [],
  categories: []
};

export const todayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const isFutureEvent = (performance: Performance) => performance.date > todayString();

export const foldKana = (text: string) =>
  text.toLowerCase().replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

export const filterEvents = (
  performances: Performance[],
  filters: EventFilters,
  attendanceMap: AttendanceMap,
  performanceCharacters?: Map<string, Set<string>>
): Performance[] => {
  const search = foldKana(filters.search.trim());

  return performances.filter((p) => {
    if (
      search &&
      !foldKana(
        `${p.tourName} ${p.venue} ${p.concertName ?? ''} ${p.performanceName ?? ''} ${p.tourType ?? ''}`
      ).includes(search)
    ) {
      return false;
    }
    if (filters.seriesIds.length > 0 && !p.seriesIds.some((id) => filters.seriesIds.includes(id))) {
      return false;
    }
    const year = p.date.slice(0, 4);
    if (filters.yearFrom && year < filters.yearFrom) return false;
    if (filters.yearTo && year > filters.yearTo) return false;
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
