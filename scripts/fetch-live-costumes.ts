/**
 * Build per-live costume data for the "MyPick for a Live" feature (Best Costume
 * award) and write it to `data/performance-costumes.json`.
 *
 * Like every other LLFans-derived data file in this repo (see
 * `scripts/build-event-extra.ts`), this reads the pre-fetched raw LLFans dump at
 * `data/raw/llfans-performances.json` rather than hitting the API live. Costumes
 * are NOT carried in `performance-setlists.json` — that build step drops them —
 * but they live on each setlist item in the raw dump:
 *
 *   entry.performance.setlists[].costumes[] = { id, name, song { name } }
 *
 * We flatten those into `Record<performanceId, LiveCostume[]>`, de-duplicated by
 * costume id, tagging each costume with the song it was worn for. Performance
 * ids in the dump are LLFans ids, which are also this repo's performance ids.
 *
 * Usage:
 *   bun run scripts/fetch-live-costumes.ts
 *
 * The raw dump is produced out-of-band (not committed), so run this whenever the
 * dump is refreshed, alongside the other `data/*.json` rebuild steps.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { LiveCostume, PerformanceCostumes } from '../src/types/mypick-live';

const here = dirname(fileURLToPath(import.meta.url));
const localRawPath = join(here, '../data/raw/llfans-performances.json');
const sorterRawPath = join(here, '../../the-sorter/data/raw/llfans-performances.json');
const RAW_PATH = existsSync(localRawPath) ? localRawPath : sorterRawPath;
const OUT_PATH = join(here, '../data/performance-costumes.json');

interface RawCostume {
  id: string;
  name: string | null;
  song: { name: string } | null;
}
interface RawSetlistItem {
  content: { __typename: string; id?: string; name?: string } | null;
  costumes?: RawCostume[] | null;
}
interface RawEntry {
  performance: {
    id: string;
    setlists?: RawSetlistItem[] | null;
  };
}

function costumesForPerformance(setlists: RawSetlistItem[]): LiveCostume[] {
  const byId = new Map<string, LiveCostume>();
  for (const item of setlists) {
    const songId = item.content?.__typename === 'Song' ? item.content.id : undefined;
    const songName = item.content?.name ?? undefined;
    for (const costume of item.costumes ?? []) {
      if (!costume.id && !costume.name) continue;
      if (byId.has(costume.id)) continue;
      byId.set(costume.id, {
        id: costume.id,
        name: costume.name ?? costume.song?.name ?? songName ?? 'Costume',
        songId,
        songName: costume.song?.name ?? songName
      });
    }
  }
  return [...byId.values()];
}

function main() {
  if (!existsSync(RAW_PATH)) {
    console.error(
      `Raw LLFans dump not found at ${localRawPath} (or sibling the-sorter copy).\n` +
        'Refresh the dump out-of-band first, like the other data/*.json rebuild steps.'
    );
    process.exit(1);
  }

  const raw: RawEntry[] = JSON.parse(readFileSync(RAW_PATH, 'utf-8'));
  const result: PerformanceCostumes = {};

  for (const entry of raw) {
    const costumes = costumesForPerformance(entry.performance.setlists ?? []);
    if (costumes.length > 0) result[entry.performance.id] = costumes;
  }

  writeFileSync(OUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(result).length} performances with costume data to ${OUT_PATH}`);
}

main();
