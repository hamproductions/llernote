import { describe, it, expect } from 'vitest';
import type { Setlist, Song } from '~/types';
import {
  makeAnalysis,
  orderSongsPerCastRows,
  populateSetlists,
  populateSongs,
  resolveArtistCharacterIds
} from '~/utils/setlistAnalysis';
import type { SongData } from '~/data/songs';
import setlistsJson from '../../../data/performance-setlists.json';
import songsJson from '../../../data/song-info.json';

populateSongs({ songs: songsJson as unknown as Song[] } as SongData);
populateSetlists(setlistsJson as unknown as Record<string, Setlist>);
const ANALYSIS = makeAnalysis(['numbered']);

const CANON = ["μ's", 'Aqours', 'Nijigasaki', 'Liella!', 'Hasunosora', 'Ikizurai-bu!'];
const JUNK = /^(告知|ENCORE|W-ENCORE|AFTER|OP|MC|選手MC|M\d+)$|^実況席/;

describe('setlist analysis integrity', () => {
  it('covers the 6 canonical groups', () => {
    expect(ANALYSIS.canon.slice(0, CANON.length)).toEqual(CANON);
    for (const g of CANON) expect(ANALYSIS.flagByGroup[g]?.length).toBeGreaterThan(0);
  });

  it("μ's has its 6 numbered lives in order", () => {
    const labels = ANALYSIS.flagByGroup["μ's"]
      .filter((l: any) => !l.spinoff)
      .map((l: any) => l.label);
    expect(labels).toEqual(['First', 'New Year', '3rd Anniv', '→NEXT', 'Go→Go', 'Final']);
  });

  it('new + regular + returnee === performed for every live', () => {
    for (const g of CANON)
      for (const l of ANALYSIS.flagByGroup[g])
        expect(l.new + l.regular + l.returnee).toBe(l.performed);
  });

  it('numbered labels are unique per group, date-sorted, none unresolved', () => {
    for (const g of CANON) {
      const lives = ANALYSIS.flagByGroup[g].filter((l: any) => !l.spinoff);
      const labels = lives.map((l: any) => l.label);
      expect(labels).not.toContain('?');
      expect(new Set(labels).size).toBe(labels.length);
      const dates = lives.map((l: any) => l.date);
      expect(dates).toEqual([...dates].sort());
    }
  });

  it('pool contains only real songs (ids present, no MC/announcement junk)', () => {
    for (const g of CANON)
      for (const r of ANALYSIS.poolInfo[g].ranked) {
        expect(r.id).not.toBeNull();
        expect(JUNK.test(r.n)).toBe(false);
      }
  });

  it('regulars are the top 25% of the pool by legs', () => {
    for (const g of CANON) {
      const pi = ANALYSIS.poolInfo[g];
      expect(pi.regulars).toBe(Math.ceil(pi.pool * 0.25));
      const regCount = pi.ranked.filter((r: any) => r.regular).length;
      expect(regCount).toBe(pi.regulars);
    }
  });

  it('includes Hasunosora 6th numbered live (regression: stale hasSetlist flag)', () => {
    const labels = ANALYSIS.flagByGroup['Hasunosora']
      .filter((l: any) => !l.spinoff)
      .map((l: any) => l.label);
    expect(labels).toContain('6th');
  });

  it('filters lives by ll-fans tourType category', () => {
    const numbered = makeAnalysis(['numbered']);
    const fanmeeting = makeAnalysis(['fanmeeting']);
    for (const g of Object.keys(numbered.flagByGroup))
      for (const l of numbered.flagByGroup[g]) expect(l.spinoff).toBe(false);
    for (const g of Object.keys(fanmeeting.flagByGroup))
      for (const l of fanmeeting.flagByGroup[g]) expect(l.spinoff).toBe(true);
    expect((fanmeeting.flagByGroup['Hasunosora'] ?? []).length).toBeGreaterThan(0);
    expect(Object.keys(makeAnalysis([]).flagByGroup)).toHaveLength(0);
  });

  it('change/core shares are within [0,1]', () => {
    for (const g of Object.keys(ANALYSIS.byGroup)) {
      const a = ANALYSIS.byGroup[g];
      expect(a.coreShare).toBeGreaterThanOrEqual(0);
      expect(a.coreShare).toBeLessThanOrEqual(1.0001);
      for (const k of ['changeDays', 'changeLegs', 'changeRate'] as const) {
        const v = (a as any)[k];
        if (v !== null) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1.0001);
        }
      }
    }
  });

  it('builds internally consistent songs-per-cast analytics', () => {
    const { rows } = ANALYSIS.castAnalysis;
    expect(rows.length).toBeGreaterThan(50);
    for (const row of rows) {
      expect(row.songs).toBeGreaterThan(0);
      expect(row.creditedShows).toBeGreaterThan(0);
      expect(row.songsPerCreditedShow).toBeCloseTo(row.songs / row.creditedShows, 1);
      expect(row.homeSongs + row.guestSongs).toBeCloseTo(row.songs, 5);
      expect(Object.values(row.breakdown).reduce((sum, value) => sum + value, 0)).toBeCloseTo(
        row.songs,
        5
      );
      expect(
        row.appearanceRate === null || (row.appearanceRate >= 0 && row.appearanceRate <= 1)
      ).toBe(true);
    }
    expect(rows.map((row) => row.songs)).toEqual(
      rows.map((row) => row.songs).sort((a, b) => b - a)
    );
  });

  it('credits generation variants to every member in that lineup', () => {
    expect(resolveArtistCharacterIds('91', '1期生+2期生')).toEqual([
      '37',
      '38',
      '39',
      '40',
      '41',
      '42',
      '43',
      '44',
      '45'
    ]);
    const nozomi = ANALYSIS.castAnalysis.rows.find((row) => row.cast === '鈴原希実');
    expect(nozomi).toBeDefined();
    expect(nozomi?.breakdown.group).toBeGreaterThan(0);
  });

  it('maps all nine Yohane alter-egos while preserving Yohane as the home group', () => {
    const fanmeeting = makeAnalysis(['fanmeeting']);
    const yohane = fanmeeting.castAnalysis.rows.find((row) => row.cast === '小林愛香');
    expect(yohane).toBeDefined();
    expect(yohane?.homeGroups).toContain('Yohane');
    expect(yohane?.characterNames).toContain('ヨハネ');
    expect(
      fanmeeting.castAnalysis.rows.filter((row) => row.homeGroups.includes('Yohane')).length
    ).toBe(9);
  });

  it('builds home-show denominators from cast affiliations, not observed credits', () => {
    const analysis = makeAnalysis(['numbered', 'fanmeeting']);
    const kobayashi = analysis.castAnalysis.rows.find((row) => row.cast === '小林愛香');
    expect(kobayashi?.homeGroups).toEqual(['Aqours', 'Yohane']);
    expect(kobayashi?.eligibleHomeShows).toBe(
      analysis.flagPerfByGroup.Aqours.length + analysis.flagPerfByGroup.Yohane.length
    );
  });

  it('reorders and removes zero-home rows when guests are excluded', () => {
    const withoutGuests = orderSongsPerCastRows(makeAnalysis(['fes']).castAnalysis.rows, false);
    expect(withoutGuests.every((row) => row.homeSongs > 0)).toBe(true);
    expect(withoutGuests.map((row) => row.homeSongs)).toEqual(
      withoutGuests.map((row) => row.homeSongs).sort((a, b) => b - a)
    );
  });

  it('removes guest credits from both the adjusted numerator and denominator', () => {
    const analysis = makeAnalysis(['numbered', 'fes']);
    const rows = analysis.castAnalysis.rows;
    const guestSongs = rows.reduce((sum, row) => sum + row.guestSongs, 0);
    const guestShows = rows.reduce((sum, row) => sum + row.guestShows, 0);
    const homeSongs = rows.reduce((sum, row) => sum + row.homeSongs, 0);
    const homeShows = rows.reduce((sum, row) => sum + row.homeShows, 0);

    expect(analysis.castAnalysis.showsWithGuests).toBeGreaterThan(0);
    expect(guestSongs).toBeGreaterThan(0);
    expect(guestShows).toBeGreaterThan(0);
    expect(analysis.castAnalysis.avgSongsPerCastShowWithoutGuests).toBeCloseTo(
      homeSongs / homeShows,
      1
    );
  });

  it('returns no cast rows when no live categories are selected', () => {
    expect(makeAnalysis([]).castAnalysis).toMatchObject({
      rows: [],
      selectedShows: 0,
      showsWithGuests: 0,
      avgSongsPerCastShow: null,
      avgSongsPerCastShowWithoutGuests: null
    });
  });
});
