import type { Artist, Setlist, Song } from '~/types';

let cache: Map<string, Set<string>> | null = null;

export const buildPerformanceCharacterMap = (
  setlists: Record<string, Setlist>,
  songById: Map<string, Song>,
  artistById: Map<string, Artist>
): Map<string, Set<string>> => {
  if (cache) return cache;
  const map = new Map<string, Set<string>>();
  for (const [performanceId, setlist] of Object.entries(setlists)) {
    const characterIds = new Set<string>();
    for (const item of setlist.items) {
      if (item.type !== 'song' || !item.songId) continue;
      const song = songById.get(item.songId);
      for (const songArtist of song?.artists ?? []) {
        const artist = artistById.get(songArtist.id);
        for (const characterId of artist?.characters ?? []) {
          characterIds.add(characterId);
        }
      }
    }
    map.set(performanceId, characterIds);
  }
  cache = map;
  return map;
};
