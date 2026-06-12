import { lazy, Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCloudArrowDown,
  FaFileExport,
  FaFileImport,
  FaGear,
  FaTrash,
  FaXmark
} from 'react-icons/fa6';
import { saveAs } from 'file-saver';
import { HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Heading } from '~/components/ui/heading';
import { Switch } from '~/components/ui/switch';
import { Text } from '~/components/ui/text';
import { useAppSettings } from '~/hooks/useAppSettings';
import { useToaster } from '~/context/ToasterContext';
import { deleteAllLocalData } from '~/utils/app-settings';
import { exportBackup, importBackup } from '~/utils/attendance/storage';

const EventernoteImportDialog = lazy(() =>
  import('~/components/eventernote/EventernoteImportDialog').then((module) => ({
    default: module.EventernoteImportDialog
  }))
);

export function SettingsMenu() {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [eventernoteOpen, setEventernoteOpen] = useState(false);
  const [eventernoteMounted, setEventernoteMounted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { inPersonOnly, setAppSettings } = useAppSettings();

  const handleImport = async (file: File) => {
    try {
      importBackup(JSON.parse(await file.text()));
      toast({ title: t('settings.import_success'), type: 'success' });
    } catch {
      toast({ title: t('settings.import_error'), type: 'error' });
    }
  };

  return (
    <>
      <IconButton
        aria-label={t('settings.title')}
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <FaGear />
      </IconButton>
      <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content w="full" maxW="sm" mx="4">
            <Stack gap="4" p={{ base: '4', md: '6' }}>
              <Dialog.Title>{t('settings.title')}</Dialog.Title>
              <Stack gap="2">
                <Heading as="h3" color="fg.muted" fontSize="sm">
                  {t('settings.display')}
                </Heading>
                <HStack gap="3" justifyContent="space-between">
                  <Stack gap="0">
                    <Text fontSize="sm">{t('settings.in_person_only')}</Text>
                    <Text color="fg.muted" fontSize="xs">
                      {t('settings.in_person_only_hint')}
                    </Text>
                  </Stack>
                  <Switch
                    checked={inPersonOnly}
                    onCheckedChange={(e) => setAppSettings({ inPersonOnly: e.checked })}
                  />
                </HStack>
              </Stack>
              <Stack gap="2">
                <Heading as="h3" color="fg.muted" fontSize="sm">
                  {t('settings.data_management')}
                </Heading>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], {
                      type: 'application/json'
                    });
                    saveAs(blob, `llernote-backup-${new Date().toISOString().slice(0, 10)}.json`);
                  }}
                  justifyContent="flex-start"
                >
                  <FaFileExport />
                  {t('settings.export_data')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  justifyContent="flex-start"
                >
                  <FaFileImport />
                  {t('settings.import_data')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEventernoteMounted(true);
                    setEventernoteOpen(true);
                  }}
                  justifyContent="flex-start"
                >
                  <FaCloudArrowDown />
                  {t('eventernote.import_from')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImport(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmingDelete(true)}
                  colorPalette="red"
                  justifyContent="flex-start"
                  borderColor="border.error"
                  color="fg.error"
                >
                  <FaTrash />
                  {t('settings.delete_all')}
                </Button>
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
      <Dialog.Root open={confirmingDelete} onOpenChange={(e) => setConfirmingDelete(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content w="full" maxW="sm" mx="4">
            <Stack gap="4" p={{ base: '4', md: '6' }}>
              <Dialog.Title>{t('settings.delete_all')}</Dialog.Title>
              <Text color="fg.muted" fontSize="sm">
                {t('settings.delete_all_warning')}
              </Text>
              <HStack gap="2" justifyContent="flex-end">
                <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={deleteAllLocalData} colorPalette="red">
                  <FaTrash />
                  {t('settings.delete_all')}
                </Button>
              </HStack>
            </Stack>
            <Dialog.CloseTrigger asChild position="absolute" top="2" right="2">
              <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                <FaXmark />
              </IconButton>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
      {eventernoteMounted && (
        <Suspense fallback={null}>
          <EventernoteImportDialog
            open={eventernoteOpen}
            onClose={() => setEventernoteOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
