import setlistsUrl from '../../data/performance-setlists.json?url';
import { livePerformanceById, remotePerformanceById } from './core';
import type { Setlist } from '~/types';

export type SetlistData = {
  all: Record<string, Setlist>;
  live: Record<string, Setlist>;
  remote: Record<string, Setlist>;
};

let promise: Promise<SetlistData> | null = null;

export const loadSetlists = (): Promise<SetlistData> => {
  if (!promise) {
    promise = fetch(setlistsUrl)
      .then((r) => r.json() as Promise<Record<string, Setlist>>)
      .then((all) => ({
        all,
        live: Object.fromEntries(Object.entries(all).filter(([id]) => livePerformanceById.has(id))),
        remote: Object.fromEntries(
          Object.entries(all).filter(([id]) => remotePerformanceById.has(id))
        )
      }));
  }
  return promise;
};
