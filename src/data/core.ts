import performanceInfo from '../../data/performance-info.json';
import eventExtra from '../../data/event-extra.json';
import songInfo from '../../data/song-info.json';
import characterInfo from '../../data/character-info.json';
import artistsInfo from '../../data/artists-info.json';
import seriesInfo from '../../data/series-info.json';
import unitsInfo from '../../data/units.json';
import venueInfo from '../../data/venue-info.json';
import eventernoteMap from '../../data/eventernote-map.json';
import liveThumbInfo from '../../data/live-thumb-info.json';
import type {
  Artist,
  Character,
  LiveThumb,
  Performance,
  Series,
  Song,
  Unit,
  VenueInfo
} from '~/types';

const extraById = eventExtra as Record<string, Partial<Performance>>;

const deriveCategory = (p: Partial<Performance>): Performance['category'] => {
  if (p.tourType === 'TV出演') return 'tv';
  if (p.tourType === 'バーチャルライブ' || p.tourType === '収録配信') return 'online';
  if (p.audience === false) return 'online';
  return 'live';
};

const tourTypeByName = new Map<string, string>();
for (const p of performanceInfo as Omit<Performance, 'category'>[]) {
  const extra = extraById[p.id];
  if (extra?.tourType && !tourTypeByName.has(p.tourName)) {
    tourTypeByName.set(p.tourName, extra.tourType);
  }
}

export const performances: Performance[] = (performanceInfo as Omit<Performance, 'category'>[]).map(
  (p) => {
    const merged = { ...p, ...extraById[p.id] };
    if (!merged.tourType && tourTypeByName.has(p.tourName)) {
      merged.tourType = tourTypeByName.get(p.tourName);
      if (merged.audience === undefined) merged.audience = true;
    }
    return { ...merged, category: deriveCategory(merged) };
  }
);
export const songs = songInfo as unknown as Song[];
export const characters = characterInfo as unknown as Character[];
export const artists = artistsInfo as unknown as Artist[];
export const series = seriesInfo as Series[];
export const units = unitsInfo as unknown as Unit[];
export const venues = venueInfo as VenueInfo[];

export const sortedPerformances = [...performances].sort((a, b) => b.date.localeCompare(a.date));
export const performanceById = new Map(performances.map((p) => [p.id, p]));
export const livePerformances = sortedPerformances.filter((p) => p.category === 'live');
export const livePerformanceById = new Map(livePerformances.map((p) => [p.id, p]));
export const songById = new Map(songs.map((s) => [s.id, s]));
export const songByName = new Map(songs.map((s) => [s.name, s]));
export const artistById = new Map(artists.map((a) => [a.id, a]));
export const seriesById = new Map(series.map((s) => [s.id, s]));
export const venueById = new Map(venues.map((v) => [v.id, v]));

const liveThumbs = Object.entries(liveThumbInfo as Record<string, LiveThumb>);
export const liveThumbByPerformanceId = new Map(
  liveThumbs.filter(([key]) => !key.startsWith('tour:'))
);
export const liveThumbByTourName = new Map(
  liveThumbs
    .filter(([key]) => key.startsWith('tour:'))
    .map(([key, thumb]) => [key.slice('tour:'.length), thumb])
);
export const eventernoteIdByPerformanceId = new Map(
  Object.entries(eventernoteMap as Record<string, string>)
);
export const performanceByEventernoteId = new Map(
  [...eventernoteIdByPerformanceId]
    .map(([performanceId, eventernoteId]) => [eventernoteId, performanceById.get(performanceId)])
    .filter((entry): entry is [string, Performance] => entry[1] !== undefined)
);
