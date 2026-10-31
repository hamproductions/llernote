import { useEffect, useState } from 'react';
import { loadSongData, type SongData } from '~/data/songs';
import type { Song } from '~/types';

const EMPTY_SONGS: Song[] = [];
const EMPTY_MAP = new Map<string, Song>();

const useSongData = () => {
  const [data, setData] = useState<SongData>();
  useEffect(() => {
    let mounted = true;
    loadSongData().then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, []);
  return data;
};

export const useSongs = () => useSongData()?.songs ?? EMPTY_SONGS;
export const useSongById = () => useSongData()?.songById ?? EMPTY_MAP;
export const useSongByName = () => useSongData()?.songByName ?? EMPTY_MAP;
