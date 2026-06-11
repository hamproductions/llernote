import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaPlus } from 'react-icons/fa6';
import { Stack, Wrap, HStack } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { PickDialog, type PickItem } from '~/components/mypick/PickDialog';
import { MyPickCard } from '~/components/mypick/MyPickCard';
import { NativeSelect } from '~/components/events/NativeSelect';
import { Metadata } from '~/components/layout/Metadata';
import { useMyPick } from '~/hooks/useAttendance';
import { useArtists, useEventYears, usePerformances, useSongs } from '~/hooks/useData';
import { downloadElementAsImage } from '~/utils/share';
import { useToaster } from '~/context/ToasterContext';

const MAX_PICKS = 5;

export default function Page() {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const { myPick, setMyPick } = useMyPick();
  const performances = usePerformances();
  const artists = useArtists();
  const songs = useSongs();
  const years = useEventYears();
  const cardRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<'events' | 'groups' | 'songs'>();

  const eventItems: PickItem[] = useMemo(
    () =>
      performances.map((p) => ({
        id: p.id,
        label: p.tourName,
        sub: `${p.date} ${p.venue}`
      })),
    [performances]
  );
  const artistItems: PickItem[] = useMemo(
    () => artists.map((a) => ({ id: a.id, label: a.name, sub: a.englishName })),
    [artists]
  );
  const songItems: PickItem[] = useMemo(
    () => songs.map((s) => ({ id: s.id, label: s.name, sub: s.englishName })),
    [songs]
  );

  const pick = myPick ?? {
    eventIds: [],
    artistIds: [],
    songIds: [],
    year: null,
    updatedAt: ''
  };
  const hasContent =
    pick.eventIds.length > 0 ||
    pick.artistIds.length > 0 ||
    pick.songIds.length > 0 ||
    pick.year != null;

  return (
    <>
      <Metadata title={`${t('mypick.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <Stack gap="1">
          <Heading as="h1" fontSize="2xl">
            {t('mypick.title')}
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            {t('mypick.description')}
          </Text>
        </Stack>

        <Wrap gap="2" alignItems="center">
          <Button size="sm" variant="outline" onClick={() => setDialog('events')}>
            <FaPlus />
            {t('mypick.add_event')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog('groups')}>
            <FaPlus />
            {t('mypick.add_group')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog('songs')}>
            <FaPlus />
            {t('mypick.add_song')}
          </Button>
          <HStack gap="2">
            <Text fontSize="sm">{t('mypick.favorite_year')}</Text>
            <NativeSelect
              aria-label={t('mypick.select_year')}
              value={pick.year != null ? String(pick.year) : ''}
              placeholder={t('mypick.select_year')}
              options={years.map((y) => ({ value: y, label: y }))}
              onChange={(year) => setMyPick({ year: year ? Number(year) : null })}
            />
          </HStack>
        </Wrap>

        {hasContent ? (
          <>
            <MyPickCard ref={cardRef} myPick={pick} />
            <Wrap gap="2">
              <Button
                size="sm"
                onClick={async () => {
                  if (cardRef.current) {
                    await downloadElementAsImage(cardRef.current, 'llernote-mypick.png');
                    toast({ title: t('share.image_generated'), type: 'success' });
                  }
                }}
              >
                <FaDownload />
                {t('share.download_image')}
              </Button>
            </Wrap>
          </>
        ) : (
          <Text color="fg.muted">{t('mypick.empty')}</Text>
        )}

        <PickDialog
          title={`${t('mypick.favorite_events')} (${t('mypick.pick_limit', { count: MAX_PICKS })})`}
          items={eventItems}
          selectedIds={pick.eventIds}
          max={MAX_PICKS}
          open={dialog === 'events'}
          onClose={() => setDialog(undefined)}
          onChange={(eventIds) => setMyPick({ eventIds })}
        />
        <PickDialog
          title={`${t('mypick.favorite_groups')} (${t('mypick.pick_limit', { count: MAX_PICKS })})`}
          items={artistItems}
          selectedIds={pick.artistIds}
          max={MAX_PICKS}
          open={dialog === 'groups'}
          onClose={() => setDialog(undefined)}
          onChange={(artistIds) => setMyPick({ artistIds })}
        />
        <PickDialog
          title={`${t('mypick.favorite_songs')} (${t('mypick.pick_limit', { count: MAX_PICKS })})`}
          items={songItems}
          selectedIds={pick.songIds}
          max={MAX_PICKS}
          open={dialog === 'songs'}
          onClose={() => setDialog(undefined)}
          onChange={(songIds) => setMyPick({ songIds })}
        />
      </Stack>
    </>
  );
}
