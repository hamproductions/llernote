import type { Setlist, SetlistSection } from '~/types';

export type SetlistRun = {
  grow: number;
  color: string;
  songs: number;
  title: string;
  kind: string;
};
export type SetlistFlow = {
  runs: SetlistRun[];
  counts: { songs: number; mc: number; vtr: number; enc: number };
};

const C: Record<string, string> = {
  main: 'var(--colors-accent-default)',
  encore: 'var(--colors-accent-7)',
  mc: '#f59e0b',
  vtr: '#a855f7',
  other: 'var(--colors-fg-muted)'
};

export const buildSetlistFlow = (
  setlist: Setlist | undefined,
  sections: SetlistSection[]
): SetlistFlow => {
  if (!setlist) return { runs: [], counts: { songs: 0, mc: 0, vtr: 0, enc: 0 } };
  const items = setlist.items;
  const secType: string[] = Array.from({ length: items.length }, () => 'main');
  for (const s of sections)
    for (let i = s.startIndex; i <= s.endIndex && i < secType.length; i++) secType[i] = s.type;
  const runs: SetlistRun[] = [];
  let lastK = '';
  let mc = 0;
  let vtr = 0;
  let songs = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type === 'song') {
      songs++;
      const k = secType[i] === 'encore' ? 'encore' : 'main';
      const label = k === 'encore' ? 'Encore' : 'Main';
      if (k === lastK) {
        const last = runs[runs.length - 1];
        last.songs++;
        last.grow++;
        last.title = `${label}: ${last.songs}`;
      } else runs.push({ grow: 1, color: C[k], songs: 1, title: `${label}: 1`, kind: k });
      lastK = k;
    } else if (it.type === 'mc') {
      mc++;
      runs.push({ grow: 1.2, color: C.mc, songs: 0, title: 'MC', kind: 'mc' });
      lastK = 'mc';
    } else if (it.type === 'vtr') {
      vtr++;
      runs.push({ grow: 1.2, color: C.vtr, songs: 0, title: 'VTR', kind: 'vtr' });
      lastK = 'vtr';
    } else {
      runs.push({
        grow: 1,
        color: C.other,
        songs: 0,
        title: it.title ?? it.customSongName ?? '—',
        kind: 'other'
      });
      lastK = 'other';
    }
  }
  return {
    runs,
    counts: { songs, mc, vtr, enc: sections.filter((s) => s.type === 'encore').length }
  };
};

export const sectionsOf = (setlist: Setlist | undefined): SetlistSection[] =>
  setlist && setlist.sections.length > 0
    ? setlist.sections
    : setlist
      ? [{ name: '', startIndex: 0, endIndex: setlist.items.length - 1, type: 'main' }]
      : [];
