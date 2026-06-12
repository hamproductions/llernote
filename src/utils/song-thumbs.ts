import thumbIds from '../../data/song-thumbs.json';
import thumbAliases from '../../data/song-thumb-aliases.json';

const THUMB_IDS = new Set(thumbIds as string[]);
const THUMB_ALIASES = thumbAliases as Record<string, string>;

export const getSongThumbId = (songId: string) => {
  if (THUMB_IDS.has(songId)) return songId;
  const alias = THUMB_ALIASES[songId];
  if (alias && THUMB_IDS.has(alias)) return alias;
  return undefined;
};

export const hasSongThumb = (songId: string) => getSongThumbId(songId) !== undefined;
