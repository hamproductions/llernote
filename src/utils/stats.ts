import type { AttendanceRecord } from '~/types/attendance';
import type { Performance, Setlist } from '~/types';

export interface StatsSummary {
  attendedCount: number;
  interestedCount: number;
  songsWitnessed: number;
  uniqueSongs: number;
  venuesVisited: number;
  firstEvent?: Performance;
  latestEvent?: Performance;
  byYear: { year: string; count: number }[];
  bySeries: { seriesId: string; count: number }[];
  byVenue: { venue: string; count: number }[];
  byWatchType: { watchType: string; count: number }[];
}

export const computeStats = (
  records: AttendanceRecord[],
  performanceById: Map<string, Performance>,
  setlists: Record<string, Setlist>
): StatsSummary => {
  const attended = records
    .filter((r) => r.status === 'attended')
    .map((r) => ({ record: r, performance: performanceById.get(r.performanceId) }))
    .filter((x): x is { record: AttendanceRecord; performance: Performance } => !!x.performance)
    .sort((a, b) => a.performance.date.localeCompare(b.performance.date));

  const interestedCount = records.filter((r) => r.status === 'interested').length;

  const byYear = new Map<string, number>();
  const bySeries = new Map<string, number>();
  const byVenue = new Map<string, number>();
  const byWatchType = new Map<string, number>();
  const songIds: string[] = [];

  for (const { record, performance } of attended) {
    const year = performance.date.slice(0, 4);
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
    for (const seriesId of performance.seriesIds) {
      bySeries.set(seriesId, (bySeries.get(seriesId) ?? 0) + 1);
    }
    if (performance.venue) {
      byVenue.set(performance.venue, (byVenue.get(performance.venue) ?? 0) + 1);
    }
    const watchType = record.watchType ?? 'live';
    byWatchType.set(watchType, (byWatchType.get(watchType) ?? 0) + 1);

    const setlist = setlists[performance.id];
    if (setlist) {
      for (const item of setlist.items) {
        if (item.type === 'song' && item.songId) songIds.push(item.songId);
      }
    }
  }

  return {
    attendedCount: attended.length,
    interestedCount,
    songsWitnessed: songIds.length,
    uniqueSongs: new Set(songIds).size,
    venuesVisited: byVenue.size,
    firstEvent: attended[0]?.performance,
    latestEvent: attended[attended.length - 1]?.performance,
    byYear: [...byYear.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year)),
    bySeries: [...bySeries.entries()]
      .map(([seriesId, count]) => ({ seriesId, count }))
      .sort((a, b) => b.count - a.count),
    byVenue: [...byVenue.entries()]
      .map(([venue, count]) => ({ venue, count }))
      .sort((a, b) => b.count - a.count),
    byWatchType: [...byWatchType.entries()]
      .map(([watchType, count]) => ({ watchType, count }))
      .sort((a, b) => b.count - a.count)
  };
};
