import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAbbreviations } from './useAbbreviations';
import { useAttendance } from './useAttendance';
import { getLiveThumb, useArtistById, usePerformances } from './useData';
import { useSongById, useSongs } from './useSongData';
import { useCharacters } from './useCharacterData';
import { useSetlists } from './useSetlists';
import type { PickItem } from '~/components/mypick/PickDialog';
import { buildPerformanceCharacterMap } from '~/utils/performance-cast';
import { getPicUrl } from '~/utils/assets';
import { hasSongThumb } from '~/utils/song-thumbs';
import { castName, localizedName } from '~/utils/names';
import {
  artistsForRow,
  isGroupSong,
  isSoloSong,
  isUnitSong,
  songArtistIds,
  songMatchesMyPickRow,
  type buildArtistBuckets
} from '~/utils/mypick-options';
import type { MyPickColumn, MyPickRow } from '~/types/attendance';

export const useMyPickItems = (artistBuckets: ReturnType<typeof buildArtistBuckets>) => {
  const { i18n } = useTranslation();
  const { map: attendanceMap } = useAttendance();
  const artistById = useArtistById();
  const characters = useCharacters();
  const songs = useSongs();
  const songById = useSongById();
  const performances = usePerformances();
  const setlists = useSetlists();
  const { songAliases, eventAliases } = useAbbreviations();
  const performanceCharacters = useMemo(
    () => buildPerformanceCharacterMap(setlists, songById, artistById),
    [setlists, songById, artistById]
  );

  return useCallback(
    (row: MyPickRow, column: MyPickColumn): PickItem[] => {
      const scopedArtists = artistsForRow(row, artistById, artistBuckets);
      const rowCharacterIds =
        scopedArtists.length > 0
          ? new Set(
              scopedArtists.flatMap((artist) =>
                (artist?.characters ?? []).filter(
                  (id): id is string => typeof id === 'string' && id.length > 0
                )
              )
            )
          : null;
      const rowArtistIds = new Set(scopedArtists.map((artist) => artist?.id).filter(Boolean));
      const year = column.type === 'year' ? String(column.year) : null;
      const matchesRowPerformance = (performanceId: string, seriesIds: string[]) => {
        if (rowCharacterIds) {
          const cast = performanceCharacters.get(performanceId);
          if (!cast) return false;
          return [...rowCharacterIds].some((id) => cast.has(id));
        }
        if (row.type === 'category') return false;
        return seriesIds.includes(row.id);
      };

      if (column.type === 'member' || (column.type === 'slot' && column.slot === 'cast')) {
        return characters
          .filter((c) => (rowCharacterIds ? rowCharacterIds.has(c.id) : c.seriesId === row.id))
          .map((c) => ({
            id: c.id,
            label: localizedName(i18n.language, c.fullName, c.englishName),
            sub: c.casts
              .map((cast) => castName(i18n.language, cast.seiyuu, cast.englishName))
              .join('・'),
            englishName: c.englishName,
            searchText: c.casts
              .map(
                (cast) =>
                  `${cast.seiyuu} ${cast.englishName ?? ''} ${castName('en', cast.seiyuu, cast.englishName)}`
              )
              .join(' '),
            image: getPicUrl(c.id, c.hasIcon ? 'icons' : 'character')
          }));
      }
      if (
        (column.type === 'year' && column.slot === 'song') ||
        (column.type === 'slot' && column.slot === 'song')
      ) {
        return songs
          .filter((s) => {
            if (year && !(s.releasedOn ?? '').startsWith(year)) return false;
            if (rowArtistIds.size > 0 || row.type === 'category' || row.type === 'series') {
              return songMatchesMyPickRow(s, row, artistById, artistBuckets.aliasIds);
            }
            return false;
          })
          .map((s) => {
            const ids = songArtistIds(s, artistById);
            return {
              id: s.id,
              label: localizedName(i18n.language, s.name, s.englishName),
              sub: s.releasedOn,
              englishName: s.englishName,
              phoneticName: s.phoneticName,
              aliases: songAliases(s.id),
              searchText: s.artists
                ?.map((artist) => artistById.get(artist.id)?.name)
                .filter(Boolean)
                .join(' '),
              image: hasSongThumb(s.id) ? getPicUrl(s.id, 'thumbnail') : undefined,
              categories: [
                isGroupSong(ids, artistById)
                  ? 'group'
                  : isUnitSong(ids, artistById)
                    ? 'unit'
                    : isSoloSong(ids, artistById)
                      ? 'solo'
                      : 'others'
              ]
            };
          });
      }
      return performances
        .filter((p) => {
          if (year && !p.date.startsWith(year)) return false;
          return matchesRowPerformance(p.id, p.seriesIds);
        })
        .map((p) => {
          const image = getLiveThumb(p)?.image;
          const record = attendanceMap[p.id];
          const attended = record && !record.deleted && record.status === 'attended';
          return {
            id: p.id,
            label: p.tourName,
            sub: `${p.date} ${p.venue}`,
            aliases: eventAliases(p.eventId),
            searchText: `${p.concertName ?? ''} ${p.performanceName ?? ''} ${p.tourType ?? ''}`,
            image,
            categories: [...(image ? ['with_image'] : []), ...(attended ? ['attended'] : [])]
          };
        });
    },
    [
      i18n.language,
      attendanceMap,
      artistById,
      artistBuckets,
      characters,
      songs,
      performances,
      performanceCharacters,
      songAliases,
      eventAliases
    ]
  );
};
