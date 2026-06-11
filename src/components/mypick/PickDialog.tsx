import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaXmark } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';

export interface PickItem {
  id: string;
  label: string;
  sub?: string;
  image?: string;
}

function Tile({ item, active, onClick }: { item: PickItem; active: boolean; onClick: () => void }) {
  return (
    <Stack
      onClick={onClick}
      cursor="pointer"
      position="relative"
      gap="1"
      alignItems="center"
      borderColor={active ? 'accent.default' : 'border.subtle'}
      borderRadius="l2"
      borderWidth="2px"
      p="2"
      bgColor={active ? 'accent.a3' : 'bg.default'}
      transition="colors"
      _hover={{ borderColor: 'accent.8' }}
    >
      <Box borderRadius="full" w="16" h="16" bgColor="bg.subtle" overflow="hidden">
        <img
          src={item.image}
          alt=""
          loading="lazy"
          width="64"
          height="64"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
      </Box>
      <Text fontSize="xs" fontWeight="medium" textAlign="center" lineClamp={2}>
        {item.label}
      </Text>
      {item.sub && (
        <Text color="fg.muted" fontSize="2xs" textAlign="center" lineClamp={1}>
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
      onClick={onClick}
      cursor="pointer"
      gap="2"
      borderColor={active ? 'accent.default' : 'border.subtle'}
      borderRadius="l2"
      borderWidth="1px"
      p="2"
      bgColor={active ? 'accent.a3' : 'bg.default'}
      transition="colors"
      _hover={{ borderColor: 'accent.8' }}
    >
      <Stack flex="1" gap="0" minW="0">
        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
          {item.label}
        </Text>
        {item.sub && (
          <Text color="fg.muted" fontSize="xs" lineClamp={1}>
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
  onClose,
  onChange
}: {
  title: string;
  items: PickItem[];
  selectedIds: string[];
  max: number;
  open: boolean;
  onClose: () => void;
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const hasImages = items.some((item) => item.image);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 120);
    return items
      .filter((item) => `${item.label} ${item.sub ?? ''}`.toLowerCase().includes(q))
      .slice(0, 120);
  }, [items, search]);

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
        <Dialog.Content display="flex" flexDirection="column" w="full" maxW="2xl" maxH="80vh">
          <Stack flex="1" gap="3" p="5" overflow="hidden">
            <HStack justifyContent="space-between" pr="8">
              <Dialog.Title>{title}</Dialog.Title>
              {max > 1 && (
                <Text color="fg.muted" fontSize="sm">
                  {selectedIds.length}/{max}
                </Text>
              )}
            </HStack>
            <Input
              size="sm"
              value={search}
              placeholder={t('common.search')}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
            />
            <Box flex="1" overflowY="auto">
              {hasImages ? (
                <Grid
                  gap="2"
                  gridTemplateColumns={{ base: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)' }}
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
                <Stack gap="1">
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
