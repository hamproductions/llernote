import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { SortUnit } from './live-sort';

export interface LiveSortShareData {
  unit: SortUnit;
  /** Rank buckets of candidate ids; ids sharing a bucket are tied. */
  results: string[][];
}

interface EncodedShape {
  v: 1;
  u: SortUnit;
  r: string[][];
}

export const encodeLiveSortResults = (data: LiveSortShareData) =>
  compressToEncodedURIComponent(
    JSON.stringify({ v: 1, u: data.unit, r: data.results } satisfies EncodedShape)
  );

export const decodeLiveSortResults = (encoded: string): LiveSortShareData | null => {
  try {
    const raw = decompressFromEncodedURIComponent(encoded);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EncodedShape;
    if (parsed.v !== 1) return null;
    if (parsed.u !== 'live' && parsed.u !== 'performance') return null;
    if (!Array.isArray(parsed.r)) return null;
    const results = parsed.r
      .filter((bucket): bucket is string[] => Array.isArray(bucket))
      .map((bucket) => bucket.filter((id): id is string => typeof id === 'string'))
      .filter((bucket) => bucket.length > 0);
    if (results.length === 0) return null;
    return { unit: parsed.u, results };
  } catch {
    return null;
  }
};

/**
 * lz-string's URI-safe alphabet includes `+`, which `URLSearchParams` decodes back as a
 * space — so the payload must be percent-escaped rather than interpolated raw, or any
 * ranking big enough to compress to a `+` would load corrupted.
 */
/**
 * Plain-text ranking for pasting into a post. Tied lives share a rank number, so the
 * numbering skips the way the rendered list does (1, 2, 2, 4).
 */
export const formatLiveSortText = (ranking: { title: string; subtitle?: string }[][]): string => {
  const lines: string[] = [];
  let rank = 1;
  for (const bucket of ranking) {
    for (const candidate of bucket) {
      const name = [candidate.title, candidate.subtitle].filter(Boolean).join(' / ');
      lines.push(`${rank}. ${name}`);
    }
    rank += bucket.length;
  }
  return lines.join('\n');
};

export const liveSortShareUrl = (encoded: string) =>
  `${window.location.origin}${window.location.pathname}?d=${encodeURIComponent(encoded)}`;
