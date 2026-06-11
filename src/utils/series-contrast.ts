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
