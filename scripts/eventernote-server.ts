/**
 * Local stand-in for the `eventernote-report` API that the EventerNote import UI
 * (`src/utils/eventernote.ts`) and `scripts/build-eventernote-map.ts` expect on
 * http://localhost:3002.
 *
 *   bun run dev:eventernote
 *
 * Endpoints (both return `{ success, data: { events } }` / `{ success: false, error }`):
 *   GET /api/events/user/:userId?limit=N
 *   GET /api/events/search?q=<keyword>&limit=N
 *   GET /health
 *
 * It scrapes eventernote.com's public HTML, which has no official API. Both the user
 * and search listings share the same `.gb_event_list li` markup, so one parser covers
 * both. Responses are cached on disk and upstream requests are serialised behind a
 * politeness delay — `build-eventernote-map.ts` issues hundreds of searches, and the
 * site is a small community service, not something to hammer.
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { EventernoteEvent } from '../src/utils/eventernote';

const here = dirname(fileURLToPath(import.meta.url));
const cacheRoot = join(here, '../data/enrichment-cache/eventernote-html');

const PORT = Number(process.env.PORT ?? 3002);
const ORIGIN = 'https://www.eventernote.com';
const USER_AGENT =
  process.env.EVENTERNOTE_USER_AGENT ??
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
/** Upstream page size; the site caps a listing page at this many rows. */
const PAGE_SIZE = 100;
const REQUEST_DELAY_MS = Number(process.env.EVENTERNOTE_DELAY_MS ?? 1200);
const CACHE_TTL_MS = Number(process.env.EVENTERNOTE_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);

// ---------------------------------------------------------------- html parsing

const decodeEntities = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');

const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, '')).trim();

/** Slice out each `<li class="clearfix ...">…</li>` row by tracking `<li>` nesting. */
const listItems = (html: string): string[] => {
  const start = html.indexOf('gb_event_list');
  if (start === -1) return [];
  const scope = html.slice(start);
  const items: string[] = [];
  // Past events carry `class="clearfix past"`, upcoming ones just `class="clearfix "`.
  // Matching only the latter would drop exactly the rows an import cares about.
  const opener = /<li class="clearfix[^"]*"[^>]*>/g;
  let match: RegExpExecArray | null;

  while ((match = opener.exec(scope)) !== null) {
    let depth = 1;
    const tag = /<\/?li\b[^>]*>/g;
    tag.lastIndex = match.index + match[0].length;
    let cursor: RegExpExecArray | null;
    while (depth > 0 && (cursor = tag.exec(scope)) !== null) {
      depth += cursor[0].startsWith('</') ? -1 : 1;
    }
    if (depth !== 0) continue;
    items.push(scope.slice(match.index, tag.lastIndex));
    opener.lastIndex = tag.lastIndex;
  }
  return items;
};

const parseEvent = (item: string): EventernoteEvent | undefined => {
  const link = /<h4>\s*<a href="(\/events\/\d+)"[^>]*>([\s\S]*?)<\/a>/.exec(item);
  if (!link) return undefined;

  const dateBlock = /<div class="date">([\s\S]*?)<\/div>/.exec(item)?.[1] ?? '';
  const placeBlock = /<div class="place">([\s\S]*?)<\/div>/.exec(item)?.[1] ?? '';
  const actorBlock = /<div class="actor">([\s\S]*?)<\/div>/.exec(item)?.[1] ?? '';

  return {
    name: stripTags(link[2]!),
    href: link[1]!,
    // e.g. "2027-05-09 (日)" — the client only regexes out the ISO date.
    date: stripTags(/<p class="day\d"[^>]*>([\s\S]*?)<\/p>/.exec(dateBlock)?.[1] ?? ''),
    place: stripTags(placeBlock).replace(/^会場:\s*/, ''),
    artists: [...actorBlock.matchAll(/<a href="\/actors\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g)]
      .map((m) => stripTags(m[1]!))
      .filter(Boolean)
  };
};

export const parseEventList = (html: string): EventernoteEvent[] =>
  listItems(html)
    .map(parseEvent)
    .filter((event): event is EventernoteEvent => event !== undefined);

/** Total result count from the "…一覧(145件)" heading, when the page states one. */
export const parseTotalCount = (html: string): number | undefined => {
  const match = /\((\d+)件\)/.exec(html);
  return match ? Number(match[1]) : undefined;
};

// ------------------------------------------------------------------- fetching

let chain: Promise<unknown> = Promise.resolve();
/** Serialise upstream calls and space them out, so concurrent clients stay polite. */
const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
  const run = chain.then(async () => {
    const result = await task();
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    return result;
  });
  chain = run.catch(() => undefined);
  return run;
};

const cacheFile = (url: string) =>
  join(cacheRoot, `${createHash('sha1').update(url).digest('hex')}.html`);

const fetchPage = async (url: string): Promise<string> => {
  const file = cacheFile(url);
  if (existsSync(file)) {
    const age = Date.now() - Number(readFileSync(`${file}.at`, 'utf8'));
    if (age < CACHE_TTL_MS) return readFileSync(file, 'utf8');
  }

  return enqueue(async () => {
    console.log(`  → GET ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ja,en;q=0.8' }
    });
    if (response.status === 404) throw Object.assign(new Error('Not found'), { status: 404 });
    if (!response.ok) {
      throw Object.assign(new Error(`Upstream returned HTTP ${response.status}`), {
        status: response.status === 429 ? 429 : 502
      });
    }
    const html = await response.text();
    mkdirSync(cacheRoot, { recursive: true });
    writeFileSync(file, html);
    writeFileSync(`${file}.at`, String(Date.now()));
    return html;
  });
};

/** Walk listing pages until `limit` events are collected or a page comes back short. */
const collect = async (baseUrl: string, limit: number): Promise<EventernoteEvent[]> => {
  const events: EventernoteEvent[] = [];
  const separator = baseUrl.includes('?') ? '&' : '?';

  for (let page = 1; events.length < limit; page++) {
    const html = await fetchPage(`${baseUrl}${separator}limit=${PAGE_SIZE}&page=${page}`);
    const pageEvents = parseEventList(html);
    events.push(...pageEvents);

    const total = parseTotalCount(html);
    if (pageEvents.length < PAGE_SIZE) break;
    if (total !== undefined && events.length >= total) break;
  }

  return events.slice(0, limit);
};

export const getUserEvents = (userId: string, limit: number) =>
  collect(`${ORIGIN}/users/${encodeURIComponent(userId)}/events`, limit);

export const searchEvents = (keyword: string, limit: number) =>
  collect(`${ORIGIN}/events/search?keyword=${encodeURIComponent(keyword)}`, limit);

// --------------------------------------------------------------------- server

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

interface Reply {
  status: number;
  body: unknown;
}

const fail = (code: string, message: string, status: number): Reply => ({
  status,
  body: { success: false, error: { code, message } }
});

export const route = async (url: URL): Promise<Reply> => {
  const limit = Math.min(Number(url.searchParams.get('limit')) || 1000, 2000);

  try {
    if (url.pathname === '/health')
      return { status: 200, body: { success: true, data: { ok: true } } };

    const user = /^\/api\/events\/user\/(.+)$/.exec(url.pathname);
    if (user) {
      const userId = decodeURIComponent(user[1]!);
      console.log(`[user] ${userId} (limit ${limit})`);
      const events = await getUserEvents(userId, limit);
      console.log(`[user] ${userId} → ${events.length} events`);
      return { status: 200, body: { success: true, data: { events } } };
    }

    if (url.pathname === '/api/events/search') {
      const keyword = url.searchParams.get('q')?.trim();
      if (!keyword) return fail('BAD_REQUEST', 'Missing required query parameter "q"', 400);
      console.log(`[search] ${keyword} (limit ${limit})`);
      const events = await searchEvents(keyword, limit);
      console.log(`[search] ${keyword} → ${events.length} events`);
      return { status: 200, body: { success: true, data: { events } } };
    }

    return fail('NOT_FOUND', `No route for ${url.pathname}`, 404);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 502;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ ${message}`);
    return fail(status === 404 ? 'NOT_FOUND' : 'UPSTREAM_ERROR', message, status);
  }
};

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const server = createServer((request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS).end();
      return;
    }
    const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
    void route(url).then(({ status, body }) => {
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        ...CORS
      });
      response.end(JSON.stringify(body));
    });
  });

  server.listen(PORT, () => {
    console.log(`eventernote-report stand-in listening on http://localhost:${PORT}`);
    console.log(`  GET /api/events/user/:userId`);
    console.log(`  GET /api/events/search?q=<keyword>`);
    console.log(`  cache: ${cacheRoot} (TTL ${Math.round(CACHE_TTL_MS / 3600000)}h)`);
  });
}
