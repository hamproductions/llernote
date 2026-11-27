import { formatEventShareText } from '~/utils/share';
import type { ShortNames } from '~/utils/abbreviations';
import type { Performance, Setlist, Song } from '~/types';

export const numberSongs = (setlist: Setlist | undefined) => {
  const numbers = new Map<string, number>();
  for (const item of setlist?.items ?? []) {
    if (item.type === 'song') numbers.set(item.id, numbers.size + 1);
  }
  return numbers;
};

export const formatSetlistText = (
  performance: Performance,
  setlist: Setlist,
  songById: Map<string, Song>,
  short?: ShortNames
) => {
  const numbers = numberSongs(setlist);
  return [
    formatEventShareText(performance, short?.event(performance)),
    ...setlist.items.map((item) => {
      if (item.type !== 'song') {
        return `-- ${item.title ?? item.type.toUpperCase()}`;
      }
      const song = item.songId ? songById.get(item.songId) : undefined;
      const name = song ? (short?.song(song) ?? song.name) : (item.customSongName ?? '');
      return `${String(numbers.get(item.id) ?? '-').padStart(2, '0')}. ${name}`;
    })
  ].join('\n');
};
