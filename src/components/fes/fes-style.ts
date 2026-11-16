import { seriesById } from '~/data/core';
import { getSeriesShortName } from '~/utils/series-short';
import { OTHERS, type FesSongType } from '~/utils/fes-report';

/** Franchise colours used by the festival charts. Ikizurai-bu is orange (its brand blue clashes with Aqours). */
const COLOR_OVERRIDE: Record<string, string> = {
  '8': '#f2540a',
  '5': '#9a8f94',
  [OTHERS]: '#64748b'
};
export const fesColor = (seriesId: string): string =>
  COLOR_OVERRIDE[seriesId] ?? seriesById.get(seriesId)?.color ?? '#64748b';

export const fesSeriesName = (seriesId: string, othersLabel: string): string =>
  seriesId === OTHERS
    ? othersLabel
    : getSeriesShortName(seriesId, seriesById.get(seriesId)?.name ?? seriesId);

export const TYPE_COLOR: Record<FesSongType, string> = {
  group: '#6366f1',
  unit: '#0ea5a4',
  solo: '#eab308',
  cross: '#e8590c',
  guest: '#9a8f94'
};

/** Franchises whose members are the "active" ones for the push check. */
export const ACTIVE_SERIES = ['3', '4', '6', '8'];

export const f1 = (v: number) => v.toFixed(1);
export const f2 = (v: number) => String(Math.round(v * 100) / 100);
export const pctText = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
