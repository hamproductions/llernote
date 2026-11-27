import { foldText } from '~/utils/abbreviations';
import type { Song } from '~/types';

export type QuizEntry = { song: Song; nicknames: string[] };
export type QuizQuestion = { song: Song; nickname: string; answers: ReadonlySet<string> };

export const buildQuizPool = (songs: Song[], nicknames: Record<string, string[]>): QuizEntry[] =>
  songs.flatMap((song) => {
    const titles = [song.name, song.englishName, song.phoneticName]
      .filter((title): title is string => !!title)
      .map(foldText);
    const hidden = (nicknames[song.id] ?? []).filter((nickname) => {
      const key = foldText(nickname);
      return !!key && !titles.some((title) => title.includes(key));
    });
    return hidden.length > 0 ? [{ song, nicknames: hidden }] : [];
  });

export const answersFor = (nickname: string, nicknames: Record<string, string[]>) => {
  const key = foldText(nickname);
  return new Set(
    Object.entries(nicknames)
      .filter(([, names]) => names.some((name) => foldText(name) === key))
      .map(([songId]) => songId)
  );
};

export const drawQuestion = (
  pool: QuizEntry[],
  nicknames: Record<string, string[]>,
  seen: ReadonlySet<string>,
  random: () => number = Math.random
): QuizQuestion | undefined => {
  const fresh = pool.filter((entry) => !seen.has(entry.song.id));
  const choices = fresh.length > 0 ? fresh : pool;
  const entry = choices[Math.floor(random() * choices.length)];
  if (!entry) return undefined;
  const nickname = entry.nicknames[Math.floor(random() * entry.nicknames.length)];
  return { song: entry.song, nickname, answers: answersFor(nickname, nicknames) };
};
