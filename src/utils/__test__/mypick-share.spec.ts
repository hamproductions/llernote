import { compressToEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { decodeMyPick, encodeMyPick } from '../mypick-share';

describe('mypick share', () => {
  it('drops legacy unsupported columns when decoding old shared data', () => {
    const encoded = compressToEncodedURIComponent(
      JSON.stringify({
        v: 2,
        r: [['series', '1']],
        c: [['m'], ['l'], ['s', 'song'], ['y', 2026, 'event']],
        l: {}
      })
    );

    expect(decodeMyPick(encoded)?.columns).toEqual([
      { type: 'member' },
      { type: 'slot', slot: 'song' },
      { type: 'year', year: 2026, slot: 'event' }
    ]);
  });

  it('does not encode unsupported columns', () => {
    const encoded = encodeMyPick(
      { cells: {}, updatedAt: '' },
      [{ type: 'series', id: '1' }],
      [{ type: 'slot', slot: 'song' }]
    );

    expect(decodeMyPick(encoded)?.columns).toEqual([{ type: 'slot', slot: 'song' }]);
  });
});
