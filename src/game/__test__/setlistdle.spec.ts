import { describe, expect, it } from 'vitest';
import {
  answerPool,
  buildHints,
  buildPool,
  buildShareText,
  compareFacts,
  dailyIndex,
  dayNumber,
  factsOf
} from '~/game/setlistdle';
import type { Performance, Setlist, SetlistItem } from '~/types';

const FAN = new Set(['fanmeeting']);

const perf = (over: Partial<Performance>): Performance => ({
  id: '1',
  tourName: 'Tour',
  date: '2020-01-01',
  venue: 'V',
  seriesIds: ['1'],
  status: 'completed',
  hasSetlist: true,
  category: 'live',
  tourType: 'ライブ・ファンミ',
  ...over
});

const song = (i: number): SetlistItem => ({
  id: `s${i}`,
  type: 'song',
  position: i,
  songId: String(100 + i),
  customSongName: `Song ${i}`
});

const setlist = (over: Partial<Setlist> & { n?: number }): Setlist => {
  const n = over.n ?? 5;
  const items = over.items ?? Array.from({ length: n }, (_, i) => song(i));
  return {
    id: `setlist-${over.performanceId ?? '1'}`,
    performanceId: over.performanceId ?? '1',
    items,
    sections: over.sections ?? [
      { name: 'Main', startIndex: 0, endIndex: items.length - 1, type: 'main' }
    ],
    isActual: true
  };
};

const noRegion = () => undefined;
const facts = (p: Partial<Performance>, sl: Partial<Setlist> & { n?: number }, region = noRegion) =>
  factsOf(perf(p), setlist({ performanceId: p.id ?? '1', ...sl }), region);

describe('dailyIndex / dayNumber', () => {
  it('is deterministic, in range, varies by date and salt', () => {
    expect(dailyIndex('2026-06-19', 10)).toBe(dailyIndex('2026-06-19', 10));
    expect(dailyIndex('2026-06-19', 1000)).not.toBe(dailyIndex('2026-06-20', 1000));
    expect(dailyIndex('2026-06-19', 1000)).not.toBe(dailyIndex('2026-06-19', 1000, '#p1'));
    expect(dailyIndex('2026-06-19', 0)).toBe(0);
  });
  it('counts days from epoch', () => {
    expect(dayNumber('2026-06-01')).toBe(1);
    expect(dayNumber('2026-06-19')).toBe(19);
  });
});

describe('buildPool / answerPool', () => {
  const performances = [
    perf({ id: 'a', tourName: 'TourA', date: '2020-01-01' }),
    perf({ id: 'b', tourName: 'TourB', date: '2021-01-01' }),
    perf({ id: 'c', tourName: 'TourC', date: '2019-01-01' }),
    perf({ id: 'tiny', tourName: 'TourD', date: '2018-01-01' })
  ];
  const setlists: Record<string, Setlist> = {
    a: setlist({ performanceId: 'a', n: 5 }),
    b: setlist({ performanceId: 'b', n: 5 }),
    c: setlist({ performanceId: 'c', n: 6 }),
    tiny: setlist({ performanceId: 'tiny', n: 2 })
  };

  it('pool keeps every setlisted show (all legs) numbered chronologically', () => {
    const pool = buildPool(performances, setlists, FAN);
    expect(pool.map((e) => e.performance.id)).toEqual(['tiny', 'c', 'a', 'b']);
    expect(pool.map((e) => e.number)).toEqual([1, 2, 3, 4]);
  });

  it('answer pool drops tiny setlists and cross-tour identical setlists', () => {
    const pool = buildPool(performances, setlists, FAN);
    expect(answerPool(pool).map((e) => e.performance.id)).toEqual(['c']);
  });

  it('pool drops mc-only setlists', () => {
    const onlyMc = {
      mc: setlist({
        performanceId: 'mc',
        items: [{ id: 'm', type: 'mc', position: 0, title: 'MC' }]
      })
    };
    expect(buildPool([perf({ id: 'mc' })], onlyMc, FAN)).toHaveLength(0);
  });

  it('pool filters by live category', () => {
    const numbered = perf({ id: 'n', tourName: 'Aqours 5th LoveLive! ~Next SPARKLING~' });
    const sets = { n: setlist({ performanceId: 'n', n: 6 }) };
    expect(buildPool([numbered], sets, FAN)).toHaveLength(0);
    expect(buildPool([numbered], sets, new Set(['numbered']))).toHaveLength(1);
  });
});

describe('compareFacts', () => {
  const target = facts(
    { id: 't', date: '2022-07-01', seriesIds: ['2'] },
    {
      n: 12,
      sections: [
        { name: 'Main', startIndex: 0, endIndex: 9, type: 'main' },
        { name: 'Encore', startIndex: 10, endIndex: 11, type: 'encore' }
      ]
    }
  );

  it('flags an exact match', () => {
    const r = compareFacts(target, target);
    expect(r.correct).toBe(true);
    expect([r.series, r.year, r.songs, r.month].map((a) => a.status)).toEqual([
      'hit',
      'hit',
      'hit',
      'hit'
    ]);
  });

  it('year is amber within one year, with direction toward the target', () => {
    const near = compareFacts(
      facts({ id: 'g', date: '2021-07-01', seriesIds: ['2'] }, { n: 12 }),
      target
    );
    expect(near.year).toEqual({ status: 'partial', dir: 'up' });
    const far = compareFacts(facts({ id: 'g', date: '2018-07-01' }, { n: 12 }), target);
    expect(far.year).toEqual({ status: 'miss', dir: 'up' });
  });

  it('month is cyclic with no arrow (Dec↔Jan adjacent)', () => {
    const target1 = facts({ id: 't1', date: '2022-01-01' }, { n: 6 });
    expect(compareFacts(facts({ id: 'g', date: '2020-12-01' }, { n: 6 }), target1).month).toEqual({
      status: 'partial'
    });
    expect(
      compareFacts(facts({ id: 'g', date: '2020-06-01' }, { n: 6 }), target1).month.status
    ).toBe('miss');
  });

  it('unknown prefecture never reads as a match', () => {
    const r = compareFacts(facts({ id: 'g', date: '2022-07-01' }, { n: 12 }), target);
    expect(r.region.status).toBe('miss');
  });

  it('same prefecture hits, same region group is partial', () => {
    const region = (p: Performance) =>
      p.id === 'tokyo' ? '東京都' : p.id === 'chiba' ? '千葉県' : '大阪府';
    const tgt = factsOf(
      perf({ id: 'tokyo', date: '2022-07-01' }),
      setlist({ performanceId: 'tokyo', n: 12 }),
      region
    );
    const same = factsOf(
      perf({ id: 'tokyo2', date: '2022-07-01' }),
      setlist({ performanceId: 'tokyo2', n: 12 }),
      () => '東京都'
    );
    const grp = factsOf(
      perf({ id: 'chiba', date: '2022-07-01' }),
      setlist({ performanceId: 'chiba', n: 12 }),
      region
    );
    const far = factsOf(
      perf({ id: 'osaka', date: '2022-07-01' }),
      setlist({ performanceId: 'osaka', n: 12 }),
      region
    );
    expect(compareFacts(same, tgt).region.status).toBe('hit');
    expect(compareFacts(grp, tgt).region.status).toBe('partial');
    expect(compareFacts(far, tgt).region.status).toBe('miss');
  });

  it('series overlap is partial, song count amber within two', () => {
    const r = compareFacts(
      facts({ id: 'g', date: '2022-01-01', seriesIds: ['1', '2'] }, { n: 13 }),
      target
    );
    expect(r.series.status).toBe('partial');
    expect(r.songs.status).toBe('partial');
  });
});

describe('buildHints', () => {
  it('extracts mc text, first song and full list', () => {
    const items: SetlistItem[] = [
      song(0),
      { id: 'mc1', type: 'mc', position: 1, title: 'MC①', remarks: 'トーク' },
      song(2),
      { id: 'v', type: 'vtr', position: 3, title: '幕間', remarks: 'アニメ' },
      song(4)
    ];
    const sl = setlist({
      performanceId: 'h',
      items,
      sections: [{ name: 'Main', startIndex: 0, endIndex: 4, type: 'main' }]
    });
    const h = buildHints(sl, (it) => it.customSongName ?? '?');
    expect(h.mcContents).toContain('MC① — トーク');
    expect(h.firstSong).toBe('Song 0');
    expect(h.songList).toEqual(['Song 0', 'Song 2', 'Song 4']);
  });
});

describe('buildShareText', () => {
  it('renders a 5-column emoji grid with score', () => {
    const target = facts({ id: 't' }, {});
    const guess = facts({ id: 'g', seriesIds: ['9'], date: '2099-01-01' }, { n: 30 });
    const text = buildShareText(
      7,
      [compareFacts(guess, target), compareFacts(target, target)],
      true,
      5
    );
    expect(text.startsWith('SetlistDle #7 2/5')).toBe(true);
    expect(text).toContain('🟩🟩🟩🟩🟩');
    expect(text).not.toContain('🟩🟩🟩🟩🟩🟩');
  });
});
