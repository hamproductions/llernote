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

const memberSetKey = (artist?: Artist | null) => {
  const members = realCharacterIds(artist);
  if (!artist || members.length === 0) return '';
  return `${[...artist.seriesIds].toSorted().join(',')}:${members.toSorted().join('|')}`;
};

const aliasPriority = (artist: Artist) =>
  (isGroupArtist(artist) ? 0 : 2) + (artist.name.includes('、') ? 1 : 0);

const dedupeByMembers = (artists: Artist[]) => {
  const byKey = new Map<string, Artist>();
  for (const artist of artists) {
    const key = memberSetKey(artist);
    const current = byKey.get(key);
    if (
      !current ||
      aliasPriority(artist) < aliasPriority(current) ||
      (aliasPriority(artist) === aliasPriority(current) && artist.name.length < current.name.length)
    ) {
      byKey.set(key, artist);
    }
  }
  return [...byKey.values()];
};

export const buildArtistBuckets = (artists: Artist[]) => {
  const idsByMembers = new Map<string, Set<string>>();
  for (const artist of artists) {
    const key = memberSetKey(artist);
    if (!key) continue;
    const ids = idsByMembers.get(key) ?? new Set<string>();
    ids.add(artist.id);
    idsByMembers.set(key, ids);
  }
  const aliasIds = new Map<string, Set<string>>();
  for (const ids of idsByMembers.values()) {
    for (const id of ids) aliasIds.set(id, ids);
  }
  return {
    group: dedupeByMembers(
      artists.filter(
        (artist) =>
          realCharacterIds(artist).length > 1 &&
          artist.seriesIds.length === 1 &&
          isGroupArtist(artist)
      )
    ),
    unit: dedupeByMembers(
      artists.filter(
        (artist) =>
          realCharacterIds(artist).length > 1 &&
          artist.seriesIds.length === 1 &&
          !isGroupArtist(artist)
      )
    ),
    solo: dedupeByMembers(artists.filter((artist) => realCharacterIds(artist).length === 1)),
    others: artists.filter(
      (artist) => realCharacterIds(artist).length === 0 || artist.seriesIds.length > 1
    ),
    aliasIds
  };
};

export const artistsForRow = (
  row: MyPickRow,
  artistById: Map<string, Artist>,
  buckets: ReturnType<typeof buildArtistBuckets>
) => {
  if (row.type === 'artist') {
    const ids = buckets.aliasIds.get(row.id) ?? new Set([row.id]);
    return [...ids].map((id) => artistById.get(id)).filter((artist): artist is Artist => !!artist);
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
  artistById: Map<string, Artist>,
  aliasIds?: Map<string, Set<string>>
) => {
  const ids = songArtistIds(song, artistById);

  if (row.type === 'artist') {
    const rowIds = aliasIds?.get(row.id) ?? new Set([row.id]);
    return ids.length === 1 && rowIds.has(ids[0]);
  }
  if (row.type === 'category' && row.id === 'group') return isGroupSong(ids, artistById);
  if (row.type === 'category' && row.id === 'unit') return isUnitSong(ids, artistById);
  if (row.type === 'category' && row.id === 'solo') return isSoloSong(ids, artistById);
  if (row.type === 'category' && row.id === 'others') {
    return song.seriesIds.length > 1 || isOtherSong(ids, artistById);
  }
  if (row.type === 'series') return song.seriesIds.map(String).includes(row.id);
  return false;
};
