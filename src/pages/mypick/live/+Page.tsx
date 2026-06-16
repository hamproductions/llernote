import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaLink, FaMusic, FaPlus, FaRotateLeft } from 'react-icons/fa6';
import { HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Metadata } from '~/components/layout/Metadata';
import { PickDialog, type PickItem } from '~/components/mypick/PickDialog';
import { LivePickerDialog } from '~/components/mypick/LivePickerDialog';
import { LiveMyPickBoard, type BoardCard } from '~/components/mypick/LiveMyPickBoard';
import { EXPORT_BG } from '~/components/mypick/MyPickGrid';
import {
  useArtistById,
  usePerformance,
  useSeriesById,
  useSetlist,
  useSongById
} from '~/hooks/useData';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { useToaster } from '~/context/ToasterContext';
import { localizedName } from '~/utils/names';
import { getPicUrl } from '~/utils/assets';
import { hasSongThumb } from '~/utils/song-thumbs';
import { songArtistIds } from '~/utils/mypick-options';
import { downloadElementAsImage } from '~/utils/share';
import {
  BUILTIN_AWARDS,
  buildUnitGroups,
  createEmptyLiveState,
  getLiveCostumes,
  getLiveSongEntries
} from '~/utils/mypick-live';
import { encodeMyPickLive, myPickLiveShareUrl } from '~/utils/mypick-live-share';
import type { Artist, Song } from '~/types';
import type { MyPickLiveState, MyPickValue } from '~/types/mypick-live';

type PickTarget =
  | { kind: 'award'; awardKey: string; slotKind: 'song' | 'costume'; label: string }
  | { kind: 'unit'; artistId: string; label: string };

const STORAGE_KEY = 'mypick-live-state';

export default function Page() {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const songById = useSongById();
  const artistById = useArtistById();
  const seriesById = useSeriesById();

  const [state, setState] = useLocalStorage<MyPickLiveState>(STORAGE_KEY);
  const [livePickerOpen, setLivePickerOpen] = useState(false);
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);
  const [newAwardLabel, setNewAwardLabel] = useState('');
  const [exporting, setExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const performanceId = state?.performanceId;
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

  const songImage = (song: Song): string | undefined =>
    hasSongThumb(song.id) ? getPicUrl(song.id, 'thumbnail') : undefined;

  const toSongOption = (song: Song): PickItem => ({
    id: song.id,
    label: localizedName(i18n.language, song.name, song.englishName),
    sub: songSub(song),
    image: songImage(song),
    englishName: song.englishName,
    phoneticName: song.phoneticName
  });

  const songOptions = useMemo(
    () => entries.map((entry) => toSongOption(entry.song)),
    // oxlint-disable-next-line exhaustive-deps
    [entries, artistById, i18n.language]
  );
  const costumeOptions = useMemo<PickItem[]>(
    () => costumes.map((c) => ({ id: c.id, label: c.name, sub: c.songName, image: c.image })),
    [costumes]
  );

  const resolvePicked = (value: MyPickValue | undefined): BoardCard['picked'] | undefined => {
    if (!value) return undefined;
    if (value.type === 'costume') {
      const costume = costumes.find((c) => c.id === value.id);
      return costume
        ? { name: costume.name, sub: costume.songName, image: costume.image }
        : undefined;
    }
    const song = songById.get(value.id);
    if (!song) return undefined;
    return {
      name: localizedName(i18n.language, song.name, song.englishName),
      sub: songSub(song),
      image: songImage(song)
    };
  };

  const awardCards: BoardCard[] = [
    ...BUILTIN_AWARDS.map((award) => ({
      id: `award:${award.key}`,
      label: t(`mypick_live.awards.${award.key}` as 'mypick_live.awards.best_song'),
      picked: resolvePicked(state?.awards[award.key]),
      hint:
        award.kind === 'costume' && costumes.length === 0
          ? t('mypick_live.costume_fallback_hint')
          : undefined
    })),
    ...(state?.customAwards ?? []).map((award) => ({
      id: `award:${award.id}`,
      label: award.label,
      removable: true,
      picked: resolvePicked(state?.awards[award.id])
    }))
  ];

  const unitCards: BoardCard[] = unitGroups.map((group) => {
    const pickedId = state?.unitPicks[group.artist.id];
    const song = pickedId ? songById.get(pickedId) : undefined;
    return {
      id: `unit:${group.artist.id}`,
      label: localizedName(i18n.language, group.artist.name, group.artist.englishName),
      badge: t(`mypick_live.units.kind_${group.kind}` as 'mypick_live.units.kind_group'),
      accentColor: seriesColor(group.artist.seriesIds),
      picked: song
        ? {
            name: localizedName(i18n.language, song.name, song.englishName),
            sub: songSub(song),
            image: songImage(song)
          }
        : undefined
    };
  });

  const awardSlotKind = (key: string): 'song' | 'costume' =>
    BUILTIN_AWARDS.find((a) => a.key === key)?.kind ?? 'song';

  const handleSelectLive = (id: string) => {
    if (state?.performanceId === id) return;
    setState(createEmptyLiveState(id));
  };

  const splitCardId = (cardId: string): [string, string] => [
    cardId.slice(0, cardId.indexOf(':')),
    cardId.slice(cardId.indexOf(':') + 1)
  ];

  const handlePick = (cardId: string) => {
    const [section, rawId] = splitCardId(cardId);
    if (section === 'award') {
      const builtin = BUILTIN_AWARDS.find((a) => a.key === rawId);
      const custom = state?.customAwards.find((a) => a.id === rawId);
      setPickTarget({
        kind: 'award',
        awardKey: rawId,
        slotKind: awardSlotKind(rawId),
        label: builtin
          ? t(`mypick_live.awards.${rawId}` as 'mypick_live.awards.best_song')
          : (custom?.label ?? '')
      });
    } else if (section === 'unit') {
      const group = unitGroups.find((g) => g.artist.id === rawId);
      setPickTarget({
        kind: 'unit',
        artistId: rawId,
        label: group
          ? localizedName(i18n.language, group.artist.name, group.artist.englishName)
          : ''
      });
    }
  };

  const handleClear = (cardId: string) => {
    if (!state) return;
    const [section, rawId] = splitCardId(cardId);
    if (section === 'award') {
      const awards = { ...state.awards };
      delete awards[rawId];
      setState({ ...state, awards });
    } else {
      const unitPicks = { ...state.unitPicks };
      delete unitPicks[rawId];
      setState({ ...state, unitPicks });
    }
  };

  const handleRemoveAward = (cardId: string) => {
    if (!state) return;
    const [, rawId] = splitCardId(cardId);
    const awards = { ...state.awards };
    delete awards[rawId];
    setState({
      ...state,
      awards,
      customAwards: state.customAwards.filter((a) => a.id !== rawId)
    });
  };

  const handleSelectOption = (id: string | undefined) => {
    if (!state || !pickTarget) return;
    if (id === undefined) {
      setPickTarget(null);
      return;
    }
    if (pickTarget.kind === 'unit') {
      setState({ ...state, unitPicks: { ...state.unitPicks, [pickTarget.artistId]: id } });
    } else {
      const useCostume = pickTarget.slotKind === 'costume' && costumes.length > 0;
      const value: MyPickValue = { type: useCostume ? 'costume' : 'song', id };
      setState({ ...state, awards: { ...state.awards, [pickTarget.awardKey]: value } });
    }
    setPickTarget(null);
  };

  const addCustomAward = () => {
    const label = newAwardLabel.trim();
    if (!label || !state) return;
    const id = `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
    setState({ ...state, customAwards: [...state.customAwards, { id, label }] });
    setNewAwardLabel('');
  };

  const handleReset = () => {
    if (!state) return;
    if (typeof window !== 'undefined' && !window.confirm(t('mypick_live.reset_confirm'))) return;
    setState(createEmptyLiveState(state.performanceId));
  };

  const shareUrl = async () => {
    if (!state) return;
    const url = myPickLiveShareUrl(encodeMyPickLive(state));
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t('share.copied'), type: 'success' });
    } catch {
      toast({ title: t('share.copy_failed'), type: 'error' });
    }
  };

  const downloadImage = async () => {
    if (!boardRef.current || exporting) return;
    setExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 60));
    try {
      await downloadElementAsImage(
        boardRef.current,
        `mypick-live-${performanceId ?? 'live'}.png`,
        EXPORT_BG
      );
    } finally {
      setExporting(false);
    }
  };

  const dialogItems =
    pickTarget?.kind === 'unit'
      ? (unitGroups
          .find((g) => g.artist.id === pickTarget.artistId)
          ?.entries.map((entry) => toSongOption(entry.song)) ?? [])
      : pickTarget?.slotKind === 'costume' && costumeOptions.length > 0
        ? costumeOptions
        : songOptions;

  const selectedOptionId =
    pickTarget?.kind === 'unit'
      ? state?.unitPicks[pickTarget.artistId]
      : pickTarget
        ? state?.awards[pickTarget.awardKey]?.id
        : undefined;

  const pickDialogTitle =
    pickTarget?.kind === 'unit'
      ? t('mypick_live.pick_song_for', { name: pickTarget.label })
      : pickTarget?.slotKind === 'costume' && costumeOptions.length > 0
        ? t('mypick_live.pick_costume')
        : t('mypick_live.pick_song');

  const liveName = performance
    ? performance.performanceName?.trim() || performance.concertName?.trim() || performance.tourName
    : '';
  const liveSub = performance
    ? [performance.date, performance.venue].filter(Boolean).join(' • ')
    : undefined;
  const accent = seriesColor(performance?.seriesIds);
  const hasLive = Boolean(state?.performanceId);
  const hasSongs = entries.length > 0;

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

        <HStack gap="2" flexWrap="wrap">
          <Button
            onClick={() => setLivePickerOpen(true)}
            gap="2"
            color="white"
            bgColor="accent.default"
          >
            <FaMusic /> {hasLive ? t('mypick_live.change_live') : t('mypick_live.choose_live')}
          </Button>
          {hasLive && hasSongs && (
            <>
              <Button
                onClick={() => void shareUrl()}
                variant="outline"
                gap="2"
                borderColor="mypick.actionBorder"
                color="mypick.text"
                bgColor="mypick.actionMuted"
              >
                <FaLink /> {t('mypick_live.share_url')}
              </Button>
              <Button
                onClick={() => void downloadImage()}
                variant="outline"
                disabled={exporting}
                gap="2"
                borderColor="mypick.actionBorder"
                color="mypick.text"
                bgColor="mypick.actionMuted"
              >
                <FaDownload /> {t('mypick_live.download_image')}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                gap="2"
                borderColor="mypick.actionBorder"
                color="mypick.text"
                bgColor="mypick.actionMuted"
              >
                <FaRotateLeft /> {t('mypick_live.reset')}
              </Button>
            </>
          )}
        </HStack>

        {!hasLive ? (
          <Stack
            gap="1"
            borderColor="mypick.border"
            borderRadius="l2"
            borderWidth="1px"
            p="8"
            textAlign="center"
            bgColor="mypick.panel"
          >
            <Text fontWeight="bold">{t('mypick_live.no_live_selected')}</Text>
            <Text color="mypick.muted" fontSize="sm">
              {t('mypick_live.no_live_hint')}
            </Text>
          </Stack>
        ) : !hasSongs ? (
          <Text color="mypick.muted">{t('mypick_live.no_songs')}</Text>
        ) : (
          <>
            <LiveMyPickBoard
              ref={boardRef}
              liveName={liveName}
              liveSub={liveSub}
              awards={awardCards}
              units={unitCards}
              editable={!exporting}
              exporting={exporting}
              onPick={handlePick}
              onClear={handleClear}
              onRemove={handleRemoveAward}
              accentColor={accent}
            />

            <HStack gap="2" maxW="md">
              <Input
                value={newAwardLabel}
                onChange={(e) => setNewAwardLabel(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') addCustomAward();
                }}
                placeholder={t('mypick_live.add_award_placeholder')}
                borderColor="mypick.border"
                color="mypick.text"
                bgColor="mypick.tile"
              />
              <Button
                onClick={addCustomAward}
                variant="outline"
                disabled={!newAwardLabel.trim()}
                gap="2"
                borderColor="mypick.actionBorder"
                color="mypick.text"
                bgColor="mypick.actionMuted"
              >
                <FaPlus /> {t('mypick_live.add_award')}
              </Button>
            </HStack>
          </>
        )}
      </Stack>

      <LivePickerDialog
        open={livePickerOpen}
        onOpenChange={({ open }) => setLivePickerOpen(open)}
        onSelect={handleSelectLive}
      />

      <PickDialog
        title={pickDialogTitle}
        items={dialogItems}
        selectedIds={selectedOptionId ? [selectedOptionId] : []}
        max={1}
        open={pickTarget !== null}
        onClose={() => setPickTarget(null)}
        onChange={(ids) => handleSelectOption(ids[ids.length - 1])}
        display="tiles"
      />
    </>
  );
}
