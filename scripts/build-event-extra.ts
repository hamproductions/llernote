import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const RAW_PATH = join(here, '../../the-sorter/data/raw/llfans-performances.json');
const OUT_PATH = join(here, '../data/event-extra.json');

interface RawEntry {
  performance: {
    id: string;
    name?: string | null;
    canceled: boolean;
    audience: boolean;
    openTime?: string | null;
    startTime?: string | null;
    note?: string | null;
  };
  concert?: { name?: string | null } | null;
  tour?: { tourType?: { name?: string | null } | null } | null;
}

const raw: RawEntry[] = JSON.parse(readFileSync(RAW_PATH, 'utf-8'));

const trimTime = (time?: string | null) => (time ? time.slice(0, 5) : undefined);

const extra = Object.fromEntries(
  raw.map((entry) => [
    entry.performance.id,
    {
      performanceName: entry.performance.name ?? undefined,
      concertName: entry.concert?.name ?? undefined,
      openTime: trimTime(entry.performance.openTime),
      startTime: trimTime(entry.performance.startTime),
      tourType: entry.tour?.tourType?.name ?? undefined,
      audience: entry.performance.audience,
      canceled: entry.performance.canceled || undefined,
      note: entry.performance.note ?? undefined
    }
  ])
);

writeFileSync(OUT_PATH, JSON.stringify(extra));
console.log(`Wrote ${Object.keys(extra).length} entries to ${OUT_PATH}`);
