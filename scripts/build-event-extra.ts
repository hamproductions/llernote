import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const localRawPath = join(here, '../data/raw/llfans-performances.json');
const sorterRawPath = join(here, '../../the-sorter/data/raw/llfans-performances.json');
const RAW_PATH = existsSync(localRawPath) ? localRawPath : sorterRawPath;
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
  concert?: { name?: string | null; venue?: { id: string; name: string } | null } | null;
  tour?: { tourType?: { name?: string | null } | null } | null;
}

const INFO_PATH = join(here, '../data/performance-info.json');

const raw: RawEntry[] = JSON.parse(readFileSync(RAW_PATH, 'utf-8'));

// `data/raw/` is gitignored, so CI starts every run with an empty cache and the
// incremental LLFans fetch only writes back the handful of performances it re-fetched.
// Replacing the output wholesale would therefore shrink it to those few entries (it did:
// 744 -> 26 -> 21 across successive automated commits). Merge over what is already
// committed instead, so a full local regeneration survives the next CI run.
const existing: Record<string, Record<string, unknown>> = existsSync(OUT_PATH)
  ? JSON.parse(readFileSync(OUT_PATH, 'utf-8'))
  : {};

// `performanceName` has since migrated into performance-info.json, where it holds a
// richer composed label ("名古屋公演 (6/12＜1回目＞)") than the raw dump's bare
// "6/12＜1回目＞". useData merges extra *over* performance-info, so re-emitting the raw
// name here would regress those labels.
const infoPerformanceNames = new Map<string, string>(
  (JSON.parse(readFileSync(INFO_PATH, 'utf-8')) as { id: string; performanceName?: string }[])
    .filter((p) => Boolean(p.performanceName))
    .map((p) => [p.id, p.performanceName!])
);

const trimTime = (time?: string | null) => (time ? time.slice(0, 5) : undefined);

const derived = Object.fromEntries(
  raw.map((entry) => [
    entry.performance.id,
    {
      performanceName: infoPerformanceNames.has(entry.performance.id)
        ? undefined
        : (entry.performance.name ?? undefined),
      concertName: entry.concert?.name ?? undefined,
      venueId: entry.concert?.venue?.id ?? undefined,
      openTime: trimTime(entry.performance.openTime),
      startTime: trimTime(entry.performance.startTime),
      tourType: entry.tour?.tourType?.name ?? undefined,
      audience: entry.performance.audience,
      canceled: entry.performance.canceled || undefined,
      note: entry.performance.note ?? undefined
    }
  ])
);

const extra = { ...existing, ...derived };

writeFileSync(OUT_PATH, JSON.stringify(extra));
const noteCount = Object.values(extra).filter((e) => e.note).length;
console.log(
  `Wrote ${Object.keys(extra).length} entries (${Object.keys(derived).length} from raw, ` +
    `${noteCount} with notes) to ${OUT_PATH}`
);
