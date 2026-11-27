import songsUrl from '../../data/song-abbreviations.json?url';
import eventsUrl from '../../data/event-abbreviations.json?url';
import namesUrl from '../../data/name-abbreviations.json?url';
import {
  createAbbreviations,
  type Abbreviations,
  type AbbreviationData
} from '~/utils/abbreviations';

const englishSongUrls = Object.values(
  import.meta.glob<string>('../../data/song-abbreviations-en.json', {
    query: '?url',
    import: 'default',
    eager: true
  })
);

const fetchJson = <T>(url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json() as Promise<T>;
  });

let promise: Promise<Abbreviations> | null = null;
export const loadAbbreviations = (): Promise<Abbreviations> => {
  promise ??= Promise.all([
    fetchJson<AbbreviationData['songs']>(songsUrl),
    englishSongUrls[0]
      ? fetchJson<AbbreviationData['englishSongs']>(englishSongUrls[0])
      : Promise.resolve({}),
    fetchJson<AbbreviationData['events']>(eventsUrl),
    fetchJson<AbbreviationData['names']>(namesUrl)
  ])
    .then(([songs, englishSongs, events, names]) =>
      createAbbreviations({ songs, englishSongs, events, names })
    )
    .catch((error: unknown) => {
      promise = null;
      throw error;
    });
  return promise;
};
