import { series } from '~/data/core';

export const BROWN = '#7c4d3d';
export const PINK = '#ff6cc7';
export const CREAM = '#ffecfb';
export const GREEN = '#3bad21';

export const foregroundFor = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.4 ? '#111111' : '#ffffff';
};

export const franchiseColor = (seriesIds: number[] = []) =>
  seriesIds.length === 1
    ? (series.find((item) => item.id === String(seriesIds[0]))?.color ?? '#e4007f')
    : '#e4007f';
