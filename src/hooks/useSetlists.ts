import { useEffect, useState } from 'react';
import { useAppSettings } from './useAppSettings';
import { loadSetlists, type SetlistData } from '~/data/setlists';
import type { Setlist } from '~/types';

const EMPTY: Record<string, Setlist> = {};

export const useSetlists = () => {
  const { inPersonOnly } = useAppSettings();
  const [data, setData] = useState<SetlistData>();
  useEffect(() => {
    let mounted = true;
    loadSetlists().then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, []);
  if (!data) return EMPTY;
  return inPersonOnly ? data.live : data.all;
};

export const useSetlist = (performanceId: string | undefined) => {
  const all = useSetlists();
  return performanceId !== undefined ? all[performanceId] : undefined;
};
