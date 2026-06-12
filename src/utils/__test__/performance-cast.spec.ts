import { describe, expect, it } from 'vitest';
import type { Artist, Setlist, Song } from '~/types';
import { buildPerformanceCharacterMap } from '../performance-cast';

describe('buildPerformanceCharacterMap', () => {
  it('ignores missing character ids from artist data', () => {
    const map = buildPerformanceCharacterMap(
      {
        p1: {
          id: 'setlist-1',
          performanceId: 'p1',
          items: [{ id: 'item-1', type: 'song', position: 0, songId: 'song-1' }],
          sections: [],
          isActual: true
        } as Setlist
      },
      new Map([
        [
          'song-1',
          {
            id: 'song-1',
            name: 'Song',
            artists: [{ id: 'artist-1' }],
            seriesIds: [1]
          } as Song
        ]
      ]),
      new Map([
        [
          'artist-1',
          {
            id: 'artist-1',
            name: 'Unknown',
            characters: [null as unknown as string, '1'],
            seriesIds: [1]
          } as Artist
        ]
      ])
    );

    expect([...map.get('p1')!]).toEqual(['1']);
  });
});
