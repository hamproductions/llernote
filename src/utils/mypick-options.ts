import type { Artist, Song } from '~/types';
import type { MyPickRow } from '~/types/attendance';

export type MyPickRowCategory = 'group' | 'unit' | 'solo' | 'others' | 'series';

export const GROUP_ARTIST_NAMES = [
  "μ's",
  'Aqours',
  'Aqours feat. 初音ミク',
  'Saint Aqours Snow',
  '私立浦の星女学院一同',
  'シャゼリア☆キッス',
  '虹ヶ咲学園スクールアイドル同好会',
  'ニジガク with You',
  'Liella!',
  '椿滝桜女学院高等学校スクールアイドル部!',
  '蓮ノ空女学院スクールアイドルクラブ',
  'スリーズブーケ＆DOLLCHESTRA＆みらくらぱーく！',
  'ヨハネ、ハナマル、ダイヤ、ルビィ、チカ、ヨウ、カナン、リコ、マリ',
  'ヨハネ、ライラプス、ハナマル、ダイヤ、ルビィ、チカ、ヨウ、カナン、リコ、マリ',
  'いきづらい部！'
];

const normalizeGroupName = (name: string) => name.replace(/[!！\s]/g, '').toLowerCase();

const GROUP_ARTIST_NAME_KEYS = new Set(GROUP_ARTIST_NAMES.map(normalizeGroupName));

const realCharacterIds = (artist?: Artist | null) =>
  (artist?.characters ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0);

export const isGroupArtist = (artist?: Artist | null) =>
  !!artist && GROUP_ARTIST_NAME_KEYS.has(normalizeGroupName(artist.name));

export const buildArtistBuckets = (artists: Artist[]) => ({
  group: artists.filter(
    (artist) =>
      realCharacterIds(artist).length > 1 && artist.seriesIds.length === 1 && isGroupArtist(artist)
  ),
  unit: artists.filter(
    (artist) =>
      realCharacterIds(artist).length > 1 && artist.seriesIds.length === 1 && !isGroupArtist(artist)
  ),
  solo: artists.filter((artist) => realCharacterIds(artist).length === 1),
  others: artists.filter(
    (artist) => realCharacterIds(artist).length === 0 || artist.seriesIds.length > 1
  )
});

export const artistsForRow = (
  row: MyPickRow,
  artistById: Map<string, Artist>,
  buckets: ReturnType<typeof buildArtistBuckets>
) => {
  if (row.type === 'artist') {
    const artist = artistById.get(row.id);
    return artist ? [artist] : [];
  }
  if (row.type === 'category' && row.id === 'group') return buckets.group;
  if (row.type === 'category' && row.id === 'unit') return buckets.unit;
  if (row.type === 'category' && row.id === 'solo') return buckets.solo;
  if (row.type === 'category' && row.id === 'others') return buckets.others;
  return [];
};

export const songArtistIds = (song: Song, artistById: Map<string, Artist>) =>
  (song.artists ?? []).map((artist) => artist.id).filter((id) => artistById.has(id));

export const isGroupSong = (ids: string[], artistById: Map<string, Artist>) =>
  ids.length === 1 && isGroupArtist(artistById.get(ids[0]));

export const isUnitSong = (ids: string[], artistById: Map<string, Artist>) =>
  ids.length === 1 &&
  realCharacterIds(artistById.get(ids[0])).length > 1 &&
  (artistById.get(ids[0])?.seriesIds.length ?? 0) === 1 &&
  !isGroupArtist(artistById.get(ids[0]));

export const isSoloSong = (ids: string[], artistById: Map<string, Artist>) =>
  ids.length === 1 && realCharacterIds(artistById.get(ids[0])).length === 1;

export const isOtherSong = (ids: string[], artistById: Map<string, Artist>) =>
  ids.length !== 1 ||
  (ids.length === 1 &&
    (realCharacterIds(artistById.get(ids[0])).length === 0 ||
      (artistById.get(ids[0])?.seriesIds.length ?? 0) > 1));

export const songMatchesMyPickRow = (
  song: Song,
  row: MyPickRow,
  artistById: Map<string, Artist>
) => {
  const ids = songArtistIds(song, artistById);

  if (row.type === 'artist') return ids.length === 1 && ids[0] === row.id;
  if (row.type === 'category' && row.id === 'group') return isGroupSong(ids, artistById);
  if (row.type === 'category' && row.id === 'unit') return isUnitSong(ids, artistById);
  if (row.type === 'category' && row.id === 'solo') return isSoloSong(ids, artistById);
  if (row.type === 'category' && row.id === 'others') {
    return song.seriesIds.length > 1 || isOtherSong(ids, artistById);
  }
  if (row.type === 'series') return song.seriesIds.map(String).includes(row.id);
  return false;
};
