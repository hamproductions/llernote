/**
 * Fetch per-live costume data from the LLFans GraphQL API and write it to
 * `data/performance-costumes.json`, consumed by the "MyPick for a Live" feature
 * (Best Costume award).
 *
 * Costumes are NOT part of `performance-setlists.json` — that build step drops
 * them. In LLFans they live on each setlist item as a `costumes` array
 * (`EventDetailPage_PerformanceDetail` query):
 *
 *   Performance.setlists[].costumes[] = { id, name, song { name } }
 *
 * We flatten those into `Record<performanceId, LiveCostume[]>`, de-duplicated by
 * costume id, tagging each costume with the song it was worn for when LLFans
 * provides one.
 *
 * Usage:
 *   bun run scripts/fetch-live-costumes.ts            # all performances w/ setlist
 *   bun run scripts/fetch-live-costumes.ts 264 380    # only these performance ids
 *
 * Requires network access to https://ll-fans.jp/graphql. The committed data file
 * is updated out-of-band (like the other `data/*.json` files), so this script is
 * the documented, runnable mechanism rather than part of CI.
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import performanceInfo from '../data/performance-info.json';
import type { LiveCostume, PerformanceCostumes } from '../src/types/mypick-live';

const LLFANS_GRAPHQL = 'https://ll-fans.jp/graphql';
const here = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(here, '../data/performance-costumes.json');
const REQUEST_DELAY_MS = 250;

// Minimal slice of the LLFans performance-detail query — just enough for costumes.
const PERFORMANCE_DETAIL_QUERY = /* GraphQL */ `
  query EventDetailPage_PerformanceDetail($id: ID!) {
    performance(id: $id) {
      id
      setlists {
        id
        content { __typename ... on Song { id name } }
        costumes {
          id
          name
          song { name }
          # image fields vary by LLFans schema version; add here if present
        }
      }
    }
  }
`;

interface LLFansCostume {
  id: string;
  name: string | null;
  song: { name: string } | null;
}
interface LLFansSetlistItem {
  id: string;
  content: { __typename: string; id?: string; name?: string } | null;
  costumes: LLFansCostume[] | null;
}
interface PerformanceDetailResponse {
  data?: { performance?: { id: string; setlists?: LLFansSetlistItem[] } | null };
  errors?: { message: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPerformanceCostumes(performanceId: string): Promise<LiveCostume[]> {
  const response = await fetch(LLFANS_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: 'EventDetailPage_PerformanceDetail',
      variables: { id: performanceId },
      query: PERFORMANCE_DETAIL_QUERY
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for performance ${performanceId}`);
  }

  const json = (await response.json()) as PerformanceDetailResponse;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  const setlists = json.data?.performance?.setlists ?? [];
  const byId = new Map<string, LiveCostume>();

  for (const item of setlists) {
    const songId = item.content?.__typename === 'Song' ? item.content.id : undefined;
    const songName = item.content?.name ?? undefined;
    for (const costume of item.costumes ?? []) {
      if (!costume.name && !costume.id) continue;
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

async function main() {
  const requested = process.argv.slice(2);
  const targets = (performanceInfo as { id: string; hasSetlist?: boolean }[])
    .filter((p) => (requested.length ? requested.includes(p.id) : p.hasSetlist === true))
    .map((p) => p.id);

  console.log(`Fetching costumes for ${targets.length} performances...`);
  const result: PerformanceCostumes = {};

  for (const [index, id] of targets.entries()) {
    try {
      const costumes = await fetchPerformanceCostumes(id);
      if (costumes.length > 0) result[id] = costumes;
      console.log(`[${index + 1}/${targets.length}] ${id}: ${costumes.length} costumes`);
    } catch (error) {
      console.warn(`[${index + 1}/${targets.length}] ${id}: ${(error as Error).message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(result).length} performances with costume data to ${OUTPUT}`);
}

void main();
