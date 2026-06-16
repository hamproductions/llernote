import { isGroupArtist, songArtistIds } from './mypick-options';
import performanceCostumes from '../../data/performance-costumes.json';
import type { Artist, Performance, Setlist, Song } from '~/types';
import type {
  BuiltinAward,
  LiveCostume,
  MyPickLiveState,
  PerformanceCostumes
} from '~/types/mypick-live';

/**
 * Built-in award categories shown on every live board. `best_costume` resolves
 * to a costume when LLFans costume data exists for the live, otherwise it falls
 * back to picking the song whose costume you loved.
 */
export const BUILTIN_AWARDS: BuiltinAward[] = [
  { key: 'best_song', kind: 'song' },
  { key: 'most_surprised', kind: 'song' },
  { key: 'cried_most', kind: 'song' },
  { key: 'best_costume', kind: 'costume' },
  { key: 'best_performance', kind: 'song' }
];

export type ArtistKind = 'group' | 'unit' | 'solo';

const realCharacterCount = (artist: Pick<Artist, 'characters'> | undefined) =>
  (artist?.characters ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0)
    .length;

/**
 * Classify a performing artist for a board row: group if it's a full-cast group,
 * solo if it credits a single character, otherwise a unit. Mirrors the
 * classification used across the grid MyPick (`~/utils/mypick-options`).
 */
export function getArtistKind(artist: Artist): ArtistKind {
  if (isGroupArtist(artist)) return 'group';
  if (realCharacterCount(artist) <= 1) return 'solo';
  return 'unit';
}

export interface LiveSongEntry {
  song: Song;
  /** Setlist position label, e.g. M01 / EN02. */
  label: string;
}

/**
 * Ordered, de-duplicated songs performed in a live, resolved to Song objects.
 * Songs in an `encore` section get `EN01` labels, everything else `M01`. Setlist
 * items without a resolvable song (MCs, custom-named items) are dropped.
 */
export function getLiveSongEntries(
  setlist: Setlist | null | undefined,
  songById: Map<string, Song>
): LiveSongEntry[] {
  if (!setlist) return [];

  // Map each item index to whether it sits inside an encore section.
  const encoreIndexes = new Set<number>();
  for (const section of setlist.sections ?? []) {
    if (section.type !== 'encore') continue;
    for (let index = section.startIndex; index <= section.endIndex; index += 1) {
      encoreIndexes.add(index);
    }
  }

  const seen = new Set<string>();
  const entries: LiveSongEntry[] = [];
  let mainCount = 0;
  let encoreCount = 0;

  setlist.items.forEach((item, index) => {
    if (item.type !== 'song' || !item.songId) return;
    const isEncore = encoreIndexes.has(index);
    if (isEncore) encoreCount += 1;
    else mainCount += 1;
    if (seen.has(item.songId)) return;
    const song = songById.get(item.songId);
    if (!song) return;
    seen.add(item.songId);
    const number = isEncore ? encoreCount : mainCount;
    const label = `${isEncore ? 'EN' : 'M'}${String(number).padStart(2, '0')}`;
    entries.push({ song, label });
  });

  return entries;
}

/**
 * Merged, de-duplicated songs across several performances of the same live
 * (e.g. day 1 + day 2). Performances are processed in the given order; a song's
 * first occurrence wins its label.
 */
export function getLiveSongEntriesForPerformances(
  performanceIds: string[],
  setlists: Record<string, Setlist>,
  songById: Map<string, Song>
): LiveSongEntry[] {
  const seen = new Set<string>();
  const entries: LiveSongEntry[] = [];
  for (const id of performanceIds) {
    for (const entry of getLiveSongEntries(setlists[id], songById)) {
      if (seen.has(entry.song.id)) continue;
      seen.add(entry.song.id);
      entries.push(entry);
    }
  }
  return entries;
}

export interface UnitGroup {
  artist: Artist;
  kind: ArtistKind;
  entries: LiveSongEntry[];
}

/**
 * Groups the live's songs by every performing artist/unit. A song that credits
 * multiple artists appears under each. Units are ordered groups → units → solos,
 * then by song count desc, then by name so the board reads top-down.
 */
export function buildUnitGroups(
  entries: LiveSongEntry[],
  artistById: Map<string, Artist>
): UnitGroup[] {
  const grouped = new Map<string, LiveSongEntry[]>();

  for (const entry of entries) {
    for (const id of songArtistIds(entry.song, artistById)) {
      const list = grouped.get(id) ?? [];
      list.push(entry);
      grouped.set(id, list);
    }
  }

  const kindRank: Record<ArtistKind, number> = { group: 0, unit: 1, solo: 2 };

  return [...grouped.entries()]
    .map(([id, groupEntries]) => {
      const artist = artistById.get(id)!;
      return { artist, kind: getArtistKind(artist), entries: groupEntries };
    })
    .sort((a, b) => {
      if (kindRank[a.kind] !== kindRank[b.kind]) return kindRank[a.kind] - kindRank[b.kind];
      if (a.entries.length !== b.entries.length) return b.entries.length - a.entries.length;
      return a.artist.name.localeCompare(b.artist.name);
    });
}

/** Costumes worn during a live, from `data/performance-costumes.json` (LLFans). */
export function getLiveCostumes(performanceId: string | undefined): LiveCostume[] {
  if (!performanceId) return [];
  const data = performanceCostumes as PerformanceCostumes;
  return data[performanceId] ?? [];
}

/** Merged, de-duplicated costumes across several performances of the same live. */
export function getLiveCostumesForPerformances(performanceIds: string[]): LiveCostume[] {
  const seen = new Set<string>();
  const costumes: LiveCostume[] = [];
  for (const id of performanceIds) {
    for (const costume of getLiveCostumes(id)) {
      if (seen.has(costume.id)) continue;
      seen.add(costume.id);
      costumes.push(costume);
    }
  }
  return costumes;
}

export function createEmptyLiveState(performanceIds: string[]): MyPickLiveState {
  return { performanceIds, awards: {}, unitPicks: {}, customAwards: [] };
}

/** Read performance ids from stored state, migrating the legacy single-id shape. */
export function statePerformanceIds(
  state: { performanceIds?: string[]; performanceId?: string } | null | undefined
): string[] {
  if (!state) return [];
  if (Array.isArray(state.performanceIds)) return state.performanceIds;
  return state.performanceId ? [state.performanceId] : [];
}

export interface LiveHeader {
  name: string;
  dateLabel: string;
  venue?: string;
}

/**
 * Board title/subtitle for the selected performances. A single performance shows
 * its own name + date + venue; multiple show the shared tour/event name and a
 * date range (and the shared venue when they all match).
 */
export function liveHeader(performances: Performance[]): LiveHeader {
  if (performances.length === 0) return { name: '', dateLabel: '' };
  const sorted = [...performances].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]!;
  if (sorted.length === 1) {
    return {
      name: first.performanceName?.trim() || first.concertName?.trim() || first.tourName,
      dateLabel: first.date,
      venue: first.venue || undefined
    };
  }
  const last = sorted[sorted.length - 1]!;
  const sameTour = sorted.every((p) => p.tourName === first.tourName);
  const sameVenue = sorted.every((p) => p.venue === first.venue);
  return {
    name: sameTour ? first.tourName : `${first.tourName}…`,
    dateLabel: first.date === last.date ? first.date : `${first.date} – ${last.date}`,
    venue: sameVenue ? first.venue || undefined : undefined
  };
}
