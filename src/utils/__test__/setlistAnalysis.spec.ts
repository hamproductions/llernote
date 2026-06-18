import { describe, it, expect } from 'vitest';
import type { Setlist, Song } from '~/types';
import { makeAnalysis, populateSetlists, populateSongs } from '~/utils/setlistAnalysis';
import type { SongData } from '~/data/songs';
import setlistsJson from '../../../data/performance-setlists.json';
import songsJson from '../../../data/song-info.json';

populateSongs({ songs: songsJson as unknown as Song[] } as SongData);
populateSetlists(setlistsJson as unknown as Record<string, Setlist>);
const ANALYSIS = makeAnalysis(false);

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
});
