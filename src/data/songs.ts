import songsUrl from '../../data/song-info.json?url';
import type { Song } from '~/types';

export type SongData = {
  songs: Song[];
  songById: Map<string, Song>;
  songByName: Map<string, Song>;
};

let promise: Promise<SongData> | null = null;
export const loadSongData = (): Promise<SongData> => {
  if (!promise) {
    promise = fetch(songsUrl)
      .then((r) => r.json() as Promise<Song[]>)
      .then((songs) => ({
        songs,
        songById: new Map(songs.map((s) => [s.id, s])),
        songByName: new Map(songs.map((s) => [s.name, s]))
      }));
  }
  return promise;
};
