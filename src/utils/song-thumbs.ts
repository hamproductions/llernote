import thumbIds from '../../data/song-thumbs.json';

const THUMB_IDS = new Set(thumbIds as string[]);

export const hasSongThumb = (songId: string) => THUMB_IDS.has(songId);
