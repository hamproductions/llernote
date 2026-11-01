const DARKENED: Record<string, string> = {};

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

export const darkenForLight = (hex: string): string => {
  if (DARKENED[hex]) return DARKENED[hex];
  let [r, g, b] = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance > 0.45) {
    const factor = 0.45 / luminance;
    r *= factor;
    g *= factor;
    b *= factor;
  }
  const result = rgbToHex(r, g, b);
  DARKENED[hex] = result;
  return result;
};

const BRIGHTENED: Record<string, string> = {};

export const brightenForDark = (hex: string): string => {
  if (BRIGHTENED[hex]) return BRIGHTENED[hex];
  let [r, g, b] = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance < 0.55) {
    const target = 0.55;
    const blend = (target - luminance) / (1 - luminance);
    r = r + (255 - r) * blend;
    g = g + (255 - g) * blend;
    b = b + (255 - b) * blend;
  }
  const result = rgbToHex(r, g, b);
  BRIGHTENED[hex] = result;
  return result;
};

export const seriesTextColor = (hex: string, colorMode: string | null | undefined) =>
  colorMode === 'light' ? darkenForLight(hex) : brightenForDark(hex);

/** Accent used when a live has no resolvable series colour — LoveLive!'s own pink. */
export const DEFAULT_SERIES_COLOR = '#e4007f';

/**
 * CSS background for a series colour bar, the way ll-fans renders them: one flat colour,
 * or equal hard-stop segments top-to-bottom when a live spans several series. Hard stops
 * rather than a gradient so each series stays individually readable.
 */
export const colorBarBackground = (colors: string[]): string => {
  if (colors.length <= 1) return colors[0] ?? DEFAULT_SERIES_COLOR;
  const stops = colors
    .map(
      (color, index) =>
        `${color} ${((index * 100) / colors.length).toFixed(2)}% ${(((index + 1) * 100) / colors.length).toFixed(2)}%`
    )
    .join(', ');
  return `linear-gradient(to bottom, ${stops})`;
};

/**
 * Diagonal blend of a live's series colours, for the hero panel shown when there is
 * neither a poster nor album art. Blended rather than hard-stopped: this is a backdrop
 * for text, not a legend, so it should read as one surface.
 */
export const seriesGradient = (colors: string[]): string => {
  if (colors.length === 1) return `linear-gradient(135deg, ${colors[0]}, ${colors[0]}99)`;
  return `linear-gradient(135deg, ${colors.join(', ')})`;
};

/** Ordered, de-duped series colours for a set of series ids. */
export const seriesColors = (
  seriesIds: readonly string[],
  seriesById: Map<string, { color: string }>
): string[] => {
  const colors: string[] = [];
  for (const id of seriesIds) {
    const color = seriesById.get(String(id))?.color;
    if (color && !colors.includes(color)) colors.push(color);
  }
  return colors.length > 0 ? colors : [DEFAULT_SERIES_COLOR];
};
