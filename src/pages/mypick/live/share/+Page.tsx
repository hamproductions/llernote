import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { join } from 'path-browserify';
import { HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Metadata } from '~/components/layout/Metadata';
import { LiveMyPickBoard, type BoardCard } from '~/components/mypick/LiveMyPickBoard';
import {
  useArtistById,
  usePerformance,
  useSeriesById,
  useSetlist,
  useSongById
} from '~/hooks/useData';
import { LocalStorage } from '~/hooks/useLocalStorage';
import { localizedName } from '~/utils/names';
import { getPicUrl } from '~/utils/assets';
import { hasSongThumb } from '~/utils/song-thumbs';
import { songArtistIds } from '~/utils/mypick-options';
import {
  BUILTIN_AWARDS,
  buildUnitGroups,
  getLiveCostumes,
  getLiveSongEntries
} from '~/utils/mypick-live';
import { decodeMyPickLive } from '~/utils/mypick-live-share';
import type { Artist, Song } from '~/types';
import type { MyPickValue } from '~/types/mypick-live';

const STORAGE_KEY = 'mypick-live-state';

export default function Page() {
  const { t, i18n } = useTranslation();
  const songById = useSongById();
  const artistById = useArtistById();
  const seriesById = useSeriesById();

  const shared = useMemo(() => {
    const params = new URLSearchParams(import.meta.env.SSR ? '' : window.location.search);
    return decodeMyPickLive(params.get('d'));
  }, []);

  const performanceId = shared?.performanceId;
  const performance = usePerformance(performanceId);
  const setlist = useSetlist(performanceId);

  const seriesColor = (ids?: (string | number)[]): string | undefined => {
    const id = ids?.[0];
    return id === undefined ? undefined : seriesById.get(String(id))?.color;
  };

  const entries = useMemo(() => getLiveSongEntries(setlist, songById), [setlist, songById]);
  const unitGroups = useMemo(() => buildUnitGroups(entries, artistById), [entries, artistById]);
  const costumes = useMemo(() => getLiveCostumes(performanceId), [performanceId]);

  const songSub = (song: Song): string =>
    songArtistIds(song, artistById)
      .map((id) => artistById.get(id))
      .filter((a): a is Artist => Boolean(a))
      .map((a) => localizedName(i18n.language, a.name, a.englishName))
      .join('・');

  const songPicked = (song: Song): BoardCard['picked'] => ({
    name: localizedName(i18n.language, song.name, song.englishName),
    sub: songSub(song),
    image: hasSongThumb(song.id) ? getPicUrl(song.id, 'thumbnail') : undefined
  });

  const resolvePicked = (value: MyPickValue | undefined): BoardCard['picked'] | undefined => {
    if (!value) return undefined;
    if (value.type === 'costume') {
      const costume = costumes.find((c) => c.id === value.id);
      return costume
        ? { name: costume.name, sub: costume.songName, image: costume.image }
        : undefined;
    }
    const song = songById.get(value.id);
    return song ? songPicked(song) : undefined;
  };

  const awardCards: BoardCard[] = shared
    ? [
        ...BUILTIN_AWARDS.map((award) => ({
          id: `award:${award.key}`,
          label: t(`mypick_live.awards.${award.key}` as 'mypick_live.awards.best_song'),
          picked: resolvePicked(shared.awards[award.key])
        })),
        ...shared.customAwards.map((award) => ({
          id: `award:${award.id}`,
          label: award.label,
          picked: resolvePicked(shared.awards[award.id])
        }))
      ]
    : [];

  const unitCards: BoardCard[] = shared
    ? unitGroups.map((group) => {
        const pickedId = shared.unitPicks[group.artist.id];
        const song = pickedId ? songById.get(pickedId) : undefined;
        return {
          id: `unit:${group.artist.id}`,
          label: localizedName(i18n.language, group.artist.name, group.artist.englishName),
          badge: t(`mypick_live.units.kind_${group.kind}` as 'mypick_live.units.kind_group'),
          accentColor: seriesColor(group.artist.seriesIds),
          picked: song ? songPicked(song) : undefined
        };
      })
    : [];

  const makeOwn = () => {
    if (shared) new LocalStorage(STORAGE_KEY).value = shared;
    window.location.href = join(import.meta.env.PUBLIC_ENV__BASE_URL ?? '/', 'mypick/live');
  };

  const liveName = performance
    ? performance.performanceName?.trim() || performance.concertName?.trim() || performance.tourName
    : '';
  const liveSub = performance
    ? [performance.date, performance.venue].filter(Boolean).join(' • ')
    : undefined;

  return (
    <>
      <Metadata title={`${t('mypick_live.title')} - LLerNote`} helmet />
      <Stack gap="4" w="full" color="mypick.text">
        <Stack gap="1">
          <Text as="h1" fontSize={{ base: '3xl', md: '4xl' }} fontWeight="800" lineHeight="1">
            {t('mypick_live.title')}
          </Text>
          <Text color="mypick.muted">{t('mypick_live.description')}</Text>
        </Stack>

        {!shared ? (
          <Text color="mypick.muted">{t('mypick_live.no_live_selected')}</Text>
        ) : (
          <>
            <HStack
              gap="3"
              justifyContent="space-between"
              borderColor="accent.7"
              borderRadius="l2"
              borderWidth="1px"
              p="3"
              bgColor="accent.a2"
              flexWrap="wrap"
            >
              <Text fontSize="sm">{t('mypick_live.shared_view')}</Text>
              <Button size="sm" onClick={makeOwn} color="white" bgColor="accent.default">
                {t('mypick_live.make_own')}
              </Button>
            </HStack>

            {entries.length === 0 ? (
              <Text color="mypick.muted">{t('common.loading')}</Text>
            ) : (
              <LiveMyPickBoard
                liveName={liveName}
                liveSub={liveSub}
                awards={awardCards}
                units={unitCards}
                accentColor={seriesColor(performance?.seriesIds)}
              />
            )}
          </>
        )}
      </Stack>
    </>
  );
}
