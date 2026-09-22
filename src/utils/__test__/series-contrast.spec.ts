import { describe, expect, it } from 'vitest';
import { DEFAULT_SERIES_COLOR, colorBarBackground, seriesColors } from '../series-contrast';

const seriesById = new Map([
  ['1', { color: '#f1a2b3' }],
  ['2', { color: '#00a0e9' }],
  ['3', { color: '#f1a2b3' }]
]);

describe('seriesColors', () => {
  it('resolves ids to colours in order', () => {
    expect(seriesColors(['2', '1'], seriesById)).toEqual(['#00a0e9', '#f1a2b3']);
  });

  it('de-dupes series that share a colour', () => {
    expect(seriesColors(['1', '3'], seriesById)).toEqual(['#f1a2b3']);
  });

  it('falls back to the default accent when nothing resolves', () => {
    expect(seriesColors([], seriesById)).toEqual([DEFAULT_SERIES_COLOR]);
    expect(seriesColors(['nope'], seriesById)).toEqual([DEFAULT_SERIES_COLOR]);
  });
});

describe('colorBarBackground', () => {
  it('uses a flat colour for a single series', () => {
    expect(colorBarBackground(['#00a0e9'])).toBe('#00a0e9');
  });

  it('splits into equal hard-stop segments for several series', () => {
    // Hard stops rather than a blend, so each series stays individually readable.
    expect(colorBarBackground(['#a', '#b'])).toBe(
      'linear-gradient(to bottom, #a 0.00% 50.00%, #b 50.00% 100.00%)'
    );
  });

  it('divides evenly across three series', () => {
    const bar = colorBarBackground(['#a', '#b', '#c']);

    expect(bar).toContain('#a 0.00% 33.33%');
    expect(bar).toContain('#b 33.33% 66.67%');
    expect(bar).toContain('#c 66.67% 100.00%');
  });

  it('falls back to the default accent for an empty list', () => {
    expect(colorBarBackground([])).toBe(DEFAULT_SERIES_COLOR);
  });
});
