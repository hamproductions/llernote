import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, filterEvents, foldKana, isFutureEvent } from '../event-filter';
import { groupByTour } from '../tour';
import type { Performance } from '~/types';

const performance = (overrides: Partial<Performance> & { id: string }): Performance => ({
  tourName: `Tour ${overrides.id}`,
  date: '2024-01-01',
  venue: 'Venue',
  seriesIds: ['1'],
  status: 'completed',
  hasSetlist: false,
  category: 'live',
  ...overrides
});

const performances = [
  performance({
    id: '1',
    tourName: 'Aqours 6th LoveLive!',
    date: '2021-06-01',
    venue: 'メットライフドーム'
  }),
  performance({
    id: '2',
    tourName: 'Aqours 6th LoveLive!',
    date: '2021-06-02',
    venue: 'メットライフドーム'
  }),
  performance({
    id: '3',
    tourName: 'リエラのうた',
    date: '2022-07-01',
    seriesIds: ['4'],
    category: 'online'
  }),
  performance({
    id: '4',
    tourName: 'フェス',
    date: '2024-03-01',
    seriesIds: ['1', '4'],
    category: 'tv'
  })
];

describe('foldKana', () => {
  it('folds katakana to hiragana and lowercases', () => {
    expect(foldKana('リエラ')).toBe('りえら');
    expect(foldKana('AQOURS')).toBe('aqours');
  });
});

describe('filterEvents', () => {
  it('matches search across name and venue with kana folding', () => {
    expect(filterEvents(performances, { ...EMPTY_FILTERS, search: 'りえら' }, {})).toHaveLength(1);
    expect(
      filterEvents(performances, { ...EMPTY_FILTERS, search: 'メットライフ' }, {})
    ).toHaveLength(2);
  });

  it('filters by multiple years', () => {
    expect(
      filterEvents(performances, { ...EMPTY_FILTERS, years: ['2021', '2024'] }, {})
    ).toHaveLength(3);
  });

  it('filters by categories', () => {
    expect(
      filterEvents(performances, { ...EMPTY_FILTERS, categories: ['online', 'tv'] }, {})
    ).toHaveLength(2);
  });

  it('filters by series across multi-series events', () => {
    expect(filterEvents(performances, { ...EMPTY_FILTERS, seriesIds: ['4'] }, {})).toHaveLength(2);
  });

  it('filters by attendance status', () => {
    const map = {
      '1': {
        performanceId: '1',
        status: 'attended' as const,
        createdAt: '',
        updatedAt: ''
      }
    };
    expect(
      filterEvents(performances, { ...EMPTY_FILTERS, attendance: 'attended' }, map)
    ).toHaveLength(1);
    expect(filterEvents(performances, { ...EMPTY_FILTERS, attendance: 'none' }, map)).toHaveLength(
      3
    );
  });
});

describe('groupByTour', () => {
  it('groups legs by tour name sorted by date', () => {
    const tours = groupByTour(performances);
    expect(tours).toHaveLength(3);
    const aqours = tours.find((t) => t.tourName === 'Aqours 6th LoveLive!');
    expect(aqours?.legs.map((l) => l.id)).toEqual(['1', '2']);
    expect(aqours?.startDate).toBe('2021-06-01');
    expect(aqours?.endDate).toBe('2021-06-02');
  });

  it('sorts tours by most recent end date first', () => {
    const tours = groupByTour(performances);
    expect(tours[0]?.tourName).toBe('フェス');
  });

  it('unions series ids across legs', () => {
    const tours = groupByTour([
      performance({ id: 'a', tourName: 'T', seriesIds: ['1'] }),
      performance({ id: 'b', tourName: 'T', seriesIds: ['2'] })
    ]);
    expect(tours[0]?.seriesIds.sort()).toEqual(['1', '2']);
  });
});

describe('isFutureEvent', () => {
  it('classifies past and far-future dates', () => {
    expect(isFutureEvent(performance({ id: 'p', date: '2000-01-01' }))).toBe(false);
    expect(isFutureEvent(performance({ id: 'f', date: '2099-01-01' }))).toBe(true);
  });
});
