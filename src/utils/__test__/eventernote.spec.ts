import { describe, expect, it } from 'vitest';
import {
  diceSimilarity,
  matchEventernoteEvents,
  matchPerformanceToEvents,
  normalizeEventText,
  type EventernoteEvent
} from '../eventernote';
import type { Performance } from '~/types';

const performance = (
  id: string,
  tourName: string,
  date: string,
  venue: string,
  performanceName?: string
): Performance => ({
  id,
  tourName,
  date,
  venue,
  performanceName,
  seriesIds: ['2'],
  status: 'completed',
  hasSetlist: true,
  category: 'live'
});

const event = (name: string, date: string, place: string): EventernoteEvent => ({
  name,
  href: '/events/12345',
  date,
  place,
  artists: ['Aqours']
});

describe('normalizeEventText', () => {
  it('strips whitespace and punctuation', () => {
    expect(normalizeEventText('「みんな準備はできてるかい？〜せーので SUNSHINE!!〜」')).toBe(
      'みんな準備はできてるかいせーのでsunshine'
    );
  });

  it('applies NFKC, lowercase and kana folding', () => {
    expect(normalizeEventText('Ａｑｏｕｒｓ ライブ')).toBe(normalizeEventText('aqours らいぶ'));
  });
});

describe('diceSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(diceSimilarity('横浜アリーナ', '横浜アリーナ')).toBe(1);
  });

  it('handles single-char strings by equality', () => {
    expect(diceSimilarity('a', 'a')).toBe(1);
    expect(diceSimilarity('a', 'b')).toBe(0);
  });

  it('returns 0 for empty or disjoint strings', () => {
    expect(diceSimilarity('', 'abc')).toBe(0);
    expect(diceSimilarity('abcd', 'wxyz')).toBe(0);
  });

  it('scores partial overlap between 0 and 1', () => {
    const score = diceSimilarity('メルパルクホール東京', 'メルパルクホール');
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThan(1);
  });
});

describe('matchEventernoteEvents', () => {
  const tourName =
    'ラブライブ！サンシャイン!! Aqoursスペシャル課外活動 みんな準備はできてるかい？ ～せーので SUNSHINE!!～';
  const performances = [
    performance('1', tourName, '2016-01-11', 'メルパルクホール東京'),
    performance(
      '4',
      'ラブライブ！サンシャイン!! Aqours冬休み課外活動 ～みんなでシャンシャン♪ Aqoursミニライブ2016♪～',
      '2016-12-27',
      '豊洲PIT',
      '昼公演'
    ),
    performance(
      '5',
      'ラブライブ！サンシャイン!! Aqours冬休み課外活動 ～みんなでシャンシャン♪ Aqoursミニライブ2016♪～',
      '2016-12-27',
      '豊洲PIT',
      '夜公演'
    )
  ];

  it('finds a confident match despite punctuation and venue variants', () => {
    const [match] = matchEventernoteEvents(
      [
        event(
          'ラブライブ！サンシャイン!! Aqoursスペシャル課外活動「みんな準備はできてるかい？〜せーので SUNSHINE!!〜」',
          '2016-01-11(月)',
          'メルパルクホール'
        )
      ],
      performances
    );
    expect(match!.date).toBe('2016-01-11');
    expect(match!.best?.id).toBe('1');
    expect(match!.candidates[0]!.score).toBeGreaterThanOrEqual(0.45);
  });

  it('keeps close same-date candidates ambiguous without best', () => {
    const [match] = matchEventernoteEvents(
      [
        event(
          'ラブライブ！サンシャイン!! Aqours冬休み課外活動 ～みんなでシャンシャン♪ Aqoursミニライブ2016♪～',
          '2016-12-27(火)',
          '豊洲PIT'
        )
      ],
      performances
    );
    expect(match!.candidates).toHaveLength(2);
    expect(match!.best).toBeUndefined();
  });

  it('returns no candidates when the date is missing', () => {
    const [match] = matchEventernoteEvents(
      [event('なにかのイベント', '日時未定', 'どこかの会場')],
      performances
    );
    expect(match!.date).toBeUndefined();
    expect(match!.candidates).toHaveLength(0);
    expect(match!.best).toBeUndefined();
  });

  it('returns no candidates when nothing matches on the date', () => {
    const [match] = matchEventernoteEvents(
      [event('別作品のライブ', '2020-05-05', '知らない会場')],
      performances
    );
    expect(match!.date).toBe('2020-05-05');
    expect(match!.candidates).toHaveLength(0);
    expect(match!.best).toBeUndefined();
  });
});

describe('matchPerformanceToEvents', () => {
  const target = performance(
    '1',
    'ラブライブ！サンシャイン!! Aqoursスペシャル課外活動 みんな準備はできてるかい？ ～せーので SUNSHINE!!～',
    '2016-01-11',
    'メルパルクホール東京'
  );

  it('ranks same-date events first', () => {
    const results = matchPerformanceToEvents(target, [
      event('別日の似たイベント みんな準備はできてるかい？', '2017-03-03', 'メルパルクホール'),
      event(
        'ラブライブ！サンシャイン!! Aqoursスペシャル課外活動「みんな準備はできてるかい？〜せーので SUNSHINE!!〜」',
        '2016-01-11(月)',
        'メルパルクホール'
      )
    ]);
    expect(results[0]!.sameDate).toBe(true);
    expect(results[0]!.event.date).toBe('2016-01-11(月)');
    expect(results[0]!.score).toBeGreaterThanOrEqual(0.45);
  });

  it('drops unrelated events without a matching date', () => {
    const results = matchPerformanceToEvents(target, [
      event('全然関係ないアイドルの握手会', '2020-08-08', '幕張メッセ')
    ]);
    expect(results).toHaveLength(0);
  });

  it('keeps unrelated same-date events as low-score entries', () => {
    const results = matchPerformanceToEvents(target, [
      event('全然関係ないアイドルの握手会', '2016-01-11', '幕張メッセ')
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.sameDate).toBe(true);
    expect(results[0]!.score).toBeLessThan(0.45);
  });
});

describe('matchEventernoteEvents with id map', () => {
  it('uses the exact map and skips fuzzy matching', () => {
    const target = performance('99', '全然違う名前のイベント', '2016-01-11', '別会場');
    const [match] = matchEventernoteEvents(
      [event('ラブライブ！フェス', '2016-01-11', 'メルパルクホール')],
      [target],
      new Map([['12345', target]])
    );
    expect(match!.exact).toBe(true);
    expect(match!.best?.id).toBe('99');
    expect(match!.candidates[0]!.score).toBe(1);
  });

  it('matches multiple Eventernote rows on one day to distinct performances instead of reusing one best', () => {
    const day = '2025-06-21';
    const matinee = performance(
      'matinee',
      '蓮ノ空女学院スクールアイドルクラブ 4th Live',
      day,
      'Kアリーナ横浜',
      'Day.1 昼公演'
    );
    const evening = performance(
      'evening',
      '蓮ノ空女学院スクールアイドルクラブ 4th Live',
      day,
      'Kアリーナ横浜',
      'Day.1 夜公演'
    );
    const [first, second] = matchEventernoteEvents(
      [
        {
          ...event(
            '蓮ノ空女学院スクールアイドルクラブ 4th Live Day.1 昼公演',
            day,
            'Kアリーナ横浜'
          ),
          href: '/events/20001'
        },
        {
          ...event(
            '蓮ノ空女学院スクールアイドルクラブ 4th Live Day.1 夜公演',
            day,
            'Kアリーナ横浜'
          ),
          href: '/events/20002'
        }
      ],
      [matinee, evening]
    );

    expect(first!.best?.id).toBe('matinee');
    expect(second!.best?.id).toBe('evening');
  });
});
