import { describe, expect, it } from 'vitest';
import { decodeMyPickLive, encodeMyPickLive } from '../mypick-live-share';
import type { MyPickLiveState } from '~/types/mypick-live';

describe('mypick live share', () => {
  it('round-trips a full state through the compact format', () => {
    const state: MyPickLiveState = {
      performanceId: '264',
      awards: {
        best_song: { type: 'song', id: '120' },
        best_costume: { type: 'costume', id: 'c-99' },
        c_custom: { type: 'song', id: '7' }
      },
      unitPicks: { '23': '120', '40': '121' },
      customAwards: [{ id: 'c_custom', label: 'Best Encore' }]
    };

    const decoded = decodeMyPickLive(encodeMyPickLive(state));
    expect(decoded).toEqual(state);
  });

  it('produces URL-safe encoded output', () => {
    const encoded = encodeMyPickLive({
      performanceId: '1',
      awards: {},
      unitPicks: {},
      customAwards: []
    });
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it('returns null for empty or malformed input', () => {
    expect(decodeMyPickLive(null)).toBeNull();
    expect(decodeMyPickLive('')).toBeNull();
    expect(decodeMyPickLive('not-valid-lz-string!!!')).toBeNull();
  });
});
