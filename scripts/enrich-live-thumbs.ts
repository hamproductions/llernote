import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const performancesPath = join(here, '../data/performance-info.json');
const eventExtraPath = join(here, '../data/event-extra.json');
const cacheRoot = join(here, '../data/enrichment-cache/live-thumbs');
const outputPath = join(here, '../data/live-thumb-info.json');
const aliasPath = join(here, '../data/live-thumb-aliases.json');
const posterDir = join(here, '../public/assets/lives');
const wikiApi = 'https://love-live.fandom.com/api.php';
const rootCategory = 'Category:Live Concerts';
const thumbWidth = 400;
const userAgent = 'LLerNote live thumb enrichment (https://github.com/hamproductions/LLerNote)';

export interface WikiThumbPage {
  pageid: number;
  title: string;
  imageUrl?: string;
  /** Japanese title from the page's `{{Nihongo}}` lead, when it has one. */
  japaneseTitle?: string;
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
  /** Basename of the local copy under public/assets/lives. */
  file?: string;
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

interface PageContentResponse {
  query?: {
    pages?: { title: string; revisions?: { slots?: { main?: { content?: string } } }[] }[];
  };
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

/**
 * Normalisation that keeps Japanese, unlike `normalizeTitle` which strips it to compare
 * against romanised wiki page names. A tour named mostly in Japanese collapses to a
 * useless stub under the latter — 蓮ノ空 3rd Live Tour becomes just "3rdlivetour".
 */
export function normalizeJapanese(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[～〜~]/g, '')
    .replace(/[\s\p{P}\p{S}]/gu, '');
}

/**
 * Pull the Japanese name out of a page's `{{Nihongo|English|日本語}}` lead.
 *
 * Pages use the same template for song titles further down, so the English argument has
 * to resemble the page title — otherwise "Aqours World LoveLive! ASIA TOUR 2019" picks up
 * 青空Jumping Heart from its tracklist.
 */
export function extractNihongoTitle(wikitext: string, pageTitle: string): string | undefined {
  const clean = (value: string) => value.replace(/'''|\[\[|\]\]/g, '').trim();
  const target = normalizeTitle(pageTitle);

  for (const match of wikitext.matchAll(/\{\{Nihongo\|([^|{}]*)\|([^|{}]*)/g)) {
    const english = clean(match[1] ?? '');
    const japanese = clean(match[2] ?? '');
    if (!japanese) continue;
    const normalizedEnglish = normalizeTitle(english);
    if (!normalizedEnglish || !target) continue;
    const similar =
      normalizedEnglish === target ||
      normalizedEnglish.includes(target) ||
      target.includes(normalizedEnglish) ||
      diceSimilarity(normalizedEnglish, target) >= 0.6;
    if (similar) return japanese;
  }
  return undefined;
}

/** Match a Japanese tour name against pages' Japanese titles. */
export function matchJapaneseTitle(
  name: string,
  pages: WikiThumbPage[],
  threshold = 0.85
): TitleMatch | undefined {
  const normalized = normalizeJapanese(name);
  if (normalized.length < 8) return undefined;

  let best: TitleMatch | undefined;
  let bestTitleLength = Infinity;
  for (const page of pages) {
    if (!page.japaneseTitle) continue;
    const candidate = normalizeJapanese(page.japaneseTitle);
    if (candidate.length < 8) continue;
    // An annual event differs from the next year's only by the year, and the bigrams are
    // otherwise near-identical — without this, 沼津地元愛まつり 2023 matches the 2024 page.
    if (!sameYears(normalized, candidate)) continue;

    let confidence = 0;
    let method: TitleMatch['method'] = 'similar';
    if (candidate === normalized) {
      confidence = 0.95;
      method = 'exact';
    } else if (
      Math.min(candidate.length, normalized.length) >= 10 &&
      (candidate.includes(normalized) || normalized.includes(candidate))
    ) {
      confidence = 0.9;
      method = 'contain';
    } else {
      confidence = diceSimilarity(normalized, candidate);
    }

    // On a tie prefer the shorter page title: a live and its release share a name, and
    // the release is the one carrying the extra words ("… Uta Gassen LIVE CD").
    const better =
      !best ||
      confidence > best.confidence ||
      (confidence === best.confidence && page.title.length < bestTitleLength);
    if (confidence >= threshold && better) {
      best = { title: page.title, confidence: Math.round(confidence * 1000) / 1000, method };
      bestTitleLength = page.title.length;
    }
  }
  return best;
}

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
    if (
      shorter >= 12 &&
      (normalized.includes(normalizedTitle) || normalizedTitle.includes(normalized))
    ) {
      candidates.push({ title, confidence: 0.88, method: 'contain' });
      continue;
    }
    const similarity = diceSimilarity(normalized, normalizedTitle);
    if (similarity >= 0.85) {
      candidates.push({
        title,
        confidence: Math.round(similarity * 1000) / 1000,
        method: 'similar'
      });
    }
  }

  const sorted = candidates.sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];
  if (!best) return undefined;
  const second = sorted[1];
  if (
    best.method !== 'exact' &&
    second &&
    second.title !== best.title &&
    best.confidence - second.confidence < 0.05
  ) {
    return undefined;
  }
  return best;
}

export function buildThumbEntries(
  performances: RawPerformance[],
  pages: WikiThumbPage[],
  aliases: Record<string, string> = {}
) {
  const pagesByTitle = new Map(pages.map((page) => [page.title, page]));
  const pagesWithImages = pages.filter((page) => page.imageUrl);
  const titles = pagesWithImages.map((page) => page.title);
  const entries: Record<string, LiveThumbEntry> = {};
  const tourMatches = new Map<string, TitleMatch | undefined>();
  const stats = { tours: 0, tourMatched: 0, performanceMatched: 0, skipped: [] as string[] };

  for (const performance of performances) {
    if (!tourMatches.has(performance.tourName)) {
      stats.tours += 1;
      const aliased = aliases[performance.tourName];
      const match: TitleMatch | undefined = aliased
        ? pagesByTitle.get(aliased)?.imageUrl
          ? { title: aliased, confidence: 1, method: 'exact' }
          : undefined
        : (matchWikiTitle(performance.tourName, titles) ??
          matchJapaneseTitle(performance.tourName, pagesWithImages));
      tourMatches.set(performance.tourName, match);
      if (match) {
        stats.tourMatched += 1;
        entries[`tour:${performance.tourName}`] = {
          scope: 'tour',
          image: pagesByTitle.get(match.title)!.imageUrl!,
          source: match.title,
          confidence: match.confidence
        };
      } else if (normalizeJapanese(performance.tourName).length >= 8) {
        stats.skipped.push(performance.tourName);
      }
    }

    const concertName = performance.concertName;
    if (!concertName) continue;
    const tourMatch = tourMatches.get(performance.tourName);
    const match =
      matchWikiTitle(concertName, titles) ?? matchJapaneseTitle(concertName, pagesWithImages);
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

/**
 * Fetch each page's wikitext so its `{{Nihongo}}` Japanese title can be matched against
 * our Japanese tour names. Wiki page names are romanised, which leaves a Japanese-named
 * tour nothing to match on.
 */
async function fetchJapaneseTitles(titles: string[], force: boolean) {
  const byTitle = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const data = await fetchWikiJson<PageContentResponse>(
      'wikitext',
      {
        action: 'query',
        titles: batch.join('|'),
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        formatversion: '2',
        redirects: '1'
      },
      force
    );
    for (const page of data.query?.pages ?? []) {
      const content = page.revisions?.[0]?.slots?.main?.content;
      if (!content) continue;
      const japanese = extractNihongoTitle(content, page.title);
      if (japanese) byTitle.set(page.title, japanese);
    }
  }
  return byTitle;
}

/** Stable filename for a poster, derived from the image URL it came from. */
export const posterFileName = (imageUrl: string) =>
  createHash('sha1').update(imageUrl).digest('hex').slice(0, 16);

/**
 * Download every matched poster into `public/assets/lives`.
 *
 * Fandom serves these fine to a bare request but answers 404 when a `Referer` is present,
 * so hotlinking them from the app is at the mercy of whatever referrer policy the browser
 * applies — and a single blocked response gets cached. Song art is already downloaded for
 * the same reason; this brings posters in line.
 */
async function downloadPosters(entries: Record<string, LiveThumbEntry>, force: boolean) {
  mkdirSync(posterDir, { recursive: true });
  const seen = new Set<string>();
  let downloaded = 0;
  let failed = 0;

  for (const entry of Object.values(entries)) {
    const name = posterFileName(entry.image);
    const outPath = join(posterDir, `${name}.webp`);

    // Only claim the local copy once it is actually on disk — a dangling `file` would
    // point the app at a 404 and suppress the remote fallback.
    if (existsSync(outPath) && !force) {
      entry.file = name;
      seen.add(name);
      continue;
    }
    if (seen.has(name)) {
      if (existsSync(outPath)) entry.file = name;
      continue;
    }
    seen.add(name);

    const tmpPath = join(tmpdir(), `llernote-poster-${name}`);
    try {
      // No Referer: Fandom 404s hotlinked requests that carry one.
      const response = await fetch(entry.image, { headers: { 'user-agent': userAgent } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      writeFileSync(tmpPath, new Uint8Array(await response.arrayBuffer()));
      execFileSync('cwebp', ['-quiet', '-resize', '480', '0', tmpPath, '-o', outPath]);
      entry.file = name;
      downloaded += 1;
      await sleep(250);
    } catch (error) {
      failed += 1;
      console.warn(`  ! ${entry.source}: ${error instanceof Error ? error.message : error}`);
    } finally {
      rmSync(tmpPath, { force: true });
    }
  }

  console.log(
    `Posters downloaded: ${downloaded} (cached ${seen.size - downloaded - failed}, failed ${failed})`
  );
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

  const japaneseTitles = await fetchJapaneseTitles(titles, force);
  for (const page of pages) page.japaneseTitle = japaneseTitles.get(page.title);
  console.log(`Pages with a Japanese title: ${japaneseTitles.size}`);

  const aliases = existsSync(aliasPath)
    ? (Object.fromEntries(
        Object.entries(
          JSON.parse(readFileSync(aliasPath, 'utf-8')) as Record<string, string>
        ).filter(([key]) => !key.startsWith('_'))
      ) as Record<string, string>)
    : {};
  const { entries, stats } = buildThumbEntries(performances, pages, aliases);
  await downloadPosters(entries, force);
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
