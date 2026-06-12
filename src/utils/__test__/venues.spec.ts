import { describe, expect, it } from 'vitest';
import { buildVenueSummaries, displayVenueLocation, hasUsableVenueInfo } from '../venues';
import type { Performance, VenueInfo } from '~/types';

const performance = (
  id: string,
  date: string,
  venue: string,
  venueId?: string,
  seriesIds = ['1']
): Performance => ({
  id,
  tourName: `Event ${id}`,
  date,
  venue,
  venueId,
  seriesIds,
  status: 'completed',
  hasSetlist: true,
  category: 'live'
});

const venueInfo = new Map<string, VenueInfo>([
  [
    '53',
    {
      id: '53',
      name: '東京ガーデンシアター',
      performanceCount: 30,
      firstDate: '2020-09-12',
      lastDate: '2024-02-24',
      seriesIds: [1, 2, 3, 4],
      queries: ['東京ガーデンシアター'],
      confidence: 0.96,
      reviewRequired: false,
      address: '東京都江東区有明2-1-6',
      lat: 35.638222222,
      lng: 139.792138888,
      country: '日本',
      region: '東京都',
      locality: '江東区',
      website: 'https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/',
      candidates: []
    }
  ]
]);

describe('displayVenueLocation', () => {
  it('shows only the region for venue location', () => {
    expect(
      displayVenueLocation({
        country: '日本',
        region: '東京都',
        locality: '東京都'
      } as VenueInfo)
    ).toBe('東京都');
  });

  it('hides review-required location data', () => {
    expect(
      displayVenueLocation({
        country: '日本',
        region: '東京都',
        locality: '千代田区',
        confidence: 0.72,
        reviewRequired: true
      })
    ).toBeUndefined();
  });
});

describe('buildVenueSummaries', () => {
  it('merges enriched venue data and counts attended performances', () => {
    const summaries = buildVenueSummaries(
      [
        performance('1', '2023-01-01', '東京ガーデンシアター', '53'),
        performance('2', '2024-01-01', '東京ガーデンシアター', '53', ['2']),
        performance('3', '2024-02-01', 'Unknown Hall')
      ],
      venueInfo,
      new Set(['1'])
    );

    expect(summaries[0]).toMatchObject({
      id: '53',
      name: '東京ガーデンシアター',
      performanceCount: 2,
      attendedCount: 1,
      location: '東京都'
    });
    expect(summaries[1]).toMatchObject({
      id: 'Unknown Hall',
      name: 'Unknown Hall',
      performanceCount: 1,
      attendedCount: 0
    });
  });

  it('keeps weak enrichment as internal info without exposing location fields', () => {
    const summaries = buildVenueSummaries(
      [performance('1', '2023-01-01', 'Some Hall', 'weak')],
      new Map([
        [
          'weak',
          {
            id: 'weak',
            name: 'Some Hall',
            locality: 'Tokyo',
            region: 'Tokyo',
            country: 'Japan',
            address: 'Bad Guess',
            confidence: 0.72,
            reviewRequired: true
          }
        ]
      ])
    );

    expect(summaries[0]).toMatchObject({
      name: 'Some Hall',
      location: undefined,
      address: undefined,
      locality: undefined
    });
    expect(hasUsableVenueInfo(summaries[0].info)).toBe(false);
  });
});
