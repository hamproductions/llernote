import { toHiragana } from 'wanakana';
import { localizedName } from '~/utils/names';
import { shortPerformanceLabel } from '~/utils/performance-label';
import type { Performance, Song } from '~/types';

export interface EventAbbreviation {
  ja: string;
  en: string;
  aliases: string[];
}

export interface AbbreviationData {
  songs: Record<string, string[]>;
  englishSongs: Record<string, string>;
  events: Record<string, EventAbbreviation>;
  names: Record<string, { ja: string; en?: string }>;
}

export interface ShortNames {
  song: (song: Pick<Song, 'id' | 'name' | 'englishName'>) => string;
  event: (performance: Pick<Performance, 'eventId' | 'tourName'>) => string;
  performance: (performance: Pick<Performance, 'concertName' | 'performanceName'>) => string;
  name: (name: string, fullName?: string) => string;
}

export type SongAliases = (songId: string) => string[];
export type EventAliases = (eventId?: string) => string[];

export const EMPTY_ABBREVIATIONS: AbbreviationData = {
  songs: {},
  englishSongs: {},
  events: {},
  names: {}
};

const latin = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;

export const foldText = (text: string) =>
  toHiragana(text.normalize('NFKC').toLowerCase(), {
    passRomaji: true,
    convertLongVowelMark: false
  }).replace(/[^\p{L}\p{N}]/gu, '');

export const getAliasScore = (aliases: string[], query: string) => {
  if (aliases.length === 0) return 0;
  const q = foldText(query);
  if (!q) return 0;
  return Math.max(
    0,
    ...aliases.map((alias) => {
      const text = foldText(alias);
      if (text === q) return 98;
      if (text.startsWith(q)) return 88;
      return text.includes(q) ? 78 : 0;
    })
  );
};

const nameKey = (name: string) => name.normalize('NFKC').replace(/\s/g, '');

const shorter = (short: string | undefined, full: string) =>
  short && short.length < full.length ? short : full;

export const createAbbreviations = (data: AbbreviationData) => {
  const names = new Map(Object.entries(data.names).map(([name, short]) => [nameKey(name), short]));

  const songAliases: SongAliases = (id) => [
    ...(data.songs[id] ?? []),
    ...(data.englishSongs[id] ? [data.englishSongs[id]] : [])
  ];

  const eventAliases: EventAliases = (eventId) => {
    const event = eventId ? data.events[eventId] : undefined;
    return event ? [event.ja, event.en, ...event.aliases] : [];
  };

  const shortNames = (language: string): ShortNames => {
    const locale = language.startsWith('en') ? 'en' : 'ja';
    const shortName = (name: string): string | undefined => {
      const short = names.get(nameKey(name))?.[locale];
      const members = name.split('、');
      if (short || members.length < 2) return short;
      const shortMembers = members.map(shortName);
      if (!shortMembers.some(Boolean)) return undefined;
      return members
        .map((member, index) => shortMembers[index] ?? member)
        .join(locale === 'en' ? ', ' : '、');
    };
    return {
      song: ({ id, name, englishName }) =>
        shorter(
          locale === 'en'
            ? (data.englishSongs[id] ?? data.songs[id]?.find((alias) => latin.test(alias)))
            : data.songs[id]?.[0],
          localizedName(language, name, englishName)
        ),
      event: ({ eventId, tourName }) =>
        shorter(eventId ? data.events[eventId]?.[locale] : undefined, tourName),
      performance: ({ concertName, performanceName }) =>
        shortPerformanceLabel(concertName, performanceName, locale, shortName),
      name: (name, fullName = name) => shortName(name) ?? fullName
    };
  };

  return { songNicknames: data.songs, songAliases, eventAliases, shortNames };
};

export type Abbreviations = ReturnType<typeof createAbbreviations>;
