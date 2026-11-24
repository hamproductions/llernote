import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const CommandPalette = lazy(() => import('./CommandPalette'));

type Api = { open: (query?: string) => void };
const Ctx = createContext<Api>({ open() {} });
export const useCommandPalette = () => useContext(Ctx);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const api = useMemo<Api>(
    () => ({
      open: (query = '') => {
        setQuery(query);
        setMounted(true);
        setOpen(true);
      }
    }),
    []
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        api.open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {mounted && (
        <Suspense fallback={null}>
          <CommandPalette open={open} initialQuery={query} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </Ctx.Provider>
  );
}
