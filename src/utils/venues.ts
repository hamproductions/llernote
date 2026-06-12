import type { Performance, VenueInfo, VenueSummary } from '~/types';

export const venueKey = (performance: Pick<Performance, 'venue' | 'venueId'>) =>
  performance.venueId ?? performance.venue;

export const hasUsableVenueInfo = (venue?: Pick<VenueInfo, 'confidence' | 'reviewRequired'>) =>
  Boolean(venue && !venue.reviewRequired && (venue.confidence ?? 1) >= 0.85);

export const displayVenueLocation = (
  venue?: Pick<VenueInfo, 'locality' | 'region' | 'country' | 'confidence' | 'reviewRequired'>
) => {
  if (!venue) return undefined;
  if (!hasUsableVenueInfo(venue)) return undefined;
  return venue.region ?? venue.country;
};

export function buildVenueSummaries(
  performances: Performance[],
  venueById: Map<string, VenueInfo>,
  attendedIds: Set<string> = new Set()
): VenueSummary[] {
  const summaries = new Map<string, VenueSummary>();

  for (const performance of performances) {
    if (!performance.venue) continue;

    const id = venueKey(performance);
    const rawInfo = performance.venueId ? venueById.get(performance.venueId) : undefined;
    const info = hasUsableVenueInfo(rawInfo) ? rawInfo : undefined;
    const existing = summaries.get(id);

    if (!existing) {
      summaries.set(id, {
        id,
        name: rawInfo?.name ?? performance.venue,
        performanceCount: 1,
        attendedCount: attendedIds.has(performance.id) ? 1 : 0,
        firstDate: performance.date,
        lastDate: performance.date,
        seriesIds: [...performance.seriesIds],
        location: displayVenueLocation(info),
        address: info?.address,
        lat: info?.lat,
        lng: info?.lng,
        country: info?.country,
        region: info?.region,
        locality: info?.locality,
        website: info?.website,
        info: rawInfo
      });
      continue;
    }

    existing.performanceCount += 1;
    if (attendedIds.has(performance.id)) existing.attendedCount += 1;
    existing.firstDate =
      performance.date < existing.firstDate ? performance.date : existing.firstDate;
    existing.lastDate = performance.date > existing.lastDate ? performance.date : existing.lastDate;
    existing.seriesIds = [...new Set([...existing.seriesIds, ...performance.seriesIds])];
  }

  return [...summaries.values()].sort((a, b) => {
    if (b.attendedCount !== a.attendedCount) return b.attendedCount - a.attendedCount;
    if (b.performanceCount !== a.performanceCount) return b.performanceCount - a.performanceCount;
    return a.name.localeCompare(b.name);
  });
}
