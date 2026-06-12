import { describe, expect, it } from 'vitest';
import type { Performance, Song } from '~/types';
import { getMyPickColumnYears } from '../mypick-years';

const song = (releasedOn?: string): Song =>
  ({
    id: releasedOn ?? 'missing',
    name: releasedOn ?? 'missing',
    releasedOn,
    artists: [],
    seriesIds: []
  }) as Song;

const performance = (date: string): Performance =>
  ({
    id: date,
    tourName: date,
    date,
    venue: '',
    seriesIds: [],
    status: 'completed',
    hasSetlist: false,
    category: 'live'
  }) as Performance;

describe('getMyPickColumnYears', () => {
  it('returns a continuous descending range from song and performance dataset dates', () => {
    expect(
      getMyPickColumnYears(
        [song('2012-08-25'), song('bad'), song()],
        [performance('2010-01-01'), performance('2014-12-31')]
      )
    ).toEqual(['2014', '2013', '2012', '2011', '2010']);
  });

  it('does not invent years when the dataset has none', () => {
    expect(getMyPickColumnYears([song()], [])).toEqual([]);
  });
});
