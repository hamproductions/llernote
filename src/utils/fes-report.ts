import type { Artist, Character, Performance, Setlist, SetlistItem, Song } from '~/types';

/**
 * Per-show statistics for festival-style (multi-franchise) lives.
 *
 * Two different questions are kept apart on purpose:
 *   - song time: what was performed. Each song is billed in full to ONE franchise (its own series)
 *     and weighted by how much of it was played. Who is on stage does not matter.
 *   - cast time: who was on stage. Everyone performing a song gets its full weight.
 *
 * "Original song type" (full group / unit / solo / cross-franchise / guest) comes from the credited
 * artist, never from how many people happened to perform it that day.
 */

export const OTHERS = 'others';
export const SONG_TYPES = ['group', 'unit', 'solo', 'cross', 'guest'] as const;
export type FesSongType = (typeof SONG_TYPES)[number];

/** Who is on the official lineup of a performance (guests are listed separately in the source). */
export interface FesLineup {
  main: string[];
  guests: string[];
}
/** Hand corrections, e.g. a measured length: performanceId -> setlist item `position` -> weight. */
export type FesOverrides = Record<string, Record<string, { weight: number; why: string }>>;

export interface FesContext {
  songById: Map<string, Song>;
  artistById: Map<string, Artist>;
  characterById: Map<string, Character>;
  characters: Character[];
  lineups: Record<string, FesLineup>;
  overrides: FesOverrides;
}

export interface FesSong {
  /** unique within the report: `${dayIndex}:${position}` */
  key: string;
  songId: string;
  name: string;
  remarks: string;
  day: number;
  /** 1-based number among the songs of that day */
  no: number;
  weight: number;
  /** character ids actually performing */
  members: string[];
  /** true when the performers come from more than one franchise */
  collab: boolean;
  type: FesSongType;
  /** series id the song is billed to, or OTHERS */
  billed: string;
  /** performers per series id */
  mix: Record<string, number>;
}

export interface FesDay {
  performanceId: string;
  label: string;
  date: string;
  songs: FesSong[];
  /** everyone on the lineup (guests included); empty when the lineup is unknown */
  lineup: string[];
}

// ---------- remark parsing ----------

const normalize = (s: string) => s.replace(/[\s　]/g, '');

/** First match wins. Weights are assumptions about how much of the song is played, not measured lengths. */
const WEIGHT_TIERS: [RegExp, number][] = [
  [/Movie\s?Edit/i, 1],
  [/メドレー|medley/i, 0.3],
  [/1番.*(ラスサビ|[CDＤ]メロ)|ショート.*1番|2コーラス/, 0.75],
  [/TV\s?サイズ|TV\s?Size|Movie\s?サイズ|Movie\s?Size|ショート|Short|抜粋|さわり/i, 0.5]
];
export const songWeight = (remarks: string): number => {
  for (const [re, w] of WEIGHT_TIERS) if (re.test(remarks)) return w;
  return 1;
};

const GROUP_PREFIX: [string, string][] = [
  ["μ's", '1'],
  ['μ’s', '1'],
  ['Aqours', '2'],
  ['虹ヶ咲', '3'],
  ['Liella', '4'],
  ['蓮ノ空', '6'],
  ['いきづらい部', '8']
];
const NAME_ALIAS: Record<string, string> = { ランジュ: '嵐珠' };
const RANGE_TOKEN = /^\d〜\d期生$/;
const BGP = /B\.\s?G\.\s?P\./;

interface Index {
  /** `${unitId}\u0000${label}` -> character ids */
  variant: Map<string, string[]>;
  /** variant label -> union of members across units */
  variantByLabel: Map<string, string[]>;
  bySeries: Map<string, string[]>;
}
const indexCache = new WeakMap<Character[], Index>();
const buildIndex = (characters: Character[]): Index => {
  const cached = indexCache.get(characters);
  if (cached) return cached;
  const variant = new Map<string, string[]>();
  const byLabel = new Map<string, Set<string>>();
  const bySeries = new Map<string, string[]>();
  for (const c of characters) {
    bySeries.set(c.seriesId, [...(bySeries.get(c.seriesId) ?? []), c.id]);
    for (const u of c.units ?? []) {
      if (!u.additionalInfo) continue;
      const k = `${u.id}\u0000${u.additionalInfo}`;
      variant.set(k, [...(variant.get(k) ?? []), c.id]);
      byLabel.set(u.additionalInfo, (byLabel.get(u.additionalInfo) ?? new Set()).add(c.id));
    }
  }
  const idx = {
    variant,
    variantByLabel: new Map([...byLabel].map(([k, v]) => [k, [...v]])),
    bySeries
  };
  indexCache.set(characters, idx);
  return idx;
};

const lookupGivenName = (token: string, characters: Character[]): string | undefined => {
  const t = NAME_ALIAS[token] ?? token;
  const hits = characters.filter((c) => {
    const n = normalize(c.fullName);
    return n.endsWith(t) || n.startsWith(t);
  });
  return hits.length === 1 ? hits[0]!.id : undefined;
};

/**
 * Members named by a remark such as `穂乃果、ことり… Ver.`, `TVサイズ｜Aqours、μ's Ver.` or
 * `1〜3期生 Ver.`. Returns undefined when the remark does not name members (format words only,
 * free text, unknown labels) so the caller falls back to the credited artist.
 */
export const membersFromRemark = (
  remarks: string,
  characters: Character[],
  lineupIds: Set<string> | undefined
): string[] | undefined => {
  if (!remarks) return undefined;
  const tail = remarks.split('｜').at(-1) ?? '';
  if (!tail.includes('Ver.') && !tail.startsWith('Liella') && !remarks.includes('｜'))
    return undefined;
  const tokens = tail
    .replace('Ver.', '')
    .split(/[、,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (tokens.length === 0) return undefined;
  const idx = buildIndex(characters);
  const out: string[] = [];
  for (const token of tokens) {
    const group = GROUP_PREFIX.find(([prefix]) => token.startsWith(prefix));
    if (group) {
      const ids = idx.bySeries.get(group[1]) ?? [];
      out.push(...(lineupIds ? ids.filter((id) => lineupIds.has(id)) : ids));
    } else if (RANGE_TOKEN.test(token)) {
      // remarks say `1〜3期生`, the member lists are labelled `1期生〜3期生`
      const ids = idx.variantByLabel.get(token.replace(/^(\d)〜(\d)期生$/, '$1期生〜$2期生'));
      if (!ids) return undefined;
      out.push(...ids);
    } else {
      const id = lookupGivenName(token, characters);
      if (!id) return undefined;
      out.push(id);
    }
  }
  return out;
};

const artistMembers = (
  song: Song,
  artistById: Map<string, Artist>,
  idx: Index,
  remarks: string
): string[] => {
  const out: string[] = [];
  for (const sa of song.artists ?? []) {
    const artist = artistById.get(sa.id);
    if (!artist) continue;
    const bgp = BGP.test(remarks) ? idx.variant.get(`${sa.id}\u0000B. G. P.`) : undefined;
    if (bgp) out.push(...bgp);
    else if (sa.variant && idx.variant.get(`${sa.id}\u0000${sa.variant}`))
      out.push(...idx.variant.get(`${sa.id}\u0000${sa.variant}`)!);
    else out.push(...artist.characters.filter(Boolean));
  }
  return out;
};

const MAIN_GROUPS = new Set([
  "μ's",
  'Aqours',
  '虹ヶ咲学園スクールアイドル同好会',
  '蓮ノ空女学院スクールアイドルクラブ',
  'いきづらい部！'
]);
/** What the song IS (credited artist + series), independent of who performs it. */
export const originalSongType = (song: Song, artistById: Map<string, Artist>): FesSongType => {
  const seriesIds = song.seriesIds ?? [];
  if (seriesIds.length === 1 && seriesIds[0] === 5) return 'guest';
  if (seriesIds.length >= 2) return 'cross';
  const names = (song.artists ?? []).map((a) => artistById.get(a.id)?.name ?? '');
  if (names.some((n) => MAIN_GROUPS.has(n) || n.startsWith('Liella!'))) return 'group';
  const size = Math.max(
    0,
    ...(song.artists ?? []).map(
      (a) => (artistById.get(a.id)?.characters ?? []).filter(Boolean).length
    )
  );
  return size === 1 ? 'solo' : 'unit';
};

// ---------- building a day ----------

export const buildFesDay = (
  performance: Performance,
  setlist: Setlist,
  label: string,
  dayIndex: number,
  ctx: FesContext
): FesDay => {
  const idx = buildIndex(ctx.characters);
  const lineup = ctx.lineups[performance.id];
  const main = lineup ? new Set(lineup.main) : undefined;
  const allowed = lineup ? new Set([...lineup.main, ...lineup.guests]) : undefined;
  const everyone = lineup ? [...lineup.main, ...lineup.guests] : [];
  const overrides = ctx.overrides[performance.id] ?? {};

  const songs: FesSong[] = [];
  const items: SetlistItem[] = setlist.items.filter((it) => it.type === 'song' && it.songId);
  for (const it of items) {
    const song = ctx.songById.get(it.songId!);
    if (!song) continue;
    const remarks = it.remarks ?? '';
    let members: string[];
    if (remarks.includes('出演者全員') && lineup) members = everyone;
    else
      members =
        membersFromRemark(remarks, ctx.characters, main) ??
        artistMembers(song, ctx.artistById, idx, remarks);
    members = [...new Set(allowed ? members.filter((m) => allowed.has(m)) : members)];

    const mix: Record<string, number> = {};
    for (const m of members) {
      const s = ctx.characterById.get(m)?.seriesId;
      if (s) mix[s] = (mix[s] ?? 0) + 1;
    }
    const seriesIds = (song.seriesIds ?? []).map(String);
    const candidates = seriesIds.length
      ? seriesIds
      : Object.entries(mix)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 1)
          .map(([s]) => s);
    const top = Math.max(0, ...candidates.map((s) => mix[s] ?? 0));
    const tied = candidates.filter((s) => (mix[s] ?? 0) === top);

    songs.push({
      key: `${dayIndex}:${it.position}`,
      songId: song.id,
      name: it.customSongName ?? song.name,
      remarks,
      day: dayIndex,
      no: songs.length + 1,
      weight: overrides[String(it.position)]?.weight ?? songWeight(remarks),
      members,
      collab: Object.keys(mix).length > 1,
      type: originalSongType(song, ctx.artistById),
      billed: tied.length === 1 ? tied[0]! : OTHERS,
      mix
    });
  }
  return {
    performanceId: performance.id,
    label,
    date: performance.date,
    songs,
    lineup: [...new Set(everyone)]
  };
};

// ---------- aggregation ----------

export interface FesOptions {
  /** only these franchises (series ids) count as performers and as billed song time */
  activeSeries?: string[];
  /** drop songs with this many performers or more (finale / all-groups numbers) */
  hideEnsembleAt?: number;
}
export interface FesPerformer {
  id: string;
  series: string;
  weight: number;
  songs: number;
  /** weight of songs performed together with another franchise */
  collab: number;
  /** weight of songs that are originally solos */
  solo: number;
}
export interface FesFranchiseStat {
  series: string;
  members: number;
  avg: number;
  min: number;
  max: number;
  /** share of this franchise's cast time that was performed with another franchise */
  collabShare: number;
}
export interface FesPushRow {
  series: string;
  members: number;
  songTime: number;
  avg: number;
  /** relative to the average member of the compared franchises */
  vsAvg: number;
  solo: number;
  spotlight: number;
  min: number;
  max: number;
}
export interface FesDerived {
  songs: FesSong[];
  billed: FesSong[];
  weighted: number;
  performers: FesPerformer[];
  songTime: { series: string; weight: number; byType: Record<string, number> }[];
  types: { type: FesSongType; weight: number; count: number }[];
  franchises: FesFranchiseStat[];
  collab: { songShare: number; castShare: number };
  fairness: { gini: number; top10Share: number; members: number };
  push: FesPushRow[];
}

/** Franchise ids whose members count as "SIM guests" and stay out of fairness numbers. */
export const GUEST_SERIES = '5';

export const gini = (values: number[]): number => {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  const total = v.reduce((a, b) => a + b, 0);
  if (!n || !total) return 0;
  return (2 * v.reduce((a, x, i) => a + (i + 1) * x, 0)) / (n * total) - (n + 1) / n;
};

export const deriveFes = (
  days: FesDay[],
  characterById: Map<string, Character>,
  options: FesOptions = {}
): FesDerived => {
  const all = days.flatMap((d) => d.songs);
  const songs = all.filter(
    (s) => !options.hideEnsembleAt || s.members.length < options.hideEnsembleAt
  );
  const active = options.activeSeries ? new Set(options.activeSeries) : undefined;
  const billed = songs.filter((s) => !active || active.has(s.billed));

  const per = new Map<string, FesPerformer>();
  for (const s of songs)
    for (const m of s.members) {
      const series = characterById.get(m)?.seriesId;
      if (!series || (active && !active.has(series))) continue;
      const p = per.get(m) ?? { id: m, series, weight: 0, songs: 0, collab: 0, solo: 0 };
      p.weight += s.weight;
      p.songs += 1;
      if (s.collab) p.collab += s.weight;
      if (s.type === 'solo') p.solo += s.weight;
      per.set(m, p);
    }
  const performers = [...per.values()].sort((a, b) => b.weight - a.weight);

  const stime = new Map<string, { weight: number; byType: Record<string, number> }>();
  for (const s of billed) {
    const e = stime.get(s.billed) ?? { weight: 0, byType: {} };
    e.weight += s.weight;
    e.byType[s.type] = (e.byType[s.type] ?? 0) + s.weight;
    stime.set(s.billed, e);
  }
  const songTime = [...stime]
    .map(([series, v]) => ({ series, ...v }))
    .sort((a, b) => b.weight - a.weight);

  const types = SONG_TYPES.map((type) => ({
    type,
    weight: billed.filter((s) => s.type === type).reduce((a, s) => a + s.weight, 0),
    count: billed.filter((s) => s.type === type).length
  })).filter((t) => t.count > 0);

  const bySeries = new Map<string, FesPerformer[]>();
  for (const p of performers) bySeries.set(p.series, [...(bySeries.get(p.series) ?? []), p]);
  const franchises: FesFranchiseStat[] = [...bySeries].map(([series, ps]) => {
    const w = ps.map((p) => p.weight);
    const total = w.reduce((a, b) => a + b, 0);
    return {
      series,
      members: ps.length,
      avg: total / ps.length,
      min: Math.min(...w),
      max: Math.max(...w),
      collabShare: total ? ps.reduce((a, p) => a + p.collab, 0) / total : 0
    };
  });

  const songTotal = songs.reduce((a, s) => a + s.weight, 0);
  const castTotal = performers.reduce((a, p) => a + p.weight, 0);
  const members = performers.filter((p) => p.series !== GUEST_SERIES);
  const memberTotal = members.reduce((a, p) => a + p.weight, 0);
  const fair = members.length ? memberTotal / members.length : 0;

  const pushRows: FesPushRow[] = [];
  for (const f of franchises) {
    if (f.series === GUEST_SERIES) continue;
    const ps = performers.filter((p) => p.series === f.series);
    const b = billed.filter((s) => s.billed === f.series);
    pushRows.push({
      series: f.series,
      members: ps.length,
      songTime: b.reduce((a, s) => a + s.weight, 0),
      avg: f.avg,
      vsAvg: fair ? f.avg / fair - 1 : 0,
      solo: songs
        .filter((s) => s.type === 'solo' && s.billed === f.series)
        .reduce((a, s) => a + s.weight, 0),
      spotlight: b
        .filter((s) => s.type === 'solo' || s.type === 'unit')
        .reduce((a, s) => a + s.weight, 0),
      min: f.min,
      max: f.max
    });
  }

  return {
    songs,
    billed,
    weighted: songTotal,
    performers,
    songTime,
    types,
    franchises,
    collab: {
      songShare: songTotal
        ? songs.filter((s) => s.collab).reduce((a, s) => a + s.weight, 0) / songTotal
        : 0,
      castShare: castTotal ? performers.reduce((a, p) => a + p.collab, 0) / castTotal : 0
    },
    fairness: {
      gini: gini(members.map((p) => p.weight)),
      top10Share: memberTotal
        ? members.slice(0, 10).reduce((a, p) => a + p.weight, 0) / memberTotal
        : 0,
      members: members.length
    },
    push: pushRows
  };
};

// ---------- day to day ----------

export interface FesDiff {
  repeated: { from: FesSong; to: FesSong; inOrder: boolean }[];
  dropped: FesSong[];
  added: FesSong[];
  /** repeats that sit at the same song number on both days */
  sameNumber: number;
}

/**
 * A song counts as CHANGED only if the next day does not play it at all. Moving it is not a change;
 * `inOrder` marks repeats that keep their order relative to the other repeats (longest common
 * subsequence of song ids).
 */
export const diffFesDays = (a: FesSong[], b: FesSong[]): FesDiff => {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0)
  );
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i]![j] =
        a[i]!.songId === b[j]!.songId
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const kept = new Set<number>();
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i]!.songId === b[j]!.songId) {
      kept.add(i);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  const inB = new Map(b.map((s, i) => [s.songId, i]));
  const inA = new Set(a.map((s) => s.songId));
  const repeated = a
    .map((from, i) => ({ from, i }))
    .filter(({ from }) => inB.has(from.songId))
    .map(({ from, i }) => ({ from, to: b[inB.get(from.songId)!]!, inOrder: kept.has(i) }));
  return {
    repeated,
    dropped: a.filter((s) => !inB.has(s.songId)),
    added: b.filter((s) => !inA.has(s.songId)),
    sameNumber: repeated.filter((r) => r.from.no === r.to.no).length
  };
};
