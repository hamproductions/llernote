import { describe, expect, it } from 'vitest';
import {
  decodeLiveSortResults,
  encodeLiveSortResults,
  formatLiveSortText,
  liveSortShareUrl
} from '../live-sort-share';

describe('live sort share encoding', () => {
  it('round-trips a ranking including tie buckets', () => {
    const data = {
      unit: 'live' as const,
      results: [['live:2026-03-01:Tour A'], ['live:2026-01-10:Tour B', 'live:2025-12-01:Tour C']]
    };

    expect(decodeLiveSortResults(encodeLiveSortResults(data))).toEqual(data);
  });

  it('round-trips performance-unit rankings', () => {
    const data = { unit: 'performance' as const, results: [['perf:1'], ['perf:2']] };

    expect(decodeLiveSortResults(encodeLiveSortResults(data))).toEqual(data);
  });

  it('rejects junk rather than throwing', () => {
    expect(decodeLiveSortResults('not-compressed-at-all')).toBeNull();
    expect(decodeLiveSortResults('')).toBeNull();
  });

  it('rejects a payload with an unknown unit', () => {
    const encoded = encodeLiveSortResults({
      unit: 'tour' as unknown as 'live',
      results: [['x']]
    });

    expect(decodeLiveSortResults(encoded)).toBeNull();
  });

  it('drops empty buckets and rejects a ranking left with nothing', () => {
    const encoded = encodeLiveSortResults({ unit: 'live', results: [[], []] });

    expect(decodeLiveSortResults(encoded)).toBeNull();
  });

  it('survives a share URL round-trip for a payload containing "+"', () => {
    // lz-string's URI-safe alphabet includes '+', which URLSearchParams would otherwise
    // decode as a space. Realistic rankings hit this from roughly 11 lives upwards.
    const data = {
      unit: 'live' as const,
      results: Array.from({ length: 40 }, (_, i) => [
        `live:2020-0${(i % 9) + 1}-1${i % 9}:Tour ${i} ライブ`
      ])
    };
    const encoded = encodeLiveSortResults(data);
    expect(encoded).toContain('+');

    const url = new URL(liveSortShareUrl(encoded), 'http://localhost/sort');
    const param = new URLSearchParams(url.search).get('d');

    expect(decodeLiveSortResults(param!)).toEqual(data);
  });
});

describe('formatLiveSortText', () => {
  const live = (title: string, subtitle?: string) => ({ title, subtitle });

  it('numbers the ranking for pasting', () => {
    expect(formatLiveSortText([[live('Tour A')], [live('Tour B')]])).toBe('1. Tour A\n2. Tour B');
  });

  it('gives tied lives the same rank and skips the numbers they consume', () => {
    const text = formatLiveSortText([
      [live('Tour A')],
      [live('Tour B'), live('Tour C')],
      [live('Tour D')]
    ]);

    expect(text).toBe('1. Tour A\n2. Tour B\n2. Tour C\n4. Tour D');
  });

  it('appends the performance name when there is one', () => {
    expect(formatLiveSortText([[live('Tour A', 'Day.1')]])).toBe('1. Tour A / Day.1');
  });

  it('is empty for an empty ranking', () => {
    expect(formatLiveSortText([])).toBe('');
  });
});
