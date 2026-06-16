import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaXmark } from 'react-icons/fa6';
import { Box, Stack } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { usePerformances } from '~/hooks/useData';
import { fuzzySearch, getSearchScore, type SearchableItem } from '~/utils/search';
import type { Performance } from '~/types';

export interface LivePickerDialogProps {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  onSelect: (performanceId: string) => void;
}

const liveTitle = (performance: Performance) =>
  performance.performanceName?.trim() || performance.concertName?.trim() || performance.tourName;

export function LivePickerDialog({ open, onOpenChange, onSelect }: LivePickerDialogProps) {
  const { t } = useTranslation();
  const performances = usePerformances();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const withSetlist = useMemo(
    () => performances.filter((p) => p.hasSetlist).toSorted((a, b) => b.date.localeCompare(a.date)),
    [performances]
  );

  const filtered = useMemo(() => {
    const query = search.trim();
    if (!query) return withSetlist;
    return withSetlist
      .map((performance) => {
        const searchable: SearchableItem = {
          id: performance.id,
          name: liveTitle(performance),
          englishName: `${performance.tourName} ${performance.venue}`
        };
        return { performance, searchable };
      })
      .filter(({ searchable }) => fuzzySearch(searchable, query))
      .toSorted((a, b) => getSearchScore(b.searchable, query) - getSearchScore(a.searchable, query))
      .map(({ performance }) => performance);
  }, [withSetlist, search]);

  const handleSelect = (performance: Performance) => {
    onSelect(performance.id);
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
          maxW="2xl"
          maxH="80vh"
          mx="4"
          color="mypick.text"
          bgColor="mypick.panelSolid"
        >
          <Stack flex="1" gap="4" minH="0" p={{ base: '4', md: '5' }} overflow="hidden">
            <Dialog.Title>
              <Text fontSize="xl" fontWeight="bold">
                {t('mypick_live.choose_live')}
              </Text>
            </Dialog.Title>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              borderColor="mypick.border"
              borderRadius="l2"
              h="12"
              minH="12"
              px="4"
              color="mypick.text"
              fontSize="md"
              bgColor="mypick.tile"
            />

            <Box flex="1" minH="0" overscrollBehavior="contain" overflowY="auto">
              {filtered.length === 0 ? (
                <Text py="8" color="mypick.muted" textAlign="center">
                  {t('common.no_results')}
                </Text>
              ) : (
                <Stack gap="2">
                  {filtered.map((performance) => (
                    <Stack
                      key={performance.id}
                      role="button"
                      tabIndex={0}
                      aria-label={liveTitle(performance)}
                      onClick={() => handleSelect(performance)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(performance);
                        }
                      }}
                      cursor="pointer"
                      gap="0"
                      borderColor="mypick.border"
                      borderRadius="l2"
                      borderWidth="1px"
                      p="3"
                      bgColor="mypick.tile"
                      _hover={{ borderColor: 'mypick.borderStrong', bgColor: 'mypick.accentSoft' }}
                    >
                      <Text fontSize="sm" fontWeight="bold" overflowWrap="anywhere">
                        {liveTitle(performance)}
                      </Text>
                      <Text color="mypick.muted" fontSize="xs">
                        {performance.date} • {performance.venue || 'TBA'}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
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
