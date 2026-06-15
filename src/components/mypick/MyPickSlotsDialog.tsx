import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaFloppyDisk, FaPen, FaTrash, FaUpload, FaXmark } from 'react-icons/fa6';
import { HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { useMyPickSlots } from '~/hooks/useAttendance';
import { useToaster } from '~/context/ToasterContext';
import type { MyPickSnapshot } from '~/utils/attendance/storage';

interface MyPickSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: MyPickSnapshot;
  onLoad: (snapshot: MyPickSnapshot) => void;
}

const countPicks = (cells: Record<string, string | null>) =>
  Object.values(cells).filter((value) => value != null).length;

export function MyPickSlotsDialog({ open, onOpenChange, current, onLoad }: MyPickSlotsDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const {
    slots,
    activeId,
    saveMyPickSlot,
    renameMyPickSlot,
    overwriteMyPickSlot,
    deleteMyPickSlot,
    setActiveMyPickSlot
  } = useMyPickSlots();
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);

  const handleSave = () => {
    saveMyPickSlot(newName, current);
    setNewName('');
    toast({ title: t('mypick.slots.saved'), type: 'success' });
  };

  const handleLoad = (id: string) => {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;
    onLoad({ config: slot.config, cells: slot.cells });
    setActiveMyPickSlot(slot.id);
    toast({ title: t('mypick.slots.loaded', { name: slot.name }), type: 'success' });
    onOpenChange(false);
  };

  const handleOverwrite = (id: string) => {
    overwriteMyPickSlot(id, current);
    toast({ title: t('mypick.slots.overwritten'), type: 'success' });
  };

  const handleRename = (id: string) => {
    renameMyPickSlot(id, renameValue);
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = (id: string) => {
    deleteMyPickSlot(id);
    setConfirmingDeleteId(null);
    toast({ title: t('mypick.slots.deleted'), type: 'success' });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content w="full" maxW="md" mx="4">
          <Stack gap="4" p={{ base: '4', md: '6' }}>
            <Stack gap="1">
              <Dialog.Title>{t('mypick.slots.title')}</Dialog.Title>
              <Text color="fg.muted" fontSize="sm">
                {t('mypick.slots.description')}
              </Text>
            </Stack>

            <HStack gap="2" alignItems="flex-end">
              <Input
                value={newName}
                placeholder={t('mypick.slots.name_placeholder')}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
              />
              <Button onClick={handleSave} gap="2" flexShrink="0">
                <FaFloppyDisk size={12} />
                {t('mypick.slots.save_new')}
              </Button>
            </HStack>

            <Stack gap="2" maxH="sm" overflowY="auto">
              {slots.length === 0 && (
                <Text py="4" color="fg.muted" fontSize="sm" textAlign="center">
                  {t('mypick.slots.empty')}
                </Text>
              )}
              {slots.map((slot) => {
                const isActive = slot.id === activeId;
                const isRenaming = slot.id === renamingId;
                const isConfirming = slot.id === confirmingDeleteId;
                return (
                  <Stack
                    key={slot.id}
                    gap="2"
                    borderColor={isActive ? 'accent.default' : 'border.default'}
                    borderRadius="l2"
                    borderWidth="1px"
                    p="3"
                    bgColor={isActive ? 'accent.subtle' : 'bg.default'}
                  >
                    {isRenaming ? (
                      <HStack gap="2">
                        <Input
                          size="sm"
                          value={renameValue}
                          autoFocus
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(slot.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                        />
                        <IconButton
                          aria-label={t('common.save', { defaultValue: 'Save' })}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRename(slot.id)}
                        >
                          <FaCheck />
                        </IconButton>
                        <IconButton
                          aria-label={t('common.cancel')}
                          size="sm"
                          variant="ghost"
                          onClick={() => setRenamingId(null)}
                        >
                          <FaXmark />
                        </IconButton>
                      </HStack>
                    ) : (
                      <HStack gap="2" justifyContent="space-between">
                        <Stack gap="0" minW="0">
                          <HStack gap="2">
                            <Text fontWeight="semibold" truncate>
                              {slot.name}
                            </Text>
                            {isActive && (
                              <Text flexShrink="0" color="accent.default" fontSize="xs">
                                {t('mypick.slots.active')}
                              </Text>
                            )}
                          </HStack>
                          <Text color="fg.muted" fontSize="xs">
                            {t('mypick.slots.summary', {
                              count: countPicks(slot.cells),
                              date: formatDate(slot.updatedAt)
                            })}
                          </Text>
                        </Stack>
                        <HStack gap="1" flexShrink="0">
                          <Button size="xs" variant="subtle" onClick={() => handleLoad(slot.id)}>
                            {t('mypick.slots.load')}
                          </Button>
                          <IconButton
                            aria-label={t('mypick.slots.overwrite')}
                            title={t('mypick.slots.overwrite')}
                            size="xs"
                            variant="ghost"
                            onClick={() => handleOverwrite(slot.id)}
                          >
                            <FaUpload />
                          </IconButton>
                          <IconButton
                            aria-label={t('mypick.slots.rename')}
                            title={t('mypick.slots.rename')}
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              setRenamingId(slot.id);
                              setRenameValue(slot.name);
                            }}
                          >
                            <FaPen />
                          </IconButton>
                          <IconButton
                            aria-label={t('mypick.slots.delete')}
                            title={t('mypick.slots.delete')}
                            size="xs"
                            variant="ghost"
                            onClick={() => setConfirmingDeleteId(slot.id)}
                            color="fg.error"
                          >
                            <FaTrash />
                          </IconButton>
                        </HStack>
                      </HStack>
                    )}

                    {isConfirming && (
                      <HStack gap="2" justifyContent="flex-end">
                        <Text mr="auto" color="fg.muted" fontSize="xs">
                          {t('mypick.slots.delete_confirm')}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setConfirmingDeleteId(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button size="xs" onClick={() => handleDelete(slot.id)} colorPalette="red">
                          {t('mypick.slots.delete')}
                        </Button>
                      </HStack>
                    )}
                  </Stack>
                );
              })}
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
