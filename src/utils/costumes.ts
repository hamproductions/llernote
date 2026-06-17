import performanceCostumes from '../../data/performance-costumes.json';
import costumeNamesEnJson from '../../data/costume-names-en.json';
import type { Performance, Song } from '~/types';

/** Hand-written English names for outfit-style costumes that aren't named after a song. */
const costumeNamesEn = costumeNamesEnJson as Record<string, string>;

/** A costume (outfit) worn during a live, from `data/performance-costumes.json` (LLFans). */
export interface LiveCostume {
  id: string;
  name: string;
  /** Song the costume was worn for, if LLFans tied it to one. */
  songId?: string;
  songName?: string;
  /** Optional image URL (LLFans / fbcdn). */
  image?: string;
}

/** Costumes keyed by performance id. */
export type PerformanceCostumes = Record<string, LiveCostume[]>;

/**
 * Aggregated view of a single costume (outfit) across every live it was worn in.
 * Costume data comes from `data/performance-costumes.json` (LLFans) and is keyed
 * per performance; this rolls it up per costume id for the catalog.
 */
export interface CostumeSummary {
  id: string;
  name: string;
  /** Representative song used for the thumbnail (the song the costume is named after). */
  imageSongId?: string;
  /** Distinct performances (live shows) the costume was worn in. */
  liveCount: number;
  /** Distinct tours/events the costume appeared in. */
  eventCount: number;
  /** Total times the costume was worn for a song (performance × song wearings). */
  songAppearances: number;
  /** Distinct songs the costume was worn for. */
  uniqueSongCount: number;
  /** Distinct attended performances the user witnessed the costume in. */
  attendedCount: number;
  firstDate: string;
  lastDate: string;
  /** Distinct calendar years the costume was worn in. */
  yearCount: number;
  /** Distinct venues the costume was worn at. */
  venueCount: number;
  seriesIds: string[];
  /** Unique song ids the costume was worn for, most-worn first. */
  songIds: string[];
  /** Per-song breakdown: how often the costume was worn for each song. */
  songs: CostumeSongStat[];
  /** Performances the costume was worn in, oldest first. */
  performanceIds: string[];
  /** The song the costume was worn for the most times (by raw count). */
  topSongId?: string;
  /**
   * The song most strongly tied to the costume by rate — worn for the highest
   * share of that song's own performances — so a frequently-performed song
   * doesn't win on volume alone. Only set when song performance totals are known.
   */
  topSongByRateId?: string;
}

export interface CostumeSongStat {
  songId: string;
  /** Times the costume was worn for this song. */
  worn: number;
  /** Total times the song was performed (distinct performances), if known. */
  total: number;
  /** worn / total, clamped to [0, 1]; 0 when the total is unknown. */
  rate: number;
}

/** Per-song reach across the whole dataset, used for the rate and signature floor. */
export interface SongPerformanceStat {
  /** Distinct performances (shows) the song was performed in. */
  performances: number;
  /** Distinct events the song was performed at. */
  events: number;
}

interface CostumeAccumulator {
  id: string;
  name: string;
  songCounts: Map<string, number>;
  songNames: Map<string, string>;
  performanceIds: Set<string>;
  attendedIds: Set<string>;
  tourNames: Set<string>;
  venues: Set<string>;
  years: Set<string>;
  seriesIds: Set<string>;
  songAppearances: number;
  firstDate: string;
  lastDate: string;
}

/** A song must have been performed at more than one event to be a signature song. */
const MIN_SIGNATURE_EVENTS = 2;

const sortByCountDesc = (counts: Map<string, number>) =>
  [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);

/**
 * Build the costume catalog. Only costume rows whose performance is present in
 * `performanceById` are counted, so the catalog respects the active visibility
 * filter (e.g. in-person only).
 */
export function buildCostumeSummaries(
  costumeMap: PerformanceCostumes,
  performanceById: Map<string, Performance>,
  attendedIds: Set<string> = new Set(),
  /** Per-song reach (performances + events) used for the rate and signature floor. */
  songStats?: Map<string, SongPerformanceStat>
): CostumeSummary[] {
  const accumulators = new Map<string, CostumeAccumulator>();

  for (const [performanceId, costumes] of Object.entries(costumeMap)) {
    const performance = performanceById.get(performanceId);
    if (!performance) continue;
    for (const costume of costumes) {
      let entry = accumulators.get(costume.id);
      if (!entry) {
        entry = {
          id: costume.id,
          name: costume.name,
          songCounts: new Map(),
          songNames: new Map(),
          performanceIds: new Set(),
          attendedIds: new Set(),
          tourNames: new Set(),
          venues: new Set(),
          years: new Set(),
          seriesIds: new Set(),
          songAppearances: 0,
          firstDate: performance.date,
          lastDate: performance.date
        };
        accumulators.set(costume.id, entry);
      }
      entry.songAppearances += 1;
      if (costume.songId) {
        entry.songCounts.set(costume.songId, (entry.songCounts.get(costume.songId) ?? 0) + 1);
        if (costume.songName) entry.songNames.set(costume.songId, costume.songName);
      }
      entry.performanceIds.add(performanceId);
      if (attendedIds.has(performanceId)) entry.attendedIds.add(performanceId);
      entry.tourNames.add(performance.tourName);
      if (performance.venue) entry.venues.add(performance.venue);
      entry.years.add(performance.date.slice(0, 4));
      for (const seriesId of performance.seriesIds) entry.seriesIds.add(seriesId);
      if (performance.date < entry.firstDate) entry.firstDate = performance.date;
      if (performance.date > entry.lastDate) entry.lastDate = performance.date;
    }
  }

  return [...accumulators.values()].map((entry) => {
    const songIdsByCount = sortByCountDesc(entry.songCounts);
    // The costume is named after a song; prefer that song for the thumbnail.
    const namesake = songIdsByCount.find((id) => entry.songNames.get(id) === entry.name);
    const performanceIds = [...entry.performanceIds].sort((a, b) => {
      const da = performanceById.get(a)?.date ?? '';
      const db = performanceById.get(b)?.date ?? '';
      return da.localeCompare(db) || a.localeCompare(b);
    });
    const songs: CostumeSongStat[] = songIdsByCount.map((id) => {
      const worn = entry.songCounts.get(id) ?? 0;
      const total = songStats?.get(id)?.performances ?? 0;
      return { songId: id, worn, total, rate: total > 0 ? Math.min(1, worn / total) : 0 };
    });
    // Strongest association by rate. Require the song to have been performed at more
    // than one event (MIN_SIGNATURE_EVENTS) so a song confined to a single event
    // doesn't win at 100% just for being worn there. Break ties by raw count.
    const topByRate = songStats
      ? [...songs]
          .filter((song) => (songStats.get(song.songId)?.events ?? 0) >= MIN_SIGNATURE_EVENTS)
          .sort((a, b) => b.rate - a.rate || b.worn - a.worn || a.songId.localeCompare(b.songId))[0]
      : undefined;
    return {
      id: entry.id,
      name: entry.name,
      imageSongId: namesake ?? songIdsByCount[0],
      liveCount: entry.performanceIds.size,
      eventCount: entry.tourNames.size,
      songAppearances: entry.songAppearances,
      uniqueSongCount: entry.songCounts.size,
      attendedCount: entry.attendedIds.size,
      firstDate: entry.firstDate,
      lastDate: entry.lastDate,
      yearCount: entry.years.size,
      venueCount: entry.venues.size,
      seriesIds: [...entry.seriesIds],
      songIds: songIdsByCount,
      songs,
      performanceIds,
      topSongId: songIdsByCount[0],
      topSongByRateId: topByRate?.songId
    };
  });
}

/** Build the catalog from the bundled costume dataset. */
export function getCostumeSummaries(
  performanceById: Map<string, Performance>,
  attendedIds: Set<string> = new Set(),
  songStats?: Map<string, SongPerformanceStat>
): CostumeSummary[] {
  return buildCostumeSummaries(
    performanceCostumes as PerformanceCostumes,
    performanceById,
    attendedIds,
    songStats
  );
}

/**
 * Localized costume name, resolved the same way as song titles. In English,
 * prefer a hand-written outfit translation, then — when the costume is named
 * after a song — that song's own `englishName` (looked up by name, so it always
 * matches the costume's literal name), falling back to the original name (which
 * is itself already English for Latin-script titles).
 */
export function costumeDisplayName(
  costume: Pick<CostumeSummary, 'name'>,
  language: string,
  songByName: Map<string, Song>
): string {
  if (!language.startsWith('en')) return costume.name;
  return costumeNamesEn[costume.name] ?? songByName.get(costume.name)?.englishName ?? costume.name;
}

/** English outfit-name override, if one exists (for search indexing). */
export const costumeNameOverrideEn = (name: string): string | undefined => costumeNamesEn[name];
