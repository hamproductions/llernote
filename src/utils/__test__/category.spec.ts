import { describe, expect, it } from 'vitest';
import eventExtra from '../../../data/event-extra.json';
import { TOUR_TYPE_CATEGORY } from '~/data/core';

describe('TOUR_TYPE_CATEGORY', () => {
  it('maps every tourType present in the ll-fans data', () => {
    const extra = eventExtra as Record<string, { tourType?: string }>;
    const tourTypes = new Set(
      Object.values(extra)
        .map((entry) => entry.tourType)
        .filter((tourType): tourType is string => Boolean(tourType))
    );
    const unmapped = [...tourTypes].filter((tourType) => !(tourType in TOUR_TYPE_CATEGORY));
    expect(unmapped).toEqual([]);
  });
});
