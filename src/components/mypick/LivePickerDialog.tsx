import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp, FaXmark } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { Checkbox } from '~/components/ui/checkbox';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { legLabel } from '~/components/events/TourCard';
import { usePerformances, useSetlists, useSongById } from '~/hooks/useData';
import { groupByTour } from '~/utils/tour';
import { localizedName } from '~/utils/names';
import { getLiveSongEntriesForPerformances } from '~/utils/mypick-live';
import type { Performance } from '~/types';

export interface LivePickerDialogProps {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  /** Performance ids already on the board, used to seed the selection. */
  initialSelectedIds?: string[];
  onConfirm: (performanceIds: string[]) => void;
}

const groupKey = (tourName: string, startDate: string) => `${tourName}__${startDate}`;
const legRowLabel = (performance: Performance) =>
  legLabel(performance) || performance.date.slice(5).replace('-', '/');

export function LivePickerDialog({
  open,
  onOpenChange,
  initialSelectedIds,
  onConfirm
}: LivePickerDialogProps) {
  const { t, i18n } = useTranslation();
  const performances = usePerformances();
  const setlists = useSetlists();
  const songById = useSongById();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(initialSelectedIds ?? []));
      setSearch('');
      setExpanded(new Set());
    }
    // oxlint-disable-next-line exhaustive-deps
  }, [open]);

  const setlisted = useMemo(() => performances.filter((p) => p.hasSetlist), [performances]);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = query
      ? setlisted.filter(
          (p) =>
            p.tourName.toLowerCase().includes(query) ||
            (p.concertName ?? '').toLowerCase().includes(query) ||
            (p.performanceName ?? '').toLowerCase().includes(query) ||
            (p.venue ?? '').toLowerCase().includes(query)
        )
      : setlisted;
    return groupByTour(matched);
  }, [setlisted, search]);

  const isSearching = search.trim().length > 0;

  const selectedPerformanceIds = useMemo(
    () =>
      performances
        .filter((p) => selectedIds.has(p.id))
        .toSorted((a, b) => a.date.localeCompare(b.date))
        .map((p) => p.id),
    [performances, selectedIds]
  );

  const previewEntries = useMemo(
    () => getLiveSongEntriesForPerformances(selectedPerformanceIds, setlists, songById),
    [selectedPerformanceIds, setlists, songById]
  );

  const toggleExpanded = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleIds = (ids: string[]) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      const remove = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (remove) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const checkState = (ids: string[]): boolean | 'indeterminate' => {
    const count = ids.filter((id) => selectedIds.has(id)).length;
    if (count === 0) return false;
    if (count === ids.length) return true;
    return 'indeterminate';
  };

  const confirm = () => {
    if (selectedPerformanceIds.length === 0) return;
    onConfirm(selectedPerformanceIds);
    onOpenChange({ open: false });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} lazyMount unmountOnExit>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content
          display="flex"
          flexDirection="column"
          w="full"
          maxW="4xl"
          h="85vh"
          maxH="85vh"
          mx="4"
          color="mypick.text"
          bgColor="mypick.panelSolid"
        >
          <Stack flex="1" gap="3" minH="0" p={{ base: '4', md: '5' }} overflow="hidden">
            <Stack gap="0.5">
              <Dialog.Title>
                <Text fontSize="xl" fontWeight="bold">
                  {t('mypick_live.picker.title')}
                </Text>
              </Dialog.Title>
              <Text color="mypick.muted" fontSize="sm">
                {t('mypick_live.picker.description')}
              </Text>
            </Stack>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('mypick_live.picker.search')}
              borderColor="mypick.border"
              borderRadius="l2"
              h="11"
              minH="11"
              px="4"
              color="mypick.text"
              bgColor="mypick.tile"
            />

            <Grid
              flex="1"
              gap="3"
              gridTemplateColumns={{ base: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' }}
              minH="0"
            >
              {/* Event / performance tree */}
              <Box minH="0" overscrollBehavior="contain" overflowY="auto">
                {groups.length === 0 ? (
                  <Text py="8" color="mypick.muted" fontSize="sm" textAlign="center">
                    {t('common.no_results')}
                  </Text>
                ) : (
                  <Stack gap="2">
                    {groups.map((group) => {
                      const key = groupKey(group.tourName, group.startDate);
                      const ids = group.legs.map((leg) => leg.id);
                      const multi = group.legs.length > 1;
                      const isExpanded = isSearching || expanded.has(key) || !multi;
                      return (
                        <Box
                          key={key}
                          borderColor="mypick.border"
                          borderRadius="l2"
                          borderWidth="1px"
                          p="2.5"
                          bgColor="mypick.tile"
                        >
                          <HStack gap="2" justifyContent="space-between" alignItems="flex-start">
                            <Checkbox
                              checked={checkState(ids)}
                              onCheckedChange={() => toggleIds(ids)}
                              aria-label={group.tourName}
                              flex="1"
                              minW="0"
                            >
                              <HStack gap="2" alignItems="baseline" minW="0">
                                <Text
                                  minW="0"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  lineHeight="1.4"
                                  overflowWrap="anywhere"
                                >
                                  {group.tourName}
                                </Text>
                                {multi && (
                                  <Text flexShrink={0} color="mypick.muted" fontSize="xs">
                                    {group.legs.length}
                                  </Text>
                                )}
                              </HStack>
                            </Checkbox>
                            {multi && !isSearching && (
                              <IconButton
                                aria-label={
                                  isExpanded
                                    ? t('mypick_live.picker.hide_details')
                                    : t('mypick_live.picker.show_details')
                                }
                                variant="ghost"
                                size="xs"
                                onClick={() => toggleExpanded(key)}
                              >
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                              </IconButton>
                            )}
                          </HStack>

                          {multi && isExpanded && (
                            <Stack gap="1.5" pl="6" pt="2">
                              {group.legs.map((leg) => (
                                <Checkbox
                                  key={leg.id}
                                  size="sm"
                                  checked={selectedIds.has(leg.id)}
                                  onCheckedChange={() => toggleIds([leg.id])}
                                  aria-label={legRowLabel(leg)}
                                >
                                  <Stack gap="0" minW="0">
                                    <Text fontSize="sm">{legRowLabel(leg)}</Text>
                                    <Text color="mypick.muted" fontSize="xs">
                                      {leg.date} • {leg.venue || 'TBA'}
                                    </Text>
                                  </Stack>
                                </Checkbox>
                              ))}
                            </Stack>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* Merged-setlist preview */}
              <Stack
                display={{ base: 'none', md: 'flex' }}
                gap="0"
                borderColor="mypick.border"
                borderRadius="l2"
                borderWidth="1px"
                minH="0"
                bgColor="mypick.tile"
                overflow="hidden"
              >
                {selectedPerformanceIds.length === 0 ? (
                  <Box p="3">
                    <Text color="mypick.muted" fontSize="sm">
                      {t('mypick_live.picker.select_hint')}
                    </Text>
                  </Box>
                ) : (
                  <>
                    <Stack
                      gap="0.5"
                      borderBottomWidth="1px"
                      borderBottomColor="mypick.border"
                      p="3"
                    >
                      <Text fontSize="sm" fontWeight="bold">
                        {t('mypick_live.picker.selected', {
                          count: selectedPerformanceIds.length
                        })}
                      </Text>
                      <Text color="mypick.muted" fontSize="xs">
                        {t('mypick_live.picker.song_count', { count: previewEntries.length })}
                      </Text>
                    </Stack>
                    <Box flex="1" minH="0" p="2" overscrollBehavior="contain" overflowY="auto">
                      {previewEntries.length === 0 ? (
                        <Text p="2" color="mypick.muted" fontSize="sm">
                          {t('mypick_live.no_songs')}
                        </Text>
                      ) : (
                        <Stack gap="0">
                          {previewEntries.map((entry) => (
                            <HStack key={entry.song.id} gap="2" py="1" px="2">
                              <Text
                                flexShrink={0}
                                w="9"
                                color="mypick.muted"
                                fontFamily="mono"
                                fontSize="2xs"
                                fontWeight="bold"
                              >
                                {entry.label}
                              </Text>
                              <Text fontSize="sm" lineClamp={1}>
                                {localizedName(
                                  i18n.language,
                                  entry.song.name,
                                  entry.song.englishName
                                )}
                              </Text>
                            </HStack>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </>
                )}
              </Stack>
            </Grid>

            <HStack
              gap="2"
              justifyContent="flex-end"
              borderTopWidth="1px"
              borderTopColor="mypick.border"
              pt="3"
            >
              <Button variant="ghost" onClick={() => onOpenChange({ open: false })}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={confirm}
                disabled={selectedPerformanceIds.length === 0 || previewEntries.length === 0}
                color="white"
                bgColor="accent.default"
              >
                {t('mypick_live.picker.confirm')}
              </Button>
            </HStack>
          </Stack>
          <Dialog.CloseTrigger asChild position="absolute" top="3" right="3">
            <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
              <FaXmark />
            </IconButton>
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
