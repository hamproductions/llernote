export const LIVE_CATS = [
  'numbered',
  'fanmeeting',
  'fes',
  'release',
  'external',
  'virtual'
] as const;
export type LiveCat = (typeof LIVE_CATS)[number];

export const NUMBERED_LIVES: { group: string; match: string; label: string }[] = [
  { group: "μ's", match: "μ's First LoveLive!", label: 'First' },
  { group: "μ's", match: 'New Year LoveLive!', label: 'New Year' },
  { group: "μ's", match: '3rd Anniversary LoveLive!', label: '3rd Anniv' },
  { group: "μ's", match: '→NEXT LoveLive!', label: '→NEXT' },
  { group: "μ's", match: 'Go→Go! LoveLive!', label: 'Go→Go' },
  { group: "μ's", match: "μ's Final LoveLive!", label: 'Final' },
  { group: 'Aqours', match: 'Aqours First LoveLive!', label: '1st' },
  { group: 'Aqours', match: 'Aqours 2nd LoveLive!', label: '2nd' },
  { group: 'Aqours', match: 'Aqours 3rd LoveLive!', label: '3rd' },
  { group: 'Aqours', match: 'Aqours 4th LoveLive!', label: '4th' },
  { group: 'Aqours', match: 'Aqours 5th LoveLive!', label: '5th' },
  { group: 'Aqours', match: 'Aqours 6th LoveLive!', label: '6th' },
  { group: 'Aqours', match: 'Aqours Finale LoveLive!', label: 'Finale' },
  { group: 'Nijigasaki', match: '同好会 First Live', label: '1st' },
  { group: 'Nijigasaki', match: '同好会 2nd Live!', label: '2nd' },
  { group: 'Nijigasaki', match: '3rd Live! School Idol Festival', label: '3rd' },
  { group: 'Nijigasaki', match: '4th Live! 〜Love the Life We Live〜', label: '4th' },
  { group: 'Nijigasaki', match: '5th Live! 虹が咲く場所', label: '5th' },
  { group: 'Nijigasaki', match: '6th Live! I love You', label: '6th' },
  { group: 'Nijigasaki', match: '7th Live! NEW TOKIMEKI LAND', label: '7th' },
  { group: 'Nijigasaki', match: '8th Live! TOKIMEKI Express', label: '8th' },
  { group: 'Liella!', match: 'Liella! First LoveLive! Tour', label: '1st' },
  { group: 'Liella!', match: 'Liella! 2nd LoveLive!', label: '2nd' },
  { group: 'Liella!', match: 'Liella! 3rd LoveLive! Tour', label: '3rd' },
  { group: 'Liella!', match: 'Liella! 4th LoveLive! Tour', label: '4th' },
  { group: 'Liella!', match: 'Liella! 5th LoveLive!', label: '5th' },
  { group: 'Liella!', match: 'Liella! 6th LoveLive! Tour', label: '6th' },
  { group: 'Liella!', match: 'Liella! 7th LoveLive!', label: '7th' },
  { group: 'Hasunosora', match: '1st Live Tour ～RUN', label: '1st' },
  { group: 'Hasunosora', match: '2nd Live Tour', label: '2nd' },
  { group: 'Hasunosora', match: '3rd Live Tour', label: '3rd' },
  { group: 'Hasunosora', match: '4th Live Dream', label: '4th' },
  { group: 'Hasunosora', match: '5th Live Tour', label: '5th' },
  { group: 'Hasunosora', match: '6th Live Dream', label: '6th' },
  { group: 'Ikizurai-bu!', match: 'いきづらい部！ 1st LIVE', label: '1st' }
];

export const flagOf = (tourName: string) =>
  NUMBERED_LIVES.find((e) => tourName.includes(e.match)) ?? null;
export const liveLabel = (tour: string): string => flagOf(tour)?.label ?? '?';

const TOURTYPE_CAT: Record<string, LiveCat> = {
  'ライブ・ファンミ': 'fanmeeting',
  外部のフェス: 'fes',
  'リリイベ・ミニライブ': 'release',
  外部イベント内のライブ: 'external',
  バーチャルライブ: 'virtual',
  有観客バーチャルライブ: 'virtual',
  収録配信: 'virtual'
};

export const liveCatOf = (isFlagship: boolean, tourType?: string): LiveCat | null =>
  isFlagship ? 'numbered' : tourType ? (TOURTYPE_CAT[tourType] ?? null) : null;

export const liveCatOfPerformance = (p: { tourName: string; tourType?: string }): LiveCat | null =>
  liveCatOf(!!flagOf(p.tourName), p.tourType);
