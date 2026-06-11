export const SERIES_SHORT_NAMES: Record<string, string> = {
  '1': "μ's",
  '2': 'Aqours',
  '3': '虹ヶ咲',
  '4': 'Liella!',
  '5': 'ミュージカル',
  '6': '蓮ノ空',
  '7': 'ヨハネ',
  '8': 'イキヅライブ'
};

export const getSeriesShortName = (id: string, fallback: string) =>
  SERIES_SHORT_NAMES[id] ?? fallback;
