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

  it('round-trips rows, columns, and cells through the compact format', () => {
    const rows = [
      { type: 'series', id: '1' },
      { type: 'artist', id: '23' },
      { type: 'category', id: 'group' }
    ] as const;
    const columns = [
      { type: 'member' },
      { type: 'slot', slot: 'song' },
      { type: 'year', year: 2026, slot: 'event' }
    ] as const;
    const encoded = encodeMyPick(
      { cells: { 'series:1|slot:song': '120', 'artist:23|member': '7' }, updatedAt: '' },
      [...rows],
      [...columns]
    );

    const decoded = decodeMyPick(encoded);
    expect(decoded?.rows).toEqual(rows);
    expect(decoded?.columns).toEqual(columns);
    expect(decoded?.myPick.cells).toEqual({ 'series:1|slot:song': '120', 'artist:23|member': '7' });
  });

  it('encodes a default structure-only share compactly', () => {
    const encoded = encodeMyPick(
      { cells: {}, updatedAt: '' },
      Array.from({ length: 8 }, (_, i) => ({ type: 'series' as const, id: String(i + 1) })),
      [{ type: 'member' }, { type: 'slot', slot: 'song' }, { type: 'slot', slot: 'event' }]
    );

    expect(encoded.length).toBeLessThan(45);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });
});
