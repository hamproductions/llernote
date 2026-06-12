import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaMusic, FaXmark } from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { fuzzySearch, getSearchScore, type SearchableItem } from '~/utils/search';

export interface PickItem {
  id: string;
  label: string;
  sub?: string;
  image?: string;
  englishName?: string;
  phoneticName?: string;
  searchText?: string;
  category?: string;
  disabled?: boolean;
}

function TileImage({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <Box
      position="relative"
      flexShrink={0}
      borderColor="border.subtle"
      borderRadius="l2"
      borderWidth="1px"
      w="full"
      pb="100%"
      bgColor="bg.default"
      overflow="hidden"
    >
      {failed || !src ? (
        <Center inset="0" position="absolute" color="fg.subtle">
          <FaMusic />
        </Center>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute',
            inset: 0,
            objectFit: 'cover',
            width: '100%',
            height: '100%'
          }}
          onError={() => setFailed(true)}
        />
      )}
    </Box>
  );
}

function Tile({ item, active, onClick }: { item: PickItem; active: boolean; onClick: () => void }) {
  return (
    <Stack
      onClick={item.disabled ? undefined : onClick}
      aria-disabled={item.disabled}
      cursor={item.disabled ? 'not-allowed' : 'pointer'}
      position="relative"
      gap="2"
      alignItems="center"
      borderColor={active ? 'mypick.borderStrong' : 'mypick.border'}
      borderRadius="l2"
      borderWidth="1px"
      p="2.5"
      bgColor={active ? 'mypick.action' : item.disabled ? 'mypick.tileDisabled' : 'mypick.tile'}
      opacity={item.disabled ? 0.46 : 1}
      transition="colors"
      _hover={
        item.disabled
          ? undefined
          : { borderColor: 'mypick.borderStrong', bgColor: 'mypick.accentSoft' }
      }
    >
      <TileImage src={item.image} />
      <Text
        color="mypick.text"
        fontSize="xs"
        fontWeight="semibold"
        textAlign="center"
        lineClamp={2}
      >
        {item.label}
      </Text>
      {item.sub && (
        <Text color="mypick.muted" fontSize="2xs" textAlign="center" lineClamp={1}>
          {item.sub}
        </Text>
      )}
      {active && (
        <Box position="absolute" top="1.5" right="1.5" color="accent.default">
          <FaCheck size={14} />
        </Box>
      )}
    </Stack>
  );
}

function Row({ item, active, onClick }: { item: PickItem; active: boolean; onClick: () => void }) {
  return (
    <HStack
      onClick={item.disabled ? undefined : onClick}
      aria-disabled={item.disabled}
      cursor={item.disabled ? 'not-allowed' : 'pointer'}
      gap="2"
      borderColor={active ? 'mypick.borderStrong' : 'mypick.border'}
      borderRadius="l2"
      borderWidth="1px"
      p="2"
      bgColor={active ? 'mypick.action' : item.disabled ? 'mypick.tileDisabled' : 'mypick.tile'}
      opacity={item.disabled ? 0.46 : 1}
      transition="colors"
      _hover={
        item.disabled
          ? undefined
          : { borderColor: 'mypick.borderStrong', bgColor: 'mypick.accentSoft' }
      }
    >
      <Stack flex="1" gap="0" minW="0">
        <Text color="mypick.text" fontSize="sm" fontWeight="semibold" lineClamp={1}>
          {item.label}
        </Text>
        {item.sub && (
          <Text color="mypick.muted" fontSize="xs" lineClamp={1}>
            {item.sub}
          </Text>
        )}
      </Stack>
      {active && (
        <Box flexShrink={0} color="accent.default">
          <FaCheck size={14} />
        </Box>
      )}
    </HStack>
  );
}

export function PickDialog({
  title,
  items,
  selectedIds,
  max,
  open,
  display = 'auto',
  categories,
  onClose,
  onChange
}: {
  title: string;
  items: PickItem[];
  selectedIds: string[];
  max: number;
  open: boolean;
  display?: 'auto' | 'tiles' | 'rows';
  categories?: { key: string; label: string }[];
  onClose: () => void;
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const hasImages = items.some((item) => item.image);
  const showTiles = display === 'tiles' || (display === 'auto' && hasImages);

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveCategory('');
    }
  }, [open]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.category) continue;
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [items]);
  const visibleCategories = (categories ?? []).filter(
    (category) => (categoryCounts.get(category.key) ?? 0) > 0
  );

  const filtered = useMemo(() => {
    const scoped = activeCategory
      ? items.filter((item) => item.category === activeCategory)
      : items;
    const q = search.trim();
    if (!q) return scoped.slice(0, 360);
    return scoped
      .map((item) => {
        const searchable: SearchableItem = {
          id: item.id,
          name: item.label,
          englishName: [item.englishName, item.sub, item.searchText].filter(Boolean).join(' '),
          phoneticName: item.phoneticName
        };
        return { item, searchable };
      })
      .filter(({ searchable }) => fuzzySearch(searchable, q))
      .toSorted((a, b) => getSearchScore(b.searchable, q) - getSearchScore(a.searchable, q))
      .map(({ item }) => item)
      .slice(0, 360);
  }, [items, search, activeCategory]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else if (max === 1) {
      onChange([id]);
    } else if (selectedIds.length < max) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content
          display="flex"
          flexDirection="column"
          w="full"
          maxW="xl"
          maxH="80vh"
          mx="4"
          color="mypick.text"
          bgColor="mypick.panelSolid"
        >
          <Stack flex="1" gap="3" minH="0" p={{ base: '4', md: '5' }} overflow="hidden">
            <HStack justifyContent="space-between" pr="8">
              <Dialog.Title>
                <Text fontSize="xl" fontWeight="bold">
                  {title}
                </Text>
              </Dialog.Title>
              {max > 1 && (
                <Text color="mypick.muted" fontSize="sm">
                  {Number.isFinite(max) ? `${selectedIds.length}/${max}` : selectedIds.length}
                </Text>
              )}
            </HStack>
            <Input
              value={search}
              placeholder={t('common.search')}
              onChange={(e) => setSearch(e.target.value)}
              alignSelf="stretch"
              borderColor="mypick.border"
              borderRadius="l2"
              h="12"
              minH="12"
              px="4"
              color="mypick.text"
              fontSize="md"
              bgColor="mypick.tile"
            />
            {visibleCategories.length > 0 && (
              <HStack gap="1.5" flexWrap="wrap">
                {[{ key: '', label: t('common.all') }, ...visibleCategories].map((category) => {
                  const selected = activeCategory === category.key;
                  const count = category.key
                    ? (categoryCounts.get(category.key) ?? 0)
                    : items.length;
                  return (
                    <Box
                      key={category.key}
                      as="button"
                      onClick={() => setActiveCategory(category.key)}
                      cursor="pointer"
                      borderColor={selected ? 'mypick.borderStrong' : 'mypick.border'}
                      borderRadius="full"
                      borderWidth="1px"
                      py="1"
                      px="3"
                      color={selected ? 'accent.default' : 'mypick.muted'}
                      fontSize="xs"
                      fontWeight="bold"
                      bgColor={selected ? 'mypick.action' : 'mypick.tile'}
                      _hover={{ borderColor: 'mypick.borderStrong', color: 'accent.default' }}
                    >
                      {category.label} {count}
                    </Box>
                  );
                })}
              </HStack>
            )}
            <Box flex="1" minH="0" overflowY="auto">
              {filtered.length === 0 && (
                <Text py="8" color="mypick.muted" fontSize="sm" textAlign="center">
                  {t('common.no_results')}
                </Text>
              )}
              {showTiles ? (
                <Grid
                  data-testid="pick-dialog-grid"
                  gap="2"
                  gridTemplateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }}
                >
                  {filtered.map((item) => (
                    <Tile
                      key={item.id}
                      item={item}
                      active={selectedIds.includes(item.id)}
                      onClick={() => toggle(item.id)}
                    />
                  ))}
                </Grid>
              ) : (
                <Stack data-testid="pick-dialog-list" gap="1">
                  {filtered.map((item) => (
                    <Row
                      key={item.id}
                      item={item}
                      active={selectedIds.includes(item.id)}
                      onClick={() => toggle(item.id)}
                    />
                  ))}
                </Stack>
              )}
            </Box>
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
