import artistsJson from '../../data/artists-info.json';
import { loadSongData, type SongData } from '~/data/songs';
import perfsJson from '../../data/performance-info.json';
import { loadSetlists } from '~/data/setlists';
import seriesJson from '../../data/series-info.json';
import extraJson from '../../data/event-extra.json';
import { flagOf, liveLabel, liveCatOf, LIVE_CATS, type LiveCat } from '~/utils/live-cat';

export { LIVE_CATS, type LiveCat };

type Artist = { id: string; characters: string[]; seriesIds: number[] };
type SongRec = { id: string; name: string; englishName?: string; artists?: { id: string }[] };
type Perf = {
  id: string;
  tourName: string;
  date: string;
  venue: string;
  seriesIds: string[];
  hasSetlist: boolean;
  performanceName?: string;
};
type Item = {
  type: string;
  songId?: string;
  customSongName?: string;
  title?: string;
  remarks?: string;
};
type Section = { name: string; type: string; startIndex: number; endIndex: number };
type Setlist = { performanceId: string; items: Item[]; sections?: Section[] };

// Medley / TV-size / short performances count as half a song in the bar charts.
const PARTIAL = /メドレー|medley|TV\s?サイズ|TV\s?Size|ショート|Short\s?Ver|抜粋|さわり/i;
const songWeight = (it: Item): number => (PARTIAL.test(it.remarks || '') ? 0.5 : 1);

// Run-length sequence of a show: [main×12][mc][vtr][main×3][encore×2]... for the flow bar.
function buildFlow(sl: Setlist): { k: string; n: number }[] {
  const secType: string[] = Array.from({ length: sl.items.length }, () => 'main');
  if (sl.sections?.length)
    for (const sec of sl.sections)
      for (let i = sec.startIndex; i <= sec.endIndex && i < secType.length; i++)
        secType[i] = sec.type;
  const runs: { k: string; n: number }[] = [];
  for (let i = 0; i < sl.items.length; i++) {
    const it = sl.items[i];
    let k: string;
    if (it.type === 'song' && it.songId) k = secType[i] === 'encore' ? 'encore' : 'main';
    else if (it.type === 'mc') k = 'mc';
    else if (it.type === 'vtr') k = 'vtr';
    else k = 'other';
    const last = runs[runs.length - 1];
    if ((k === 'main' || k === 'encore') && last && last.k === k) last.n++;
    else runs.push({ k, n: 1 });
  }
  return runs;
}

function sectionStats(sl: Setlist) {
  let mainS = 0,
    encS = 0,
    encN = 0;
  const isSong = (i: number) => sl.items[i]?.type === 'song' && !!sl.items[i]?.songId;
  if (sl.sections?.length) {
    // encN = distinct encore blocks: consecutive encore sections, or encores split only by a
    // song-less (MC-only) main section, count as one encore. A main section WITH songs ends the run.
    let inEncore = false,
      lastEncName = '';
    for (const sec of sl.sections) {
      let songs = 0;
      for (let i = sec.startIndex; i <= sec.endIndex; i++) if (isSong(i)) songs++;
      if (sec.type === 'encore') {
        encS += songs;
        if (!inEncore || sec.name !== lastEncName) encN++;
        inEncore = true;
        lastEncName = sec.name;
      } else {
        mainS += songs;
        if (songs > 0) {
          inEncore = false;
          lastEncName = '';
        }
      }
    }
  } else {
    for (let i = 0; i < sl.items.length; i++) if (isSong(i)) mainS++;
  }
  return { mainS, encS, encN };
}

type BindCat = 'core' | 'venue' | 'day' | 'perf' | 'rotating';
// Classify each song of a live by its rotation binding across the show grid (venue × day-slot):
//   core    = in every show
//   venue   = exactly one venue's shows (all its days), absent at other venues
//   day     = exactly one day-slot across venues (e.g. every Day-1), absent on other day-slots
//   perf    = a single show only
//   rotating= anything else
function bindCategories(rows: { keys: Set<string>; date: string; venue: string }[]) {
  const cat = new Map<string, BindCat>();
  const n = rows.length;
  if (!n) return cat;
  const presence = new Map<string, Set<number>>();
  rows.forEach((r, i) =>
    r.keys.forEach((k) => {
      if (!presence.has(k)) presence.set(k, new Set());
      presence.get(k)!.add(i);
    })
  );
  const venueShows = new Map<string, Set<number>>();
  rows.forEach((r, i) => {
    if (!venueShows.has(r.venue)) venueShows.set(r.venue, new Set());
    venueShows.get(r.venue)!.add(i);
  });
  const dayIdx: number[] = Array.from({ length: n });
  for (const idxs of venueShows.values())
    [...idxs]
      .sort((a, b) => rows[a].date.localeCompare(rows[b].date))
      .forEach((idx, di) => (dayIdx[idx] = di));
  const dayShows = new Map<number, Set<number>>();
  rows.forEach((_, i) => {
    const d = dayIdx[i];
    if (!dayShows.has(d)) dayShows.set(d, new Set());
    dayShows.get(d)!.add(i);
  });
  const eq = (a: Set<number>, b: Set<number>) => a.size === b.size && [...a].every((x) => b.has(x));
  const venueSets = [...venueShows.values()];
  const daySets = [...dayShows.values()];
  const multiVenue = venueShows.size >= 2;
  const multiDay = dayShows.size >= 2;
  for (const [k, S] of presence) {
    if (S.size === n) cat.set(k, 'core');
    else if (multiVenue && venueSets.some((vs) => eq(S, vs))) cat.set(k, 'venue');
    else if (multiDay && daySets.some((ds) => eq(S, ds))) cat.set(k, 'day');
    else if (S.size === 1) cat.set(k, 'perf');
    else cat.set(k, 'rotating');
  }
  return cat;
}

const artists = artistsJson as unknown as Artist[];
let songs: SongRec[] = [];
const perfs = perfsJson as unknown as Perf[];
const perfNameById = new Map(perfs.map((p) => [p.id, p.performanceName] as const));
const seriesInfo = seriesJson as unknown as { id: string; name: string; color: string }[];
const extraById = extraJson as unknown as Record<
  string,
  { performanceName?: string; concertName?: string; tourType?: string }
>;
const perfName = (id: string, date: string) => {
  const e = extraById[id];
  return (
    perfNameById.get(id) || [e?.concertName, e?.performanceName].filter(Boolean).join(' ') || date
  );
};

const MAIN_GROUP: Record<string, string> = {
  '1': "μ's",
  '33': 'Aqours',
  '60': 'Nijigasaki',
  '91': 'Liella!',
  '127': 'School Idol Musical',
  '133': 'Hasunosora',
  '166': 'Yohane',
  '213': 'Ikizurai-bu!'
};
const seriesName: Record<string, string> = {
  '1': "μ's",
  '2': 'Aqours',
  '3': 'Nijigasaki',
  '4': 'Liella!',
  '5': 'Musical',
  '6': 'Hasunosora',
  '7': 'Yohane',
  '8': 'Ikizurai-bu!'
};
const seriesColor: Record<string, string> = Object.fromEntries(
  seriesInfo.map((s) => [s.id, s.color])
);

type ArtistType = 'solo' | 'subunit' | 'group' | 'collab';
function classify(a: Artist): ArtistType {
  if (a.seriesIds.length > 1) return 'collab';
  if (a.characters.length <= 1) return 'solo';
  if (MAIN_GROUP[a.id]) return 'group';
  return 'subunit';
}
const artistType = new Map(artists.map((a) => [a.id, classify(a)] as const));

let songById = new Map<string, SongRec>();
function songArtistType(songId: string): ArtistType | 'unknown' {
  const s = songById.get(songId);
  if (!s || !s.artists?.length) return 'unknown';
  const types = s.artists.map((ar) => artistType.get(ar.id)).filter(Boolean) as ArtistType[];
  if (!types.length) return 'unknown';
  for (const r of ['group', 'collab', 'subunit', 'solo'] as ArtistType[])
    if (types.includes(r)) return r;
  return 'unknown';
}

type Occ = { key: string; w: number; t: string; sec: 'main' | 'encore' };
function songOccs(sl: Setlist): Occ[] {
  const secType: string[] = Array.from({ length: sl.items.length }, () => 'main');
  if (sl.sections?.length)
    for (const sec of sl.sections)
      for (let i = sec.startIndex; i <= sec.endIndex && i < secType.length; i++)
        secType[i] = sec.type;
  const out: Occ[] = [];
  for (let i = 0; i < sl.items.length; i++) {
    const it = sl.items[i];
    if (it.type === 'song' && it.songId)
      out.push({
        key: 's:' + it.songId,
        w: songWeight(it),
        t: songArtistType(it.songId),
        sec: secType[i] === 'encore' ? 'encore' : 'main'
      });
  }
  return out;
}

const setlistByPerf = new Map<string, Setlist>();
export function populateSongs(data: SongData) {
  if (songById.size) return;
  songs = data.songs as unknown as SongRec[];
  songById = new Map(songs.map((s) => [s.id, s]));
  for (const s of songs) songCensus[songArtistType(s.id)]++;
}

export function populateSetlists(obj: Record<string, Setlist>) {
  if (setlistByPerf.size) return;
  for (const k of Object.keys(obj)) {
    const sl = obj[k];
    setlistByPerf.set(String(sl.performanceId), sl);
  }
  tourStats = computeTourStats();
}

function songKeys(sl: Setlist): string[] {
  const out: string[] = [];
  for (const it of sl.items) if (it.type === 'song' && it.songId) out.push('s:' + it.songId);
  return out;
}

// Analysis emits only IDs + numbers. Names/localization are resolved by the presentation layer.
const songIdOf = (k: string): string => k.slice(2);
const typeOfKey = (k: string): string => songArtistType(k.slice(2));

const ACTS: { name: string; type: ArtistType; tokens: string[] }[] = [
  { name: "μ's", type: 'group', tokens: ["μ's"] },
  { name: 'Aqours', type: 'group', tokens: ['Aqours'] },
  { name: 'Nijigasaki', type: 'group', tokens: ['虹ヶ咲学園スクールアイドル同好会', 'ニジガク'] },
  { name: 'Liella!', type: 'group', tokens: ['Liella!'] },
  { name: 'Hasunosora', type: 'group', tokens: ['蓮ノ空女学院スクールアイドルクラブ'] },
  { name: 'School Idol Musical', type: 'group', tokens: ['スクールアイドルミュージカル'] },
  { name: 'Yohane', type: 'group', tokens: ['幻日のヨハネ'] },
  { name: 'Ikizurai-bu!', type: 'group', tokens: ['いきづらい部！'] }
];
function detectHeadliner(tourName: string): { name: string; type: ArtistType } | null {
  for (const a of ACTS)
    for (const t of a.tokens) if (tourName.includes(t)) return { name: a.name, type: a.type };
  return null;
}

type TourStat = {
  tour: string;
  seriesIds: string[];
  group: string;
  headliner: string | null;
  from: string;
  nShows: number;
  legs: number;
  avgLen: number;
  coreShare: number;
  meanJaccard: number;
  changeRate: number;
  changeDays: number | null;
  changeLegs: number | null;
  dayPairs: number;
  legPairs: number;
  comp: Record<string, number>;
  isFlagship: boolean;
  liveCat: LiveCat | null;
};

const tours = new Map<string, Perf[]>();
for (const p of perfs) {
  if (!tours.has(p.tourName)) tours.set(p.tourName, []);
  tours.get(p.tourName)!.push(p);
}

// A tour's ll-fans tourType = the most common tourType across its performances.
const tourTypeByName = new Map<string, string>();
for (const [tourName, ps] of tours) {
  const counts = new Map<string, number>();
  for (const p of ps) {
    const tt = extraById[p.id]?.tourType;
    if (tt) counts.set(tt, (counts.get(tt) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestN = 0;
  for (const [tt, n] of counts) if (n > bestN) ((best = tt), (bestN = n));
  if (best) tourTypeByName.set(tourName, best);
}

function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return uni === 0 ? 1 : inter / uni;
}

let tourStats: TourStat[] = [];
function computeTourStats(): TourStat[] {
  const out: TourStat[] = [];
  for (const [tourName, ps] of tours) {
    const withSet = ps.filter((p) => setlistByPerf.has(p.id));
    if (!withSet.length) continue;
    const sls = withSet.map((p) => setlistByPerf.get(p.id)!);
    const sets = sls.map((sl) => new Set(songKeys(sl)));
    const lens = sets.map((s) => s.size).filter((n) => n > 0);
    if (!lens.length) continue;

    const counts = new Map<string, number>();
    for (const s of sets) for (const x of s) counts.set(x, (counts.get(x) || 0) + 1);
    const nShows = sets.filter((s) => s.size > 0).length;
    const core = [...counts.values()].filter((c) => c === nShows).length;
    const avgLen = lens.reduce((a, b) => a + b, 0) / lens.length;

    const idx: number[] = [];
    for (let i = 0; i < sets.length; i++) if (sets[i].size > 0) idx.push(i);
    let jSum = 0,
      jN = 0;
    for (let a = 0; a < idx.length; a++)
      for (let b = a + 1; b < idx.length; b++) {
        jSum += jaccard(sets[idx[a]], sets[idx[b]]);
        jN++;
      }
    const meanJaccard = jN ? jSum / jN : 1;

    const venueGroups = new Map<string, number[]>();
    for (const i of idx) {
      const v = withSet[i].venue || '?';
      if (!venueGroups.has(v)) venueGroups.set(v, []);
      venueGroups.get(v)!.push(i);
    }
    let jDay = 0,
      nDay = 0;
    for (const grp of venueGroups.values())
      for (let a = 0; a < grp.length; a++)
        for (let b = a + 1; b < grp.length; b++) {
          jDay += jaccard(sets[grp[a]], sets[grp[b]]);
          nDay++;
        }
    const reps = [...venueGroups.values()].map((grp) => grp[0]);
    let jLeg = 0,
      nLeg = 0;
    for (let a = 0; a < reps.length; a++)
      for (let b = a + 1; b < reps.length; b++) {
        jLeg += jaccard(sets[reps[a]], sets[reps[b]]);
        nLeg++;
      }
    const simDays = nDay ? jDay / nDay : null;
    const simLegs = nLeg ? jLeg / nLeg : null;

    const comp: Record<string, number> = { group: 0, subunit: 0, solo: 0, collab: 0, unknown: 0 };
    for (const sl of sls) for (const o of songOccs(sl)) comp[o.t] += o.w;

    const seriesIds = ps[0].seriesIds || [];
    const primarySeries = seriesIds.length === 1 ? seriesIds[0] : 'mixed';

    out.push({
      tour: tourName,
      seriesIds,
      group: seriesIds.length > 1 ? 'Mixed / Series' : seriesName[primarySeries] || 'Other',
      headliner: detectHeadliner(tourName)?.name ?? null,
      from: [...ps].map((p) => p.date).sort()[0],
      nShows,
      legs: venueGroups.size,
      avgLen: +avgLen.toFixed(1),
      coreShare: +(core / avgLen).toFixed(3),
      meanJaccard: +meanJaccard.toFixed(3),
      changeRate: +(1 - meanJaccard).toFixed(3),
      changeDays: simDays === null ? null : +(1 - simDays).toFixed(3),
      changeLegs: simLegs === null ? null : +(1 - simLegs).toFixed(3),
      dayPairs: nDay,
      legPairs: nLeg,
      comp,
      isFlagship: !!flagOf(tourName),
      liveCat: liveCatOf(!!flagOf(tourName), tourTypeByName.get(tourName))
    });
  }
  return out;
}

function agg(items: TourStat[]) {
  const w = (sel: (t: TourStat) => number) => {
    let num = 0,
      den = 0;
    for (const t of items) {
      num += sel(t) * t.nShows;
      den += t.nShows;
    }
    return den ? num / den : 0;
  };
  const pw = (sel: (t: TourStat) => number | null, wt: (t: TourStat) => number) => {
    let num = 0,
      den = 0;
    for (const t of items) {
      const v = sel(t);
      if (v === null) continue;
      num += v * wt(t);
      den += wt(t);
    }
    return den ? num / den : null;
  };
  const comp: Record<string, number> = { group: 0, subunit: 0, solo: 0, collab: 0, unknown: 0 };
  for (const t of items) for (const k of Object.keys(comp)) comp[k] += t.comp[k];
  const cd = pw(
    (t) => t.changeDays,
    (t) => t.dayPairs
  );
  const cl = pw(
    (t) => t.changeLegs,
    (t) => t.legPairs
  );
  return {
    tours: items.length,
    shows: items.reduce((a, t) => a + t.nShows, 0),
    legs: items.reduce((a, t) => a + t.legs, 0),
    changeRate: +w((t) => t.changeRate).toFixed(3),
    changeDays: cd === null ? null : +cd.toFixed(3),
    changeLegs: cl === null ? null : +cl.toFixed(3),
    coreShare: +w((t) => t.coreShare).toFixed(3),
    avgLen: +w((t) => t.avgLen).toFixed(1),
    comp
  };
}

const CANON = ["μ's", 'Aqours', 'Nijigasaki', 'Liella!', 'Hasunosora', 'Ikizurai-bu!', 'Yohane'];

const belongsToGroup = (t: TourStat, g: string) =>
  t.seriesIds.length === 1 ? seriesName[t.seriesIds[0]] === g : t.headliner === g;

const REG_QUANTILE = 0.25;
export type Song2 = { id: string; t: string };

const spinLabel = (tour: string) => {
  const s =
    tour
      .replace(
        /^ラブライブ！(サンシャイン!!|スーパースター!!|虹ヶ咲学園スクールアイドル同好会|蓮ノ空女学院スクールアイドルクラブ)?\s*/,
        ''
      )
      .replace(/^(Aqours|Liella!|μ's|いきづらい部！)\s*/, '')
      .trim() || tour;
  return s.length > 9 ? s.slice(0, 8) + '…' : s;
};

function build(cats: string[]) {
  const catSet = new Set(cats);
  const byGroup: Record<string, ReturnType<typeof agg>> = {};
  const flagByGroup: Record<string, any[]> = {};
  const flagPerfByGroup: Record<string, any[]> = {};
  const poolInfo: Record<string, any> = {};
  const allLives: TourStat[] = [];

  for (const g of CANON) {
    const lives = tourStats
      .filter((t) => t.liveCat && catSet.has(t.liveCat) && belongsToGroup(t, g))
      .map((t) => ({ t, spin: !t.isFlagship }))
      .sort((a, b) => a.t.from.localeCompare(b.t.from));
    if (!lives.length) continue;
    for (const l of lives) allLives.push(l.t);

    const aggItems = lives.filter((l) => l.t.nShows >= 2).map((l) => l.t);
    if (aggItems.length) byGroup[g] = agg(aggItems);

    const perfRows: {
      liveIdx: number;
      label: string;
      spinoff: boolean;
      date: string;
      leg: string;
      showInLive: number;
      pid: string;
      name: string;
      occs: Occ[];
      keys: Set<string>;
      mainW: number;
      encW: number;
      encN: number;
      mc: number;
      vtr: number;
    }[] = [];
    lives.forEach(({ t: live, spin }, li) => {
      const lbl = spin ? spinLabel(live.tour) : liveLabel(live.tour);
      const ps = (tours.get(live.tour) || [])
        .filter((p) => setlistByPerf.has(p.id))
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      ps.forEach((p, si) => {
        const sl = setlistByPerf.get(p.id)!;
        const occs = songOccs(sl);
        let mainW = 0,
          encW = 0;
        for (const o of occs)
          if (o.sec === 'encore') encW += o.w;
          else mainW += o.w;
        perfRows.push({
          liveIdx: li,
          label: lbl,
          spinoff: spin,
          date: p.date,
          leg: `${li}|${p.venue || '?'}`,
          showInLive: si + 1,
          pid: p.id,
          name: perfName(p.id, p.date),
          occs,
          keys: new Set(occs.map((o) => o.key)),
          mainW,
          encW,
          encN: sectionStats(sl).encN,
          mc: sl.items.filter((it) => it.type === 'mc').length,
          vtr: sl.items.filter((it) => it.type === 'vtr').length
        });
      });
    });

    const legsOf = new Map<string, Set<string>>();
    for (const r of perfRows)
      for (const k of r.keys) {
        let set = legsOf.get(k);
        if (!set) {
          set = new Set();
          legsOf.set(k, set);
        }
        set.add(r.leg);
      }
    const count = new Map([...legsOf].map(([k, set]) => [k, set.size] as const));
    const ranked = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const K = Math.ceil(ranked.length * REG_QUANTILE);
    const regulars = new Set(ranked.slice(0, K).map(([k]) => k));
    poolInfo[g] = {
      pool: ranked.length,
      regulars: regulars.size,
      minLegsForRegular: K ? ranked[K - 1][1] : 0,
      ranked: ranked.map(([k, legs], i) => ({
        id: songIdOf(k),
        legs,
        t: typeOfKey(k),
        regular: i < K
      }))
    };

    const debutLive = new Map<string, number>();
    perfRows.forEach((r) => {
      for (const k of r.keys) if (!debutLive.has(k)) debutLive.set(k, r.liveIdx);
    });

    // per-live rotation-binding categories (core / venue / day / perf / rotating)
    const bindByLive = new Map<number, Map<string, BindCat>>();
    lives.forEach((_, li) => {
      const rows = perfRows
        .filter((r) => r.liveIdx === li)
        .map((r) => ({ keys: r.keys, date: r.date, venue: r.leg }));
      bindByLive.set(li, bindCategories(rows));
    });

    flagPerfByGroup[g] = perfRows.map((r) => {
      const bind = bindByLive.get(r.liveIdx)!;
      let nw = 0,
        reg = 0,
        ret = 0;
      const bw: Record<BindCat, number> = { core: 0, venue: 0, day: 0, perf: 0, rotating: 0 };
      const comp: Record<string, number> = { group: 0, subunit: 0, solo: 0, collab: 0, unknown: 0 };
      for (const o of r.occs) {
        if (debutLive.get(o.key) === r.liveIdx) nw += o.w;
        else if (regulars.has(o.key)) reg += o.w;
        else ret += o.w;
        bw[bind.get(o.key) ?? 'rotating'] += o.w;
        comp[o.t] += o.w;
      }
      return {
        group: g,
        pid: r.pid,
        date: r.date,
        liveLabel: r.label,
        name: r.name,
        liveIdx: r.liveIdx,
        showInLive: r.showInLive,
        flow: buildFlow(setlistByPerf.get(r.pid)!),
        performed: nw + reg + ret,
        new: nw,
        regular: reg,
        returnee: ret,
        core: bw.core,
        venueU: bw.venue,
        dayU: bw.day,
        perfU: bw.perf,
        rotating: bw.rotating,
        main: r.mainW,
        encore: r.encW,
        comp,
        spinoff: r.spinoff
      };
    });

    flagByGroup[g] = lives.map(({ t: live, spin }, li) => {
      const liveRows = perfRows.filter((r) => r.liveIdx === li);
      const union = new Set<string>();
      liveRows.forEach((r) => r.keys.forEach((k) => union.add(k)));
      const sh = liveRows.length || 1;
      const bind = bindByLive.get(li)!;
      const newSongs: Song2[] = [],
        returneeSongs: Song2[] = [],
        regularSongs: Song2[] = [];
      const bindSongs: Record<BindCat, Song2[]> = {
        core: [],
        venue: [],
        day: [],
        perf: [],
        rotating: []
      };
      for (const k of union) {
        const s2: Song2 = { id: songIdOf(k), t: typeOfKey(k) };
        if (debutLive.get(k) === li) newSongs.push(s2);
        else if (regulars.has(k)) regularSongs.push(s2);
        else returneeSongs.push(s2);
        bindSongs[bind.get(k) ?? 'rotating'].push(s2);
      }
      return {
        group: g,
        tour: live.tour,
        label: spin ? spinLabel(live.tour) : liveLabel(live.tour),
        date: live.from,
        shows: live.nShows,
        performed: union.size,
        new: newSongs.length,
        regular: regularSongs.length,
        returnee: returneeSongs.length,
        mainPerShow: +(liveRows.reduce((a, r) => a + r.mainW, 0) / sh).toFixed(1),
        encorePerShow: +(liveRows.reduce((a, r) => a + r.encW, 0) / sh).toFixed(1),
        encoresPerShow: +(liveRows.reduce((a, r) => a + r.encN, 0) / sh).toFixed(1),
        mcPerShow: +(liveRows.reduce((a, r) => a + r.mc, 0) / sh).toFixed(1),
        vtrPerShow: +(liveRows.reduce((a, r) => a + r.vtr, 0) / sh).toFixed(1),
        newShare: union.size ? +(newSongs.length / union.size).toFixed(3) : 0,
        newSongs,
        returneeSongs,
        regularSongs,
        bindSongs,
        spinoff: spin
      };
    });

    flagPerfByGroup[g].sort(
      (a, b) => a.date.localeCompare(b.date) || a.liveIdx - b.liveIdx || a.showInLive - b.showInLive
    );
    flagByGroup[g].sort((a, b) => a.date.localeCompare(b.date));
  }

  const meta = {
    totalSetlists: setlistByPerf.size,
    numberedLives: allLives.length,
    numberedShows: allLives.reduce((a, t) => a + t.nShows, 0),
    numberedAnalyzed: allLives.filter((t) => t.nShows >= 2).length,
    totalSongs: songs.length
  };
  const numberedTours = allLives.slice().sort((a, b) => a.from.localeCompare(b.from));
  return { meta, byGroup, poolInfo, flagByGroup, flagPerfByGroup, numberedTours };
}

const artistCensus: Record<string, number> = { solo: 0, subunit: 0, group: 0, collab: 0 };
for (const t of artistType.values()) artistCensus[t]++;
const songCensus: Record<string, number> = { group: 0, subunit: 0, solo: 0, collab: 0, unknown: 0 };

const GROUP_COLOR: Record<string, string> = {
  "μ's": seriesColor['1'],
  Aqours: seriesColor['2'],
  Nijigasaki: seriesColor['3'],
  'Liella!': seriesColor['4'],
  Hasunosora: seriesColor['6'],
  Yohane: seriesColor['7'],
  'School Idol Musical': seriesColor['5'],
  'Ikizurai-bu!': seriesColor['8']
};

export const makeAnalysis = (cats: string[]) => ({
  ...build(cats),
  canon: CANON,
  liveCats: LIVE_CATS,
  groupColor: GROUP_COLOR,
  songCensus,
  artistCensus
});

export type AnalysisResults = ReturnType<typeof makeAnalysis>;

const analysisCache: Record<string, AnalysisResults> = {};
export const loadAnalysis = async (cats: string[] = ['numbered']): Promise<AnalysisResults> => {
  const key = [...cats].sort().join(',') || 'none';
  if (!analysisCache[key]) {
    populateSongs(await loadSongData());
    const { all } = await loadSetlists();
    populateSetlists(all);
    analysisCache[key] = makeAnalysis(cats);
  }
  return analysisCache[key];
};
