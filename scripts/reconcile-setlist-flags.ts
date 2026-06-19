import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const perfPath = join(dataDir, 'performance-info.json');
const setlistPath = join(dataDir, 'performance-setlists.json');

type Item = { type: string; songId?: string };
type Setlist = { items?: Item[] };
type Perf = { id: string; hasSetlist?: boolean };

const perfs = JSON.parse(readFileSync(perfPath, 'utf8')) as Perf[];
const setlists = JSON.parse(readFileSync(setlistPath, 'utf8')) as Record<string, Setlist>;

const hasSongs = (id: string) =>
  !!setlists[id]?.items?.some((item) => item.type === 'song' && !!item.songId);

let changed = 0;
for (const perf of perfs) {
  const real = hasSongs(perf.id);
  if (perf.hasSetlist !== real) {
    perf.hasSetlist = real;
    changed += 1;
  }
}

if (changed > 0) {
  writeFileSync(perfPath, JSON.stringify(perfs));
}
console.log(`reconcile-setlist-flags: ${changed} hasSetlist flag(s) corrected`);
