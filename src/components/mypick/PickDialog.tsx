import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaXmark } from 'react-icons/fa6';
import { Stack, HStack } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';

export interface PickItem {
  id: string;
  label: string;
  sub?: string;
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 100);
    return items
      .filter((item) => `${item.label} ${item.sub ?? ''}`.toLowerCase().includes(q))
      .slice(0, 100);
  }, [items, search]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < max) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content display="flex" flexDirection="column" maxW="lg" maxH="80vh">
          <Stack flex="1" gap="3" p="6" overflow="hidden">
            <HStack justifyContent="space-between">
              <Dialog.Title>{title}</Dialog.Title>
              <Text color="fg.muted" fontSize="sm">
                {selectedIds.length}/{max}
              </Text>
            </HStack>
            <Input
              size="sm"
              value={search}
              placeholder={t('common.search')}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Stack flex="1" gap="1" overflowY="auto">
              {filtered.map((item) => {
                const active = selectedIds.includes(item.id);
                return (
                  <Button
                    key={item.id}
                    size="sm"
                    variant={active ? 'solid' : 'ghost'}
                    onClick={() => toggle(item.id)}
                    justifyContent="flex-start"
                    h="auto"
                    py="2"
                  >
                    <Stack gap="0" alignItems="flex-start" minW="0" textAlign="left">
                      <Text color="inherit" fontSize="sm" lineClamp={1}>
                        {item.label}
                      </Text>
                      {item.sub && (
                        <Text color={active ? 'inherit' : 'fg.muted'} fontSize="xs" lineClamp={1}>
                          {item.sub}
                        </Text>
                      )}
                    </Stack>
                  </Button>
                );
              })}
            </Stack>
            <Button onClick={onClose}>{t('common.close')}</Button>
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
