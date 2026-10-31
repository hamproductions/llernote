import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const DetailStackHost = lazy(() => import('./DetailStackHost'));

type Kind = 'song' | 'event' | 'venue' | 'costume';
type Item = { kind: Kind; id: string };
type DetailApi = {
  openSong: (id: string) => void;
  openEvent: (id: string) => void;
  openVenue: (id: string) => void;
  openCostume: (id: string) => void;
};

const Ctx = createContext<DetailApi | null>(null);
const NOOP: DetailApi = { openSong() {}, openEvent() {}, openVenue() {}, openCostume() {} };
export const useDetail = () => useContext(Ctx) ?? NOOP;

const MAX_DEPTH = 30;
const KINDS: Kind[] = ['song', 'event', 'venue', 'costume'];

const parseView = (search: string): Item | null => {
  const view = new URLSearchParams(search).get('view');
  if (!view) return null;
  const sep = view.indexOf('-');
  if (sep < 0) return null;
  const kind = view.slice(0, sep) as Kind;
  const id = view.slice(sep + 1);
  return KINDS.includes(kind) && id ? { kind, id } : null;
};

const syncUrl = (top: Item | undefined) => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (top) url.searchParams.set('view', `${top.kind}-${top.id}`);
  else url.searchParams.delete('view');
  window.history.replaceState(window.history.state, '', url);
};

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
      openVenue: (id) => push({ kind: 'venue', id }),
      openCostume: (id) => push({ kind: 'costume', id })
    };
  }, []);
  const back = () => setStack((s) => s.slice(0, -1));
  const close = () => setStack([]);
  const replaceEvent = (id: string) => setStack((s) => [...s.slice(0, -1), { kind: 'event', id }]);
  const top = stack[stack.length - 1];
  const onBack = stack.length > 1 ? back : undefined;

  useEffect(() => {
    const item = parseView(window.location.search);
    if (item) setStack([item]);
  }, []);

  useEffect(() => {
    syncUrl(top);
  }, [top]);

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
