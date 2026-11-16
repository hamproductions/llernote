/**
 * Builds data/performance-lineups.json: who was on the official lineup of each multi-franchise
 * (festival-style) performance, read from the 出演者 note LLFans keeps on the tour.
 *
 *   bun scripts/build-performance-lineups.ts
 *
 * - Named cast ("新田恵海（高坂穂乃果役）") are matched to characters by seiyuu name.
 * - A line that only names a group ("Liella!", "蓮ノ空女学院スクールアイドルクラブ（102期〜105期生）")
 *   means the largest member list the data itself has for that group (a unit variant such as
 *   `1期生〜3期生`), or the range written in the note when the data has a variant with that label.
 * - Everything after ゲスト出演 is a guest.
 * Only tours with 3+ franchises and a 出演者 note are written, so the file stays small.
 */
import { readFileSync, writeFileSync } from 'node:fs';

type Character = {
  id: string;
  seriesId: string;
  fullName: string;
  casts: { seiyuu: string }[];
  units?: { id: string; additionalInfo?: string | null }[];
};
type Artist = { id: string; name: string; characters: (string | null)[]; seriesIds: number[] };
type Tour = {
  name: string;
  note: string | null;
  seriesIds: string[];
  concerts: { performances: { id: string }[] }[];
};

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const characters = read<Character[]>('data/character-info.json');
const artists = read<Artist[]>('data/artists-info.json');
const series = read<{ id: string; name: string }[]>('data/series-info.json');
const tours = read<Tour[]>('data/raw/llfans-detailed-tours.json');

const norm = (s: string) => s.replace(/[\s　]/g, '');

const variants = new Map<string, string[]>(); // `${artistId}\0${label}` -> ids
for (const c of characters)
  for (const u of c.units ?? []) {
    if (!u.additionalInfo) continue;
    const k = `${u.id}\u0000${u.additionalInfo}`;
    variants.set(k, [...(variants.get(k) ?? []), c.id]);
  }

/** Members of a group-only lineup line. */
const groupMembers = (line: string): string[] => {
  const label = /（(\d+)期?〜(\d+)期生）/.exec(line);
  const wanted = label ? `${label[1]}〜${label[2]}期生` : undefined;
  const groupName = norm(line.slice(line.indexOf(':') + 1).replace(/（.*?）/g, ''));
  const candidates = artists.filter(
    (a) => norm(a.name) === groupName || norm(a.name).startsWith(groupName)
  );
  let best: string[] = [];
  for (const a of candidates) {
    const base = a.characters.filter((c): c is string => !!c);
    const sets = [
      base,
      ...[...variants].filter(([k]) => k.startsWith(`${a.id}\u0000`)).map(([k, v]) => ({ k, v }))
    ].map((x) => (Array.isArray(x) ? { k: '', v: x } : x));
    for (const s of sets) {
      if (wanted && s.k.endsWith(`\u0000${wanted}`)) return s.v;
      if (s.v.length > best.length) best = s.v;
    }
  }
  return best;
};

const lineupOf = (note: string) => {
  const [mainText = '', guestText = ''] = note.split('ゲスト出演');
  const named = (text: string) => {
    const t = norm(text);
    return characters
      .filter((c) => c.casts.some((x) => x.seiyuu && t.includes(norm(x.seiyuu))))
      .map((c) => c.id);
  };
  const main = new Set(named(mainText));
  for (const line of mainText.split('\n')) {
    if (!line.includes('『') || line.includes('役')) continue; // named lines are handled above
    for (const id of groupMembers(line)) main.add(id);
  }
  return { main: [...main], guests: named(guestText).filter((id) => !main.has(id)) };
};

const out: Record<string, { main: string[]; guests: string[] }> = {};
for (const tour of tours) {
  if (!tour.note?.includes('出演者') || new Set(tour.seriesIds).size < 3) continue;
  const lineup = lineupOf(tour.note);
  if (lineup.main.length === 0) continue;
  for (const c of tour.concerts) for (const p of c.performances) out[p.id] = lineup;
}
writeFileSync('data/performance-lineups.json', JSON.stringify(out) + '\n');
console.log(
  `wrote ${Object.keys(out).length} performances from ${tours.length} tours (${series.length} series)`
);
