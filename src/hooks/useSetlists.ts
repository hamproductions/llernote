import { useEffect, useState } from 'react';
import { useAppSettings } from './useAppSettings';
import { loadSetlists, type SetlistData } from '~/data/setlists';
import type { Setlist } from '~/types';

const EMPTY: Record<string, Setlist> = {};

export const useSetlists = () => {
  const { scope } = useAppSettings();
  const [data, setData] = useState<SetlistData>();
  useEffect(() => {
    let mounted = true;
    loadSetlists().then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, []);
  if (!data) return EMPTY;
  return scope === 'inperson' ? data.live : scope === 'remote' ? data.remote : data.all;
};

// Unscoped: always returns ALL setlists, ignoring the global scope. Detail modals
// must show the complete picture (and apply their own local scope toggle).
export const useAllSetlists = () => {
  const [data, setData] = useState<SetlistData>();
  useEffect(() => {
    let mounted = true;
    loadSetlists().then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, []);
  return data?.all ?? EMPTY;
};

export const useSetlist = (performanceId: string | undefined) => {
  const all = useSetlists();
  return performanceId !== undefined ? all[performanceId] : undefined;
};
