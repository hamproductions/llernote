import { createContext, lazy, Suspense, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const DetailStackHost = lazy(() => import('./DetailStackHost'));

type Kind = 'song' | 'event' | 'venue';
type Item = { kind: Kind; id: string };
type DetailApi = {
  openSong: (id: string) => void;
  openEvent: (id: string) => void;
  openVenue: (id: string) => void;
};

const Ctx = createContext<DetailApi | null>(null);
const NOOP: DetailApi = { openSong() {}, openEvent() {}, openVenue() {} };
export const useDetail = () => useContext(Ctx) ?? NOOP;

const MAX_DEPTH = 30;

export function DetailStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Item[]>([]);
  const api = useMemo<DetailApi>(() => {
    const push = (it: Item) =>
      setStack((s) => {
        const top = s[s.length - 1];
        if (top && top.kind === it.kind && top.id === it.id) return s;
        return s.length >= MAX_DEPTH ? s : [...s, it];
      });
    return {
      openSong: (id) => push({ kind: 'song', id }),
      openEvent: (id) => push({ kind: 'event', id }),
      openVenue: (id) => push({ kind: 'venue', id })
    };
  }, []);
  const back = () => setStack((s) => s.slice(0, -1));
  const close = () => setStack([]);
  const replaceEvent = (id: string) => setStack((s) => [...s.slice(0, -1), { kind: 'event', id }]);
  const top = stack[stack.length - 1];
  const onBack = stack.length > 1 ? back : undefined;

  return (
    <Ctx.Provider value={api}>
      {children}
      {top && (
        <Suspense fallback={null}>
          <DetailStackHost
            item={top}
            onBack={onBack}
            onClose={close}
            openSong={api.openSong}
            openEvent={api.openEvent}
            replaceEvent={replaceEvent}
          />
        </Suspense>
      )}
    </Ctx.Provider>
  );
}
