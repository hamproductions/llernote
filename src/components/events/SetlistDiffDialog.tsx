import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaXmark } from 'react-icons/fa6';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import {
  SetlistPerformancePicker,
  type SetlistPerformanceOption
} from './SetlistPerformancePicker';
import { sortedPerformances as performances } from '~/data/core';
import { useAllSetlists } from '~/hooks/useSetlists';
import { useSongById } from '~/hooks/useSongData';
import { useAbbreviations } from '~/hooks/useAbbreviations';
import { compareSetlists } from '~/utils/setlist-insights';
import { localizedName } from '~/utils/names';
import type { Performance } from '~/types';

export function SetlistDiffDialog({
  performance,
  previousPerformanceId,
  open,
  onOpenChange
}: {
  performance: Performance;
  previousPerformanceId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const setlists = useAllSetlists();
  const songById = useSongById();
  const { eventAliases } = useAbbreviations();
  const [diffFromPerformanceId, setDiffFromPerformanceId] = useState('');
  const [diffToPerformanceId, setDiffToPerformanceId] = useState('');

  const nearestSameTourSetlistPerformance = performances
    .filter(
      (candidate) =>
        candidate.id !== performance.id &&
        candidate.tourName === performance.tourName &&
        Boolean(setlists[candidate.id])
    )
    .sort((a, b) => {
      const distanceA = Math.abs(new Date(a.date).getTime() - new Date(performance.date).getTime());
      const distanceB = Math.abs(new Date(b.date).getTime() - new Date(performance.date).getTime());
      return distanceA - distanceB || a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    })[0];
  const defaultDiffFromPerformanceId =
    nearestSameTourSetlistPerformance?.id ?? previousPerformanceId ?? '';
  const selectedDiffFromPerformanceId = diffFromPerformanceId || defaultDiffFromPerformanceId;
  const selectedDiffToPerformanceId = diffToPerformanceId || performance.id;
  const setlistDiff = compareSetlists(
    setlists[selectedDiffFromPerformanceId],
    setlists[selectedDiffToPerformanceId]
  );
  const setlistPerformanceOptions: SetlistPerformanceOption[] = performances
    .filter((candidate) => setlists[candidate.id])
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map((candidate) => {
      const title = candidate.tourName;
      const subtitle = [candidate.concertName, candidate.performanceName].filter(Boolean).join(' ');
      const venue = candidate.venue;
      return {
        value: candidate.id,
        date: candidate.date,
        title,
        subtitle,
        venue,
        isSameTour: candidate.tourName === performance.tourName,
        searchText: [candidate.date, title, subtitle, venue, candidate.note]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
        aliases: eventAliases(candidate.eventId)
      };
    });
  const formatSongName = (songId: string) => {
    const song = songById.get(songId);
    return song ? localizedName(i18n.language, song.name, song.englishName) : songId;
  };
  const selectedDiffFromLabel = (() => {
    const selected = setlistPerformanceOptions.find(
      (option) => option.value === selectedDiffFromPerformanceId
    );
    return selected ? `${selected.date} ${selected.title}` : t('events.setlist_diff_from');
  })();
  const selectedDiffToLabel = (() => {
    const selected = setlistPerformanceOptions.find(
      (option) => option.value === selectedDiffToPerformanceId
    );
    return selected ? `${selected.date} ${selected.title}` : t('events.setlist_diff_to');
  })();
  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Dialog.Backdrop zIndex="70" />
      <Dialog.Positioner zIndex="71">
        <Dialog.Content w="full" maxW="3xl" maxH="85vh" mx="4" overflowY="auto">
          <Stack gap="4" p={{ base: '4', md: '6' }}>
            <Stack gap="1" pr="8">
              <Dialog.Title>{t('events.setlist_diff_mode')}</Dialog.Title>
              <Text color="fg.muted" fontSize="sm">
                {t('events.setlist_diff_description')}
              </Text>
            </Stack>

            <Box display="grid" gap="3" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}>
              <SetlistPerformancePicker
                label={t('events.setlist_diff_from')}
                value={selectedDiffFromPerformanceId}
                options={setlistPerformanceOptions}
                currentPerformanceId={performance.id}
                previousPerformanceId={previousPerformanceId}
                onChange={setDiffFromPerformanceId}
              />
              <SetlistPerformancePicker
                label={t('events.setlist_diff_to')}
                value={selectedDiffToPerformanceId}
                options={setlistPerformanceOptions}
                currentPerformanceId={performance.id}
                previousPerformanceId={previousPerformanceId}
                onChange={setDiffToPerformanceId}
              />
            </Box>

            <HStack gap="3" flexWrap="wrap">
              <Badge size="sm" variant="outline">
                {t('events.setlist_shared', { count: setlistDiff.sharedSongIds.length })}
              </Badge>
              <Badge size="sm" variant="solid">
                {t('events.setlist_added', { count: setlistDiff.addedSongIds.length })}
              </Badge>
              <Badge size="sm" variant="outline">
                {t('events.setlist_removed', { count: setlistDiff.removedSongIds.length })}
              </Badge>
            </HStack>

            <Stack
              gap="0"
              borderColor="border.subtle"
              borderRadius="l2"
              borderWidth="1px"
              overflow="hidden"
            >
              <HStack
                gap="2"
                borderBottomWidth="1px"
                borderBottomColor="border.subtle"
                py="2"
                px="3"
                bgColor="bg.subtle"
              >
                <Text flex="1" color="fg.muted" fontSize="2xs" lineClamp={1}>
                  − {selectedDiffFromLabel}
                </Text>
                <Text flex="1" color="fg.muted" fontSize="2xs" lineClamp={1}>
                  + {selectedDiffToLabel}
                </Text>
              </HStack>
              {setlistDiff.rows.map((row, rowIndex) => (
                <HStack
                  key={`${row.type}-${row.songId}-${rowIndex}`}
                  gap="2"
                  alignItems="center"
                  borderBottomWidth="1px"
                  borderBottomColor="border.subtle"
                  py="1.5"
                  px="3"
                  bgColor={
                    row.type === 'added'
                      ? 'green.950/35'
                      : row.type === 'removed'
                        ? 'red.950/35'
                        : 'transparent'
                  }
                >
                  <Text
                    minW="4"
                    color={
                      row.type === 'added'
                        ? 'green.300'
                        : row.type === 'removed'
                          ? 'red.300'
                          : 'fg.subtle'
                    }
                    fontFamily="mono"
                    fontSize="sm"
                  >
                    {row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}
                  </Text>
                  <Text minW="8" color="fg.subtle" fontFamily="mono" fontSize="xs">
                    {String(rowIndex + 1).padStart(2, '0')}
                  </Text>
                  <Text fontSize="sm" lineClamp={1}>
                    {formatSongName(row.songId)}
                  </Text>
                </HStack>
              ))}
            </Stack>
          </Stack>
          <Dialog.CloseTrigger asChild position="absolute" top="2" right="2">
            <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
              <FaXmark />
            </IconButton>
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
