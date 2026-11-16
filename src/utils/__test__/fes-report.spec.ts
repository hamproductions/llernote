import { describe, expect, it } from 'vitest';
import performanceInfo from '../../../data/performance-info.json';
import setlistJson from '../../../data/performance-setlists.json';
import songJson from '../../../data/song-info.json';
import artistJson from '../../../data/artists-info.json';
import characterJson from '../../../data/character-info.json';
import lineupJson from '../../../data/performance-lineups.json';
import overrideJson from '../../../data/show-overrides.json';
import {
  OTHERS,
  buildFesDay,
  deriveFes,
  diffFesDays,
  gini,
  membersFromRemark,
  originalSongType,
  songWeight,
  type FesContext,
  type FesLineup,
  type FesOverrides,
  type FesSong
} from '../fes-report';
import type { Artist, Character, Performance, Setlist, Song } from '~/types';

const characters = characterJson as unknown as Character[];
const artists = artistJson as unknown as Artist[];
const songs = songJson as unknown as Song[];
const ctx: FesContext = {
  songById: new Map(songs.map((s) => [s.id, s])),
  artistById: new Map(artists.map((a) => [a.id, a])),
  characterById: new Map(characters.map((c) => [c.id, c])),
  characters,
  lineups: lineupJson as Record<string, FesLineup>,
  overrides: overrideJson as FesOverrides
};
const performance = (id: string) =>
  (performanceInfo as unknown as Performance[]).find((p) => p.id === id)!;
const setlist = (id: string) => (setlistJson as unknown as Record<string, Setlist>)[id]!;
const day = (id: string, index: number) =>
  buildFesDay(performance(id), setlist(id), `Day ${index + 1}`, index, ctx);
const round = (v: number) => Math.round(v * 100) / 100;

describe('songWeight', () => {
  it('weights by how much of the song is played', () => {
    expect(songWeight('')).toBe(1);
    expect(songWeight('Movie Edit｜出演者全員')).toBe(1);
    expect(songWeight('メドレー・ショート Ver.')).toBe(0.3);
    expect(songWeight('TVサイズ')).toBe(0.5);
    expect(songWeight('Movieサイズ')).toBe(0.5);
    expect(songWeight('ショート Ver. (1番→ラスサビ)')).toBe(0.75);
    expect(songWeight('ショート Ver.')).toBe(0.5);
  });
});

describe('membersFromRemark', () => {
  const id = (name: string) =>
    characters.find((c) => c.fullName.replace(/\s/g, '').includes(name))!.id;
  it('reads given names', () => {
    expect(membersFromRemark('千歌、梨子、曜 Ver.', characters, undefined)).toEqual([
      id('高海千歌'),
      id('桜内梨子'),
      id('渡辺曜')
    ]);
  });
  it('reads the list after ｜ even without Ver.', () => {
    const ids = membersFromRemark("ショート Ver.｜Aqours、μ's", characters, undefined)!;
    expect(ids).toHaveLength(characters.filter((c) => ['1', '2'].includes(c.seriesId)).length);
  });
  it('returns nothing for format words and free text', () => {
    expect(membersFromRemark('メドレー・ショート Ver.', characters, undefined)).toBeUndefined();
    expect(membersFromRemark('アニメ映像', characters, undefined)).toBeUndefined();
    expect(membersFromRemark('', characters, undefined)).toBeUndefined();
  });
});

describe('originalSongType', () => {
  const type = (name: string) =>
    originalSongType(songs.find((s) => s.name === name)!, ctx.artistById);
  it('uses the credited artist, not who performed it', () => {
    expect(type('Snow halation')).toBe('group');
    expect(type('smile smile ship Start!')).toBe('group');
    expect(type('アイシイ')).toBe('unit');
    expect(type('夢への一歩')).toBe('solo');
    expect(type('NEXT CARD')).toBe('cross');
    expect(type('きらりひらり舞う桜')).toBe('guest');
  });
});

describe('gini', () => {
  it('is 0 when everyone is equal and grows with concentration', () => {
    expect(gini([3, 3, 3])).toBe(0);
    expect(gini([0, 0, 9])).toBeGreaterThan(0.6);
    expect(gini([])).toBe(0);
  });
});

describe('diffFesDays', () => {
  const s = (songId: string, no: number): FesSong => ({
    key: songId,
    songId,
    name: songId,
    remarks: '',
    day: 0,
    no,
    weight: 1,
    members: [],
    collab: false,
    type: 'group',
    billed: '1',
    mix: {}
  });
  it('counts only dropped songs as changes; moving a song is not a change', () => {
    const diff = diffFesDays(
      ['a', 'b', 'c', 'd'].map((x, i) => s(x, i + 1)),
      ['c', 'a', 'e', 'd'].map((x, i) => s(x, i + 1))
    );
    expect(diff.dropped.map((x) => x.songId)).toEqual(['b']);
    expect(diff.added.map((x) => x.songId)).toEqual(['e']);
    expect(diff.repeated.map((r) => r.from.songId)).toEqual(['a', 'c', 'd']);
    expect(diff.repeated.find((r) => r.from.songId === 'd')!.inOrder).toBe(true);
    expect(diff.repeated.filter((r) => !r.inOrder)).toHaveLength(1);
  });
});

// Numbers below were verified three ways (analysis script, a separate audit script that rebuilds every
// song from the raw data, and an independent recount).
describe('LoveLive! Series 15th Anniversary ラブライブ！フェス', () => {
  const d1 = day('756', 0);
  const d2 = day('757', 1);
  const all = deriveFes([d1], ctx.characterById);

  it('uses the official lineup: 55 performers + 10 guests', () => {
    expect(d1.lineup).toHaveLength(65);
    expect(all.performers).toHaveLength(65);
  });

  it('Day 1 song time', () => {
    expect(d1.songs).toHaveLength(50);
    expect(round(all.weighted)).toBe(40.45);
    const time = Object.fromEntries(all.songTime.map((r) => [r.series, round(r.weight)]));
    expect(time).toEqual({
      '4': 7.75,
      '3': 7.5,
      '1': 6.5,
      '8': 5.5,
      '6': 5.5,
      '2': 4.5,
      [OTHERS]: 2,
      '5': 1.2
    });
  });

  it('bills NEXT CARD and 愛♡スクリ～ム! to Others', () => {
    expect(d1.songs.filter((s) => s.billed === OTHERS).map((s) => s.name)).toEqual([
      'NEXT CARD',
      '愛♡スクリ～ム！'
    ]);
  });

  it('Day 1 original song types', () => {
    const types = Object.fromEntries(all.types.map((t) => [t.type, round(t.weight)]));
    expect(types).toEqual({ group: 29.75, unit: 4, solo: 3.5, cross: 2, guest: 1.2 });
  });

  it('Day 1 collab share', () => {
    expect(round(all.collab.songShare)).toBe(0.23);
    expect(round(all.collab.castShare)).toBe(0.44);
  });

  it('applies the hand correction for WE WILL!!', () => {
    expect(d1.songs.find((s) => s.name === 'WE WILL!!')!.weight).toBe(0.75);
  });

  it('Day 2: Movieサイズ counts half, TOKIMEKI Runners has the whole lineup', () => {
    const circle = d2.songs.find((s) => s.name === 'Circle of Love')!;
    expect(circle.weight).toBe(0.5);
    expect(d2.songs.find((s) => s.name === 'TOKIMEKI Runners')!.members).toHaveLength(55);
    expect(round(deriveFes([d2], ctx.characterById).weighted)).toBe(39.7);
  });

  it('Dream Believers is the whole 102〜105期生 and アイシイ is DOLLCHESTRA B.G.P.', () => {
    expect(d1.songs.find((s) => s.name === 'Dream Believers')!.members).toHaveLength(11);
    expect(d1.songs.find((s) => s.name === 'アイシイ')!.members).toHaveLength(3);
  });

  it('Day 1 → Day 2: 24 repeated, 26 dropped, 25 new', () => {
    const diff = diffFesDays(d1.songs, d2.songs);
    expect([diff.repeated.length, diff.dropped.length, diff.added.length]).toEqual([24, 26, 25]);
    expect(diff.sameNumber).toBe(0);
  });

  it('active franchises with the all-cast songs hidden', () => {
    const d = deriveFes([d1, d2], ctx.characterById, {
      activeSeries: ['3', '4', '6', '8'],
      hideEnsembleAt: 50
    });
    const push = Object.fromEntries(d.push.map((r) => [r.series, round(r.avg)]));
    expect(push['4']).toBeGreaterThan(push['3']!);
    expect(push['6']).toBeLessThan(push['8']!);
  });
});
