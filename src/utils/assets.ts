import { join } from 'path-browserify';
import { getSongThumbId } from './song-thumbs';

export const assetsURL = import.meta.env.PUBLIC_ENV__BASE_URL + 'assets/';

export const getAssetUrl = (path: string) => {
  // Default to a root-absolute base so asset URLs resolve correctly on nested
  // routes (e.g. /mypick/live). In dev PUBLIC_ENV__BASE_URL is unset; without a
  // leading slash, getPicUrl's relative paths would resolve against the current
  // route's directory and 404. In prod the env is always set, so this is a no-op.
  return join(import.meta.env.PUBLIC_ENV__BASE_URL ?? '/', path);
};
export const getPicUrl = (
  id: string,
  type: 'seiyuu' | 'icons' | 'character' | 'thumbnail' | string = 'character'
) => {
  const prefix = (() => {
    switch (type) {
      case 'seiyuu':
        return 'assets/seiyuu';
      case 'icons':
        return 'assets/icons';
      case 'character':
        return 'assets/character';
      case 'thumbnail':
        return 'assets/songs/thumbnails';
      default:
        return 'assets/';
    }
  })();
  const photoId =
    type === 'thumbnail' ? (getSongThumbId(id) ?? id) : type !== 'seiyuu' ? id.split('-')[0] : id;

  return getAssetUrl(join(prefix, `${photoId}.webp`));
};

export const getAudioUrl = (id: string) => {
  return getAssetUrl(join('assets/songs/audio', `${id}.webm`));
};
