import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const localRawPath = join(here, '../data/raw/llfans-performances.json');
const sorterRawPath = join(here, '../../the-sorter/data/raw/llfans-performances.json');
const rawPath = existsSync(localRawPath) ? localRawPath : sorterRawPath;
const cacheRoot = join(here, '../data/enrichment-cache/venues');
const outputPath = join(here, '../data/venue-info.json');
const wikidataEndpoint = 'https://query.wikidata.org/sparql';
const nominatimEndpoint = 'https://nominatim.openstreetmap.org/search';
const nominatimReverseEndpoint = 'https://nominatim.openstreetmap.org/reverse';
const userAgent = 'LLerNote venue enrichment (https://github.com/hamproductions/LLerNote)';

interface RawEntry {
  performance: {
    id: string;
    date: string;
  };
  concert?: {
    venue?: {
      id: string;
      name: string;
    } | null;
  } | null;
  tour?: {
    seriesIds?: Array<number | string>;
  } | null;
}

interface VenueSeed {
  id: string;
  name: string;
  performanceCount: number;
  firstDate: string;
  lastDate: string;
  seriesIds: number[];
}

interface WikidataCandidate {
  item: string;
  itemLabel: string;
  aliases?: string;
  coord?: string;
  address?: string;
  countryLabel?: string;
  regionLabel?: string;
  localityLabel?: string;
  website?: string;
}

interface NominatimCandidate {
  osm_type: string;
  osm_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
  type?: string;
  class?: string;
}

interface NominatimReverseCandidate {
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
  type?: string;
  class?: string;
}

interface ScoredCandidate {
  source: 'wikidata' | 'osm';
  sourceId: string;
  confidence: number;
  reviewRequired: boolean;
  address?: string;
  lat?: number;
  lng?: number;
  country?: string;
  region?: string;
  locality?: string;
  website?: string;
  label?: string;
  error?: string;
  raw?: unknown;
}

interface VenueInfo extends VenueSeed {
  queries: string[];
  source?: 'wikidata' | 'osm';
  sourceId?: string;
  confidence: number;
  reviewRequired: boolean;
  address?: string;
  lat?: number;
  lng?: number;
  country?: string;
  region?: string;
  locality?: string;
  website?: string;
  candidates: ScoredCandidate[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jpPrefectures: Record<string, string> = {
  'JP-01': '北海道',
  'JP-02': '青森県',
  'JP-03': '岩手県',
  'JP-04': '宮城県',
  'JP-05': '秋田県',
  'JP-06': '山形県',
  'JP-07': '福島県',
  'JP-08': '茨城県',
  'JP-09': '栃木県',
  'JP-10': '群馬県',
  'JP-11': '埼玉県',
  'JP-12': '千葉県',
  'JP-13': '東京都',
  'JP-14': '神奈川県',
  'JP-15': '新潟県',
  'JP-16': '富山県',
  'JP-17': '石川県',
  'JP-18': '福井県',
  'JP-19': '山梨県',
  'JP-20': '長野県',
  'JP-21': '岐阜県',
  'JP-22': '静岡県',
  'JP-23': '愛知県',
  'JP-24': '三重県',
  'JP-25': '滋賀県',
  'JP-26': '京都府',
  'JP-27': '大阪府',
  'JP-28': '兵庫県',
  'JP-29': '奈良県',
  'JP-30': '和歌山県',
  'JP-31': '鳥取県',
  'JP-32': '島根県',
  'JP-33': '岡山県',
  'JP-34': '広島県',
  'JP-35': '山口県',
  'JP-36': '徳島県',
  'JP-37': '香川県',
  'JP-38': '愛媛県',
  'JP-39': '高知県',
  'JP-40': '福岡県',
  'JP-41': '佐賀県',
  'JP-42': '長崎県',
  'JP-43': '熊本県',
  'JP-44': '大分県',
  'JP-45': '宮崎県',
  'JP-46': '鹿児島県',
  'JP-47': '沖縄県'
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[（）()[\]【】・･,，.。:：\-\s]/g, '')
    .replace(/旧[^)]*$/, '');

const uniq = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

const romanizedPlaceWords: Record<string, string[]> = {
  namba: ['難波', 'なんば', 'なんば大阪'],
  osaka: ['大阪'],
  tokyo: ['東京'],
  yokohama: ['横浜'],
  nagoya: ['名古屋'],
  fukuoka: ['福岡'],
  sapporo: ['札幌'],
  sendai: ['仙台'],
  kobe: ['神戸'],
  kyoto: ['京都'],
  hiroshima: ['広島'],
  taipei: ['台北'],
  shanghai: ['上海'],
  guangzhou: ['广州']
};

function buildRomanizedPlaceQueries(name: string) {
  const queries: string[] = [];

  for (const [word, replacements] of Object.entries(romanizedPlaceWords)) {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (!pattern.test(name)) continue;
    for (const replacement of replacements) {
      const query = name.replace(pattern, replacement);
      queries.push(query, query.replace(/([A-Za-z])\s+([ぁ-んァ-ン一-龯])/g, '$1$2'));
    }
  }

  return queries;
}

function buildLatinCompactionQueries(name: string) {
  const words = name.split(/\s+/);
  if (words.length < 3) return [];

  return words.flatMap((_, index) => {
    if (index === 0 || index >= words.length - 1) return [];
    if (!/^[A-Za-z][A-Za-z-]*$/.test(words[index])) return [];
    if (!/^[A-Za-z][A-Za-z-]*$/.test(words[index + 1])) return [];
    return [
      [
        ...words.slice(0, index),
        `${words[index]}${words[index + 1]}`,
        ...words.slice(index + 2)
      ].join(' ')
    ];
  });
}

function addressRegion(address: Record<string, string>) {
  const iso = address['ISO3166-2-lvl4'];
  if (iso && jpPrefectures[iso]) return jpPrefectures[iso];
  return address.province ?? address.state ?? address.region ?? address.state_district;
}

function addressLocality(address: Record<string, string>) {
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.city_district ??
    address.suburb
  );
}

export function buildVenueQueries(name: string) {
  const withoutOldName = name.replace(/（旧[:：][^）]+）/g, '').replace(/（旧:[^）]+）/g, '');
  const latinAliases = [...name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  const withoutLatin = name.replace(/\s*\([^)]+\)/g, '');
  const spacedHall = withoutLatin.replace(/城ホール$/u, '城 ホール');
  const dotParts = withoutOldName.includes('・') ? withoutOldName.split('・') : [];
  const romanizedPlaceQueries = [
    ...buildRomanizedPlaceQueries(name),
    ...buildRomanizedPlaceQueries(withoutLatin)
  ];
  const latinCompactionQueries = [
    ...buildLatinCompactionQueries(name),
    ...buildLatinCompactionQueries(withoutLatin)
  ];
  const parentVenue = withoutLatin
    .replace(
      /[ 　](メインアリーナ|大ホール|イベントホール|国立大ホール|第一体育館|北館大展示場|国際展示場|[A-ZＡ-Ｚ]館|第[0-9０-９]+展示館|[0-9０-９]+〜[0-9０-９]+ホール|[0-9０-９]+ホール)$/u,
      ''
    )
    .replace(/[ 　]?(1F|2F|3F|4F|5F|6F|10F|[0-9０-９]+階).+$/u, '')
    .replace(
      /[ 　](イベントスペース|イベントホール|センターコート|スカイコート|屋外イベント広場|けやき広場|サンシャインコート|オーバルパーク)$/u,
      ''
    );

  return uniq([
    name,
    withoutOldName,
    withoutLatin,
    spacedHall,
    parentVenue,
    ...romanizedPlaceQueries,
    ...latinCompactionQueries,
    ...latinAliases,
    ...dotParts
  ]);
}

const parsePoint = (point?: string) => {
  const match = point?.match(/^Point\(([-.\d]+) ([-.\d]+)\)$/);
  if (!match) return {};
  return { lng: Number(match[1]), lat: Number(match[2]) };
};

export function scoreWikidataCandidate(
  name: string,
  candidate: WikidataCandidate
): ScoredCandidate {
  const normalizedName = normalizeName(name);
  const normalizedLabel = normalizeName(candidate.itemLabel);
  const aliases = (candidate.aliases ?? '').split('|').filter(Boolean);
  const normalizedAliases = aliases.map(normalizeName);
  const exact = normalizedName === normalizedLabel || normalizedAliases.includes(normalizedName);
  const contained =
    normalizedLabel.includes(normalizedName) ||
    normalizedName.includes(normalizedLabel) ||
    normalizedAliases.some(
      (alias) => alias.includes(normalizedName) || normalizedName.includes(alias)
    );
  const hasLocation = Boolean(candidate.coord || candidate.address);
  const confidence = exact ? (hasLocation ? 0.96 : 0.88) : contained ? 0.72 : 0.3;
  const { lat, lng } = parsePoint(candidate.coord);

  return {
    source: 'wikidata',
    sourceId: candidate.item.replace('http://www.wikidata.org/entity/', ''),
    confidence,
    reviewRequired: confidence < 0.85,
    address: candidate.address,
    lat,
    lng,
    country: candidate.countryLabel,
    region: candidate.regionLabel,
    locality: candidate.localityLabel,
    website: candidate.website,
    label: candidate.itemLabel,
    raw: candidate
  };
}

export function scoreNominatimCandidate(
  name: string,
  candidate: NominatimCandidate,
  query = name
): ScoredCandidate {
  const normalizedName = normalizeName(name);
  const normalizedQuery = normalizeName(query);
  const firstDisplayPart = normalizeName(candidate.display_name.split(',')[0] ?? '');
  const address = candidate.address ?? {};
  const candidateNames = [
    candidate.name,
    firstDisplayPart,
    address.building,
    address.amenity,
    address.tourism,
    address.leisure,
    ...Object.values(candidate.namedetails ?? {})
  ]
    .filter(Boolean)
    .map((value) => normalizeName(String(value)));
  const targets = [normalizedName, normalizedQuery].filter((value) => value.length >= 3);
  const exact = targets.some((target) => candidateNames.includes(target));
  const prefix = targets.some((target) =>
    candidateNames.some((candidateName) => candidateName.startsWith(target))
  );
  const confidence = exact ? 0.98 : prefix ? 0.9 : 0.25;

  return {
    source: 'osm',
    sourceId: `${candidate.osm_type}/${candidate.osm_id}`,
    confidence,
    reviewRequired: confidence < 0.85,
    address: candidate.display_name,
    lat: Number(candidate.lat),
    lng: Number(candidate.lon),
    country: address.country,
    region: addressRegion(address),
    locality: addressLocality(address),
    label: candidate.display_name.split(',')[0],
    raw: candidate
  };
}

function scoreNominatimReverseCandidate(candidate: NominatimReverseCandidate): ScoredCandidate {
  const address = candidate.address ?? {};

  return {
    source: 'osm',
    sourceId:
      candidate.osm_type && candidate.osm_id
        ? `${candidate.osm_type}/${candidate.osm_id}`
        : 'reverse',
    confidence: 0.88,
    reviewRequired: false,
    address: candidate.display_name,
    lat: candidate.lat ? Number(candidate.lat) : undefined,
    lng: candidate.lon ? Number(candidate.lon) : undefined,
    country: address.country,
    region: addressRegion(address),
    locality: addressLocality(address),
    label: address.building ?? address.amenity ?? candidate.display_name?.split(',')[0],
    raw: candidate
  };
}

function extractVenues(raw: RawEntry[]) {
  const venues = new Map<string, VenueSeed>();

  for (const entry of raw) {
    const venue = entry.concert?.venue;
    if (!venue) continue;
    const existing = venues.get(venue.id);
    const seriesIds = (entry.tour?.seriesIds ?? []).map(Number);

    if (!existing) {
      venues.set(venue.id, {
        id: venue.id,
        name: venue.name,
        performanceCount: 1,
        firstDate: entry.performance.date,
        lastDate: entry.performance.date,
        seriesIds: [...seriesIds].sort((a, b) => a - b)
      });
      continue;
    }

    existing.performanceCount += 1;
    existing.firstDate =
      entry.performance.date < existing.firstDate ? entry.performance.date : existing.firstDate;
    existing.lastDate =
      entry.performance.date > existing.lastDate ? entry.performance.date : existing.lastDate;
    existing.seriesIds = [...new Set([...existing.seriesIds, ...seriesIds])].sort((a, b) => a - b);
  }

  return [...venues.values()].sort((a, b) => Number(a.id) - Number(b.id));
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
  return data;
}

async function fetchWikidata(query: string, force: boolean) {
  const sparql = `
SELECT ?item ?itemLabel ?coord ?address ?countryLabel ?regionLabel ?localityLabel ?website (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases) WHERE {
  VALUES ?needle { "${query.replaceAll('"', '\\"')}"@ja "${query.replaceAll('"', '\\"')}"@en "${query.replaceAll('"', '\\"')}" }
  ?item (rdfs:label|skos:altLabel) ?needle.
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item wdt:P6375 ?address. }
  OPTIONAL { ?item wdt:P17 ?country. }
  OPTIONAL { ?item wdt:P131 ?region. }
  OPTIONAL { ?item wdt:P669 ?locality. }
  OPTIONAL { ?item wdt:P856 ?website. }
  OPTIONAL { ?item skos:altLabel ?alias. FILTER(LANG(?alias) IN ("ja", "en", "")) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
}
GROUP BY ?item ?itemLabel ?coord ?address ?countryLabel ?regionLabel ?localityLabel ?website
LIMIT 8`;
  const url = `${wikidataEndpoint}?format=json&query=${encodeURIComponent(sparql)}`;
  const response = await cachedJson<{ results: { bindings: Record<string, { value: string }>[] } }>(
    'wikidata',
    query,
    force,
    async () => {
      const res = await fetch(url, {
        headers: {
          accept: 'application/sparql-results+json',
          'user-agent': userAgent
        }
      });
      if (!res.ok) throw new Error(`Wikidata ${res.status} for ${query}`);
      return res.json();
    }
  );

  return response.results.bindings.map((binding) => ({
    item: binding.item?.value,
    itemLabel: binding.itemLabel?.value,
    aliases: binding.aliases?.value,
    coord: binding.coord?.value,
    address: binding.address?.value,
    countryLabel: binding.countryLabel?.value,
    regionLabel: binding.regionLabel?.value,
    localityLabel: binding.localityLabel?.value,
    website: binding.website?.value
  })) as WikidataCandidate[];
}

async function fetchNominatim(query: string, force: boolean) {
  const url = new URL(nominatimEndpoint);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('namedetails', '1');
  url.searchParams.set('limit', '5');

  return cachedJson<NominatimCandidate[]>('nominatim', query, force, async () => {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': userAgent
      }
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status} for ${query}`);
    return res.json();
  });
}

async function fetchNominatimReverse(lat: number, lng: number, force: boolean) {
  const url = new URL(nominatimReverseEndpoint);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');

  return cachedJson<NominatimReverseCandidate>(
    'nominatim-reverse',
    `${lat},${lng}`,
    force,
    async () => {
      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': userAgent
        }
      });
      if (!res.ok) throw new Error(`Nominatim reverse ${res.status} for ${lat},${lng}`);
      return res.json();
    }
  );
}

function pickBest(candidates: ScoredCandidate[]) {
  return [...candidates].sort((a, b) => b.confidence - a.confidence)[0];
}

async function enrichVenue(
  seed: VenueSeed,
  options: { force: boolean; noNetwork: boolean; withWikidata: boolean }
) {
  const queries = buildVenueQueries(seed.name);
  const candidates: ScoredCandidate[] = [];

  if (!options.noNetwork) {
    for (const query of queries) {
      try {
        const nominatim = await fetchNominatim(query, options.force);
        candidates.push(
          ...nominatim.map((candidate) => scoreNominatimCandidate(seed.name, candidate, query))
        );
      } catch (error) {
        candidates.push({
          source: 'osm',
          sourceId: query,
          confidence: 0,
          reviewRequired: true,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      if (
        candidates.some((candidate) => candidate.source === 'osm' && candidate.confidence >= 0.85)
      )
        break;
      await sleep(1100);
    }

    if (options.withWikidata && !candidates.some((candidate) => candidate.confidence >= 0.85)) {
      for (const query of queries) {
        try {
          const wikidata = await fetchWikidata(query, options.force);
          candidates.push(
            ...wikidata.map((candidate) => scoreWikidataCandidate(seed.name, candidate))
          );
        } catch (error) {
          candidates.push({
            source: 'wikidata',
            sourceId: query,
            confidence: 0,
            reviewRequired: true,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        if (
          candidates.some(
            (candidate) => candidate.source === 'wikidata' && candidate.confidence >= 0.85
          )
        )
          break;
        await sleep(250);
      }
    }
  }

  let best = pickBest(candidates);

  if (
    !options.noNetwork &&
    best &&
    !best.reviewRequired &&
    best.lat !== undefined &&
    best.lng !== undefined &&
    (!best.address || !best.region || !best.locality)
  ) {
    try {
      const reverse = scoreNominatimReverseCandidate(
        await fetchNominatimReverse(best.lat, best.lng, options.force)
      );
      candidates.push(reverse);
      best = {
        ...best,
        address: best.address ?? reverse.address,
        country: best.country ?? reverse.country,
        region: best.region ?? reverse.region,
        locality: best.locality ?? reverse.locality,
        lat: best.lat ?? reverse.lat,
        lng: best.lng ?? reverse.lng
      };
    } catch (error) {
      candidates.push({
        source: 'osm',
        sourceId: `${best.lat},${best.lng}`,
        confidence: 0,
        reviewRequired: true,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    await sleep(1100);
  }

  return {
    ...seed,
    queries,
    source: best?.source,
    sourceId: best?.sourceId,
    confidence: best?.confidence ?? 0,
    reviewRequired: !best || best.reviewRequired,
    address: best?.address,
    lat: best?.lat,
    lng: best?.lng,
    country: best?.country,
    region: best?.region,
    locality: best?.locality,
    website: best?.website,
    candidates: candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
  } satisfies VenueInfo;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const noNetwork = args.includes('--no-network');
  const withWikidata = args.includes('--with-wikidata');
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const venueIdArg = args.find((arg) => arg.startsWith('--venue-id='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
  const venueId = venueIdArg?.split('=')[1];
  const raw = JSON.parse(readFileSync(rawPath, 'utf-8')) as RawEntry[];
  const venues = extractVenues(raw)
    .filter((venue) => !venueId || venue.id === venueId)
    .slice(0, limit);
  const enriched: VenueInfo[] = [];

  for (const [index, venue] of venues.entries()) {
    console.log(`[${index + 1}/${venues.length}] ${venue.name}`);
    enriched.push(await enrichVenue(venue, { force, noNetwork, withWikidata }));
  }

  writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
  console.log(`Wrote ${enriched.length} venues to ${outputPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
