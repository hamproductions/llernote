import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { matchPerformanceToEvents, type EventernoteEvent } from '../src/utils/eventernote';
import type { Performance } from '../src/types';

const here = dirname(fileURLToPath(import.meta.url));
const performancePath = join(here, '../data/performance-info.json');
const extraPath = join(here, '../data/event-extra.json');
const cacheRoot = join(here, '../data/enrichment-cache/eventernote');
const outputPath = join(here, '../data/eventernote-map.json');
const apiBase = process.env.EVENTERNOTE_API_URL ?? 'http://localhost:3002';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cachePath = (query: string) =>
  join(cacheRoot, `${createHash('sha1').update(query).digest('hex')}.json`);

const searchCached = async (query: string): Promise<EventernoteEvent[]> => {
  const file = cachePath(query);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  for (;;) {
    const response = await fetch(
      `${apiBase}/api/events/search?q=${encodeURIComponent(query)}&limit=100`
    );
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') ?? '10');
      console.log(`⏳ rate limited, waiting ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }
    const body = (await response.json()) as {
      success: boolean;
      data?: { events: EventernoteEvent[] };
      error?: { message: string };
    };
    if (!body.success || !body.data) throw new Error(body.error?.message ?? 'search failed');
    writeFileSync(file, JSON.stringify(body.data.events));
    await sleep(1100);
    return body.data.events;
  }
};

const queriesFor = (performance: Performance) => {
  const queries = [performance.tourName];
  const cut = performance.tourName.split(/[～〜「]/)[0]?.trim();
  if (cut && cut.length >= 8 && cut !== performance.tourName) queries.push(cut);
  return queries;
};

const resolve = (performance: Performance, events: EventernoteEvent[]): string | undefined => {
  const ranked = matchPerformanceToEvents(performance, events).filter(
    (result) => result.sameDate && result.score >= 0.45
  );
  if (ranked.length === 0) return undefined;
  if (ranked.length > 1 && ranked[0]!.score - ranked[1]!.score < 0.05) return undefined;
  return /\/events\/(\d+)/.exec(ranked[0]!.event.href)?.[1];
};

mkdirSync(cacheRoot, { recursive: true });

const extraById = JSON.parse(readFileSync(extraPath, 'utf8')) as Record<
  string,
  Partial<Performance>
>;
const performances = (
  JSON.parse(readFileSync(performancePath, 'utf8')) as Omit<Performance, 'category'>[]
).map((p) => ({ ...p, ...extraById[p.id], category: 'live' as const }));

const existing: Record<string, string> = existsSync(outputPath)
  ? JSON.parse(readFileSync(outputPath, 'utf8'))
  : {};

const map: Record<string, string> = { ...existing };
const unresolved: string[] = [];
let processed = 0;

for (const performance of performances) {
  processed++;
  if (map[performance.id]) continue;
  let entry: string | undefined;
  for (const query of queriesFor(performance)) {
    const events = await searchCached(query);
    entry = resolve(performance, events);
    if (entry) break;
  }
  if (entry) {
    map[performance.id] = entry;
  } else {
    unresolved.push(performance.id);
  }
  if (processed % 25 === 0) {
    writeFileSync(outputPath, JSON.stringify(map, null, 2));
    console.log(
      `📝 ${processed}/${performances.length} processed, ${Object.keys(map).length} mapped`
    );
  }
}

const performanceById = new Map(performances.map((p) => [p.id, p]));
const usedEventIds = new Set(Object.values(map));
const groups = new Map<string, Performance[]>();
for (const id of unresolved) {
  const performance = performanceById.get(id)!;
  const key = `${performance.date}|${performance.tourName}`;
  const list = groups.get(key);
  if (list) list.push(performance);
  else groups.set(key, [performance]);
}

const stillUnresolved: string[] = [];
for (const group of groups.values()) {
  const events = new Map<string, EventernoteEvent>();
  for (const query of queriesFor(group[0]!)) {
    for (const event of await searchCached(query)) {
      const id = /\/events\/(\d+)/.exec(event.href)?.[1];
      if (id && !usedEventIds.has(id)) events.set(id, event);
    }
  }
  const pairs = group
    .flatMap((performance) =>
      matchPerformanceToEvents(performance, [...events.values()])
        .filter((result) => result.sameDate && result.score >= 0.45)
        .map((result) => ({
          performance,
          eventId: /\/events\/(\d+)/.exec(result.event.href)![1]!,
          score: result.score
        }))
    )
    .sort((a, b) => b.score - a.score);
  const assignedPerformances = new Set<string>();
  for (const pair of pairs) {
    if (assignedPerformances.has(pair.performance.id) || usedEventIds.has(pair.eventId)) continue;
    map[pair.performance.id] = pair.eventId;
    assignedPerformances.add(pair.performance.id);
    usedEventIds.add(pair.eventId);
  }
  for (const performance of group) {
    if (!assignedPerformances.has(performance.id)) stillUnresolved.push(performance.id);
  }
}

writeFileSync(outputPath, JSON.stringify(map, null, 2));
console.log(`✅ mapped ${Object.keys(map).length}/${performances.length}`);
console.log(`❓ unresolved: ${stillUnresolved.length}`);
if (stillUnresolved.length > 0) console.log(stillUnresolved.join(','));
