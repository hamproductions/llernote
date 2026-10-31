import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist, VenueInfo } from '~/types';
import { hasUsableVenueInfo, venueKey } from './venues';
import { isWitnessed } from './attendance/witness';

export interface StatsSummary {
  attendedCount: number;
  witnessedCount: number;
  watchedCount: number;
  interestedCount: number;
  songsWitnessed: number;
  uniqueSongs: number;
  venuesVisited: number;
  firstEvent?: Performance;
  latestEvent?: Performance;
  attendanceEligibleCount: number;
  attendanceRate: number;
  attendanceBySeries: { seriesId: string; total: number; attended: number; rate: number }[];
  byYear: { year: string; count: number }[];
  bySeries: { seriesId: string; count: number }[];
  byVenue: { venue: string; venueId?: string; count: number }[];
  byCity: { city: string; count: number }[];
  byWatchType: { watchType: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byMonth: Map<string, number>;
  byMonthEvents: {
    month: string;
    total: number;
    attended: number;
    going: number;
    attendanceRate: number;
  }[];
}

export const computeStats = (
  records: AttendanceRecord[],
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>,
  performances: Performance[] = [...performanceById.values()],
  venueById: Map<string, VenueInfo> = new Map()
): StatsSummary => {
  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();
  const activeRecords = records.filter((r) => !r.deleted);
  const recordByPerformanceId = new Map(activeRecords.map((r) => [r.performanceId, r]));
  const attended = records
    .filter((r) => r.status === 'attended' && !r.deleted)
    .map((r) => ({ record: r, performance: performanceById.get(r.performanceId) }))
    .filter((x): x is { record: AttendanceRecord; performance: Performance } => !!x.performance)
    .sort((a, b) => a.performance.date.localeCompare(b.performance.date));

  const interestedCount = activeRecords.filter(
    (r) => r.status === 'interested' && (performanceById.get(r.performanceId)?.date ?? '') > today
  ).length;

  const byYear = new Map<string, number>();
  const bySeries = new Map<string, number>();
  const byVenue = new Map<string, { venue: string; venueId?: string; count: number }>();
  const byCity = new Map<string, number>();
  const byWatchType = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byMonth = new Map<string, number>();
  const attendanceBySeries = new Map<
    string,
    { seriesId: string; total: number; attended: number }
  >();
  const byMonthEvents = new Map<
    string,
    { month: string; total: number; attended: number; going: number }
  >();
  const songIds: string[] = [];
  let witnessedCount = 0;

  for (const performance of performances) {
    const month = performance.date.slice(0, 7);
    const entry = byMonthEvents.get(month) ?? { month, total: 0, attended: 0, going: 0 };
    const record = recordByPerformanceId.get(performance.id);
    entry.total += 1;
    if (record?.status === 'attended') entry.attended += 1;
    if (record?.status === 'interested' && performance.date > today) entry.going += 1;
    byMonthEvents.set(month, entry);
    if (performance.date <= today) {
      for (const seriesId of performance.seriesIds) {
        const seriesEntry = attendanceBySeries.get(seriesId) ?? { seriesId, total: 0, attended: 0 };
        seriesEntry.total += 1;
        if (record?.status === 'attended') seriesEntry.attended += 1;
        attendanceBySeries.set(seriesId, seriesEntry);
      }
    }
  }

  const attendanceEligibleCount = performances.filter(
    (performance) => performance.date <= today
  ).length;

  for (const { record, performance } of attended) {
    const witnessed = isWitnessed(record, performance);
    if (witnessed) witnessedCount += 1;
    const year = performance.date.slice(0, 4);
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
    for (const seriesId of performance.seriesIds) {
      bySeries.set(seriesId, (bySeries.get(seriesId) ?? 0) + 1);
    }
    if (witnessed && performance.venue) {
      const key = venueKey(performance);
      const venue = byVenue.get(key);
      byVenue.set(key, {
        venue: venue?.venue ?? performance.venue,
        venueId: performance.venueId,
        count: (venue?.count ?? 0) + 1
      });
      const venueInfo = performance.venueId ? venueById.get(performance.venueId) : undefined;
      const city = hasUsableVenueInfo(venueInfo)
        ? (venueInfo?.region ?? venueInfo?.locality)
        : undefined;
      if (city) byCity.set(city, (byCity.get(city) ?? 0) + 1);
    }
    if (performance.category === 'live') {
      const watchType = record.watchType ?? 'live';
      byWatchType.set(watchType, (byWatchType.get(watchType) ?? 0) + 1);
    }
    byCategory.set(performance.category, (byCategory.get(performance.category) ?? 0) + 1);
    const month = performance.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);

    const setlist = witnessed ? setlists[performance.id] : undefined;
    if (setlist) {
      for (const item of setlist.items) {
        if (item.type === 'song' && item.songId) songIds.push(item.songId);
      }
    }
  }

  return {
    attendedCount: attended.length,
    witnessedCount,
    watchedCount: attended.length - witnessedCount,
    interestedCount,
    songsWitnessed: songIds.length,
    uniqueSongs: new Set(songIds).size,
    venuesVisited: byVenue.size,
    firstEvent: attended[0]?.performance,
    latestEvent: attended[attended.length - 1]?.performance,
    attendanceEligibleCount,
    attendanceRate:
      attendanceEligibleCount > 0
        ? Math.round((attended.length / attendanceEligibleCount) * 100)
        : 0,
    attendanceBySeries: [...attendanceBySeries.values()]
      .map((entry) => ({
        ...entry,
        rate: entry.total > 0 ? Math.round((entry.attended / entry.total) * 100) : 0
      }))
      .sort((a, b) => b.rate - a.rate || b.attended - a.attended || b.total - a.total),
    byYear: [...byYear.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year)),
    bySeries: [...bySeries.entries()]
      .map(([seriesId, count]) => ({ seriesId, count }))
      .sort((a, b) => b.count - a.count),
    byVenue: [...byVenue.values()].sort(
      (a, b) => b.count - a.count || a.venue.localeCompare(b.venue)
    ),
    byCity: [...byCity.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
    byWatchType: [...byWatchType.entries()]
      .map(([watchType, count]) => ({ watchType, count }))
      .sort((a, b) => b.count - a.count),
    byCategory: [...byCategory.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    byMonth,
    byMonthEvents: [...byMonthEvents.values()]
      .map((entry) => ({
        ...entry,
        attendanceRate: entry.total > 0 ? Math.round((entry.attended / entry.total) * 100) : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  };
};
