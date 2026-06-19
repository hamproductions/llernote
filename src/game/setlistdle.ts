import { liveCatOfPerformance, type LiveCat } from '~/utils/live-cat';
import type { Performance, Setlist, SetlistItem } from '~/types';

export const MAX_GUESSES = 5;
export const MIN_SONGS = 4;
const YEAR_NEAR = 1;
const SONGS_NEAR = 2;
const MONTH_NEAR = 1;
const EPOCH = '2026-06-01';

export type PoolEntry = {
  number: number;
  performance: Performance;
  setlist: Setlist;
  cat: LiveCat | null;
};

const songItems = (sl: Setlist) => sl.items.filter((it) => it.type === 'song' && !!it.songId);
const realSongCount = (sl: Setlist) => songItems(sl).length;
const hasRealSong = (sl: Setlist | undefined) => !!sl && songItems(sl).length > 0;
const signatureOf = (sl: Setlist) =>
  songItems(sl)
    .map((it) => it.songId)
    .join('>');

export const buildPool = (
  performances: Performance[],
  setlists: Record<string, Setlist>,
  cats: ReadonlySet<string>
): PoolEntry[] =>
  performances
    .map((p) => ({ performance: p, setlist: setlists[p.id], cat: liveCatOfPerformance(p) }))
    .filter(
      (e): e is { performance: Performance; setlist: Setlist; cat: LiveCat | null } =>
        hasRealSong(e.setlist) && !!e.cat && cats.has(e.cat)
    )
    .sort(
      (a, b) =>
        a.performance.date.localeCompare(b.performance.date) ||
        a.performance.id.localeCompare(b.performance.id)
    )
    .map((e, i) => ({ number: i + 1, performance: e.performance, setlist: e.setlist, cat: e.cat }));

export const answerPool = (pool: PoolEntry[]): PoolEntry[] => {
  const tourNamesBySig = new Map<string, Set<string>>();
  for (const e of pool) {
    const sig = signatureOf(e.setlist);
    if (!sig) continue;
    const set = tourNamesBySig.get(sig) ?? new Set<string>();
    set.add(e.performance.tourName);
    tourNamesBySig.set(sig, set);
  }
  return pool.filter(
    (e) =>
      realSongCount(e.setlist) >= MIN_SONGS &&
      (tourNamesBySig.get(signatureOf(e.setlist))?.size ?? 1) <= 1
  );
};

const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const dailyIndex = (dateStr: string, len: number, salt = '') =>
  len > 0 ? hashStr(dateStr + salt) % len : 0;

export const dayNumber = (dateStr: string) => {
  const d = Date.parse(`${dateStr}T00:00:00Z`);
  const e = Date.parse(`${EPOCH}T00:00:00Z`);
  return Math.floor((d - e) / 86_400_000) + 1;
};

const PREF_GROUP: Record<string, string> = {};
const GROUPS: Record<string, string[]> = {
  hokkaido: ['北海道'],
  tohoku: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  kanto: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  chubu: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  kinki: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  chugoku: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  shikoku: ['徳島県', '香川県', '愛媛県', '高知県'],
  kyushu: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
};
for (const [group, prefs] of Object.entries(GROUPS)) for (const p of prefs) PREF_GROUP[p] = group;

const encoreBlocks = (sl: Setlist) => {
  let n = 0;
  let inEnc = false;
  let lastName = '';
  for (const sec of sl.sections ?? []) {
    if (sec.type === 'encore') {
      if (!inEnc || sec.name !== lastName) n += 1;
      inEnc = true;
      lastName = sec.name;
    } else inEnc = false;
  }
  return n;
};

export type EventFacts = {
  id: string;
  year: number;
  month: number;
  seriesIds: string[];
  region?: string;
  regionGroup?: string;
  songCount: number;
};

export const factsOf = (
  p: Performance,
  sl: Setlist,
  regionOf: (p: Performance) => string | undefined
): EventFacts => {
  const region = regionOf(p);
  return {
    id: p.id,
    year: Number(p.date.slice(0, 4)),
    month: Number(p.date.slice(5, 7)),
    seriesIds: [...p.seriesIds].sort(),
    region,
    regionGroup: region ? PREF_GROUP[region] : undefined,
    songCount: realSongCount(sl)
  };
};

export type Cmp = 'hit' | 'partial' | 'miss';
export type AttrResult = { status: Cmp; dir?: 'up' | 'down' };
export type GuessResult = {
  id: string;
  correct: boolean;
  series: AttrResult;
  year: AttrResult;
  songs: AttrResult;
  region: AttrResult;
  month: AttrResult;
};

export const ATTR_ORDER = ['series', 'year', 'songs', 'region', 'month'] as const;

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);
const overlaps = (a: string[], b: string[]) => a.some((x) => b.includes(x));
const num = (g: number, t: number, near: number): AttrResult =>
  g === t
    ? { status: 'hit' }
    : { status: Math.abs(g - t) <= near ? 'partial' : 'miss', dir: t > g ? 'up' : 'down' };
const cyclicMonth = (g: number, t: number): AttrResult => {
  const raw = Math.abs(g - t);
  const d = Math.min(raw, 12 - raw);
  return { status: d === 0 ? 'hit' : d <= MONTH_NEAR ? 'partial' : 'miss' };
};

const HIT: AttrResult = { status: 'hit' };

export const compareFacts = (guess: EventFacts, target: EventFacts): GuessResult => {
  if (guess.id === target.id)
    return {
      id: guess.id,
      correct: true,
      series: HIT,
      year: HIT,
      songs: HIT,
      region: HIT,
      month: HIT
    };
  return {
    id: guess.id,
    correct: false,
    series: sameSet(guess.seriesIds, target.seriesIds)
      ? { status: 'hit' }
      : { status: overlaps(guess.seriesIds, target.seriesIds) ? 'partial' : 'miss' },
    year: num(guess.year, target.year, YEAR_NEAR),
    songs: num(guess.songCount, target.songCount, SONGS_NEAR),
    region:
      guess.region && target.region && guess.region === target.region
        ? { status: 'hit' }
        : guess.regionGroup && target.regionGroup && guess.regionGroup === target.regionGroup
          ? { status: 'partial' }
          : { status: 'miss' },
    month: cyclicMonth(guess.month, target.month)
  };
};

export type Hints = {
  sectionCounts: { main: number; encore: number; mc: number; vtr: number; encoreBlocks: number };
  mcContents: string[];
  firstSong: string;
  songList: string[];
};

export const buildHints = (sl: Setlist, songName: (item: SetlistItem) => string): Hints => {
  const encoreIdx = new Set<number>();
  for (const sec of sl.sections ?? [])
    if (sec.type === 'encore')
      for (let i = sec.startIndex; i <= sec.endIndex; i++) encoreIdx.add(i);
  let main = 0;
  let encore = 0;
  let mc = 0;
  let vtr = 0;
  const mcContents: string[] = [];
  const songList: string[] = [];
  sl.items.forEach((it, i) => {
    if (it.type === 'song' && it.songId) {
      if (encoreIdx.has(i)) encore += 1;
      else main += 1;
      songList.push(songName(it));
    } else if (it.type === 'mc') {
      mc += 1;
      mcContents.push([it.title, it.remarks].filter(Boolean).join(' — ') || 'MC');
    } else if (it.type === 'vtr') {
      vtr += 1;
      mcContents.push([it.title, it.remarks].filter(Boolean).join(' — ') || 'VTR');
    } else if (it.type === 'custom') {
      mcContents.push([it.title, it.remarks].filter(Boolean).join(' — ') || '—');
    }
  });
  return {
    sectionCounts: { main, encore, mc, vtr, encoreBlocks: encoreBlocks(sl) },
    mcContents,
    firstSong: songList[0] ?? '?',
    songList
  };
};

export const HINT_TIERS = ['mc', 'firstSong', 'songList'] as const;
export type HintTier = (typeof HINT_TIERS)[number];

const EMOJI: Record<Cmp, string> = { hit: '🟩', partial: '🟨', miss: '⬛' };

export const buildShareText = (
  day: number,
  results: GuessResult[],
  won: boolean,
  maxGuesses = MAX_GUESSES
): string => {
  const score = won ? `${results.length}/${maxGuesses}` : `X/${maxGuesses}`;
  const grid = results.map((r) => ATTR_ORDER.map((k) => EMOJI[r[k].status]).join('')).join('\n');
  return `SetlistDle #${day} ${score}\n${grid}`;
};
