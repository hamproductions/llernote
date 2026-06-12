import { lazy, Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowDown, FaFileExport, FaFileImport, FaGear, FaXmark } from 'react-icons/fa6';
import { saveAs } from 'file-saver';
import { Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Heading } from '~/components/ui/heading';
import { useToaster } from '~/context/ToasterContext';
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
