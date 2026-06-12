import type { Performance, Song } from '~/types';

export const getMyPickColumnYears = (songs: Song[], performances: Performance[]) => {
  const years = [
    ...songs.map((song) => Number((song.releasedOn ?? '').slice(0, 4))),
    ...performances.map((performance) => Number(performance.date.slice(0, 4)))
  ].filter((year) => Number.isInteger(year) && year > 1900);
  if (!years.length) return [];
  const min = Math.min(...years);
  const max = Math.max(...years);
  return Array.from({ length: max - min + 1 }, (_, i) => String(max - i));
};
