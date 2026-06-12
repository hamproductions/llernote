import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const performancesPath = join(here, '../data/performance-info.json');
const eventExtraPath = join(here, '../data/event-extra.json');
const cacheRoot = join(here, '../data/enrichment-cache/live-thumbs');
const outputPath = join(here, '../data/live-thumb-info.json');
const wikiApi = 'https://love-live.fandom.com/api.php';
const rootCategory = 'Category:Live Concerts';
const thumbWidth = 400;
const userAgent = 'LLerNote live thumb enrichment (https://github.com/hamproductions/LLerNote)';

export interface WikiThumbPage {
  pageid: number;
  title: string;
  imageUrl?: string;
}

export interface TitleMatch {
  title: string;
  confidence: number;
  method: 'exact' | 'contain' | 'similar';
}

export interface LiveThumbEntry {
  scope: 'performance' | 'tour';
  image: string;
  source: string;
  confidence: number;
}

interface RawPerformance {
  id: string;
  tourName: string;
  concertName?: string;
}

interface CategoryMembersResponse {
  continue?: { cmcontinue?: string };
  query?: { categorymembers?: { pageid: number; ns: number; title: string }[] };
}

interface PageImagesResponse {
  query?: {
    pages?: Record<
      string,
      {
        pageid: number;
        title: string;
        thumbnail?: { source: string };
        original?: { source: string };
      }
    >;
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeTitle(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[μµ]/g, 'muse')
    .replace(/[^a-z0-9の]/g, '')
    .replace(/(?<=[a-z0-9])の(?=[a-z0-9])/g, 'no')
    .replace(/の/g, '');
}

const bigrams = (value: string) => {
  const grams = new Map<string, number>();
  for (let i = 0; i < value.length - 1; i++) {
    const gram = value.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
};

export function diceSimilarity(a: string, b: string) {
  if (a.length < 2 || b.length < 2) return 0;
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  let shared = 0;
  for (const [gram, count] of gramsA) {
    shared += Math.min(count, gramsB.get(gram) ?? 0);
  }
  return (2 * shared) / (a.length - 1 + b.length - 1);
}

const extractYears = (normalized: string) => new Set(normalized.match(/(?:19|20)\d{2}/g) ?? []);

const sameYears = (a: string, b: string) => {
  const yearsA = extractYears(a);
  const yearsB = extractYears(b);
  return yearsA.size === yearsB.size && [...yearsA].every((year) => yearsB.has(year));
};

export function matchWikiTitle(name: string, wikiTitles: string[]): TitleMatch | undefined {
  const normalized = normalizeTitle(name);
  if (normalized.length < 8) return undefined;

  const candidates: TitleMatch[] = [];
  for (const title of wikiTitles) {
    const normalizedTitle = normalizeTitle(title);
    if (normalizedTitle.length < 8) continue;
    if (normalizedTitle === normalized) {
      candidates.push({ title, confidence: 0.95, method: 'exact' });
      continue;
    }
    if (!sameYears(normalized, normalizedTitle)) continue;
    const shorter = Math.min(normalized.length, normalizedTitle.length);
    if (shorter >= 12 && (normalized.includes(normalizedTitle) || normalizedTitle.includes(normalized))) {
      candidates.push({ title, confidence: 0.88, method: 'contain' });
      continue;
    }
    const similarity = diceSimilarity(normalized, normalizedTitle);
    if (similarity >= 0.85) {
      candidates.push({ title, confidence: Math.round(similarity * 1000) / 1000, method: 'similar' });
    }
  }

  const sorted = candidates.sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];
  if (!best) return undefined;
  const second = sorted[1];
  if (best.method !== 'exact' && second && second.title !== best.title && best.confidence - second.confidence < 0.05) {
    return undefined;
  }
  return best;
}

export function buildThumbEntries(performances: RawPerformance[], pages: WikiThumbPage[]) {
  const pagesByTitle = new Map(pages.map((page) => [page.title, page]));
  const titles = pages.filter((page) => page.imageUrl).map((page) => page.title);
  const entries: Record<string, LiveThumbEntry> = {};
  const tourMatches = new Map<string, TitleMatch | undefined>();
  const stats = { tours: 0, tourMatched: 0, performanceMatched: 0, skipped: [] as string[] };

  for (const performance of performances) {
    if (!tourMatches.has(performance.tourName)) {
      stats.tours += 1;
      const match = matchWikiTitle(performance.tourName, titles);
      tourMatches.set(performance.tourName, match);
      if (match) {
        stats.tourMatched += 1;
        entries[`tour:${performance.tourName}`] = {
          scope: 'tour',
          image: pagesByTitle.get(match.title)!.imageUrl!,
          source: match.title,
          confidence: match.confidence
        };
      } else if (normalizeTitle(performance.tourName).length >= 8) {
        stats.skipped.push(performance.tourName);
      }
    }

    const concertName = performance.concertName;
    if (!concertName) continue;
    const tourMatch = tourMatches.get(performance.tourName);
    const match = matchWikiTitle(concertName, titles);
    if (!match || match.title === tourMatch?.title) continue;
    stats.performanceMatched += 1;
    entries[performance.id] = {
      scope: 'performance',
      image: pagesByTitle.get(match.title)!.imageUrl!,
      source: match.title,
      confidence: match.confidence
    };
  }

  return { entries, stats };
}

function cachePath(source: string, key: string) {
  const hash = createHash('sha1').update(key).digest('hex');
  return join(cacheRoot, source, `${hash}.json`);
}

async function cachedJson<T>(
  source: string,
  key: string,
  force: boolean,
  fetcher: () => Promise<T>
) {
  const path = cachePath(source, key);
  if (!force && existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8')) as T;

  mkdirSync(dirname(path), { recursive: true });
  const data = await fetcher();
  writeFileSync(path, JSON.stringify(data, null, 2));
  await sleep(350);
  return data;
}

async function fetchWikiJson<T>(source: string, params: Record<string, string>, force: boolean) {
  const search = new URLSearchParams({ ...params, format: 'json' });
  return cachedJson<T>(source, search.toString(), force, async () => {
    const res = await fetch(`${wikiApi}?${search}`, { headers: { 'user-agent': userAgent } });
    if (!res.ok) throw new Error(`Wiki ${res.status} for ${search}`);
    return res.json() as Promise<T>;
  });
}

async function fetchCategoryTitles(category: string, force: boolean) {
  const titles: string[] = [];
  const pending = [category];
  const seenCategories = new Set(pending);

  while (pending.length > 0) {
    const current = pending.shift()!;
    let cmcontinue: string | undefined;
    do {
      const params: Record<string, string> = {
        action: 'query',
        list: 'categorymembers',
        cmtitle: current,
        cmtype: 'page|subcat',
        cmlimit: '500'
      };
      if (cmcontinue) params.cmcontinue = cmcontinue;
      const data = await fetchWikiJson<CategoryMembersResponse>('category', params, force);
      for (const member of data.query?.categorymembers ?? []) {
        if (member.ns === 0) titles.push(member.title);
        if (member.ns === 14 && !seenCategories.has(member.title)) {
          seenCategories.add(member.title);
          pending.push(member.title);
        }
      }
      cmcontinue = data.continue?.cmcontinue;
    } while (cmcontinue);
  }

  return [...new Set(titles)];
}

async function fetchPageImages(titles: string[], force: boolean) {
  const pages: WikiThumbPage[] = [];
  for (let i = 0; i < titles.length; i += 50) {
    const data = await fetchWikiJson<PageImagesResponse>(
      'pageimages',
      {
        action: 'query',
        titles: titles.slice(i, i + 50).join('|'),
        prop: 'pageimages',
        piprop: 'thumbnail|original',
        pithumbsize: String(thumbWidth),
        redirects: '1'
      },
      force
    );
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.pageid > 0) {
        pages.push({
          pageid: page.pageid,
          title: page.title,
          imageUrl: page.thumbnail?.source ?? page.original?.source
        });
      }
    }
  }
  return pages;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  const raw = JSON.parse(readFileSync(performancesPath, 'utf-8')) as RawPerformance[];
  const extra = JSON.parse(readFileSync(eventExtraPath, 'utf-8')) as Record<
    string,
    Partial<RawPerformance>
  >;
  const performances = raw.map((p) => ({ ...p, ...extra[p.id] })).slice(0, limit);

  const titles = await fetchCategoryTitles(rootCategory, force);
  console.log(`Wiki pages: ${titles.length}`);
  const pages = await fetchPageImages(titles, force);
  console.log(`Pages with image: ${pages.filter((page) => page.imageUrl).length}`);

  const { entries, stats } = buildThumbEntries(performances, pages);
  writeFileSync(outputPath, JSON.stringify(entries, null, 2));

  const coveredPerformances = performances.filter(
    (p) => entries[p.id] || entries[`tour:${p.tourName}`]
  ).length;
  console.log(`Tours: ${stats.tours}`);
  console.log(`Tour-level matches: ${stats.tourMatched}`);
  console.log(`Performance-level matches: ${stats.performanceMatched}`);
  console.log(`Performances covered: ${coveredPerformances}/${performances.length}`);
  console.log(`Skipped (no high-confidence match): ${stats.skipped.length}`);
  console.log(`Wrote ${Object.keys(entries).length} entries to ${outputPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
