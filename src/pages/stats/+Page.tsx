import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaFileExport, FaFileImport } from 'react-icons/fa6';
import { saveAs } from 'file-saver';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { StatsCard } from '~/components/stats/StatsCard';
import { Metadata } from '~/components/layout/Metadata';
import { useAttendance } from '~/hooks/useAttendance';
import { useSetlists, usePerformances } from '~/hooks/useData';
import { computeStats } from '~/utils/stats';
import { downloadElementAsImage } from '~/utils/share';
import { exportBackup, importBackup } from '~/utils/attendance/storage';
import { useToaster } from '~/context/ToasterContext';

export default function Page() {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const { records } = useAttendance();
  const performances = usePerformances();
  const setlists = useSetlists();
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performanceById = useMemo(
    () => new Map(performances.map((p) => [p.id, p])),
    [performances]
  );

  const stats = useMemo(
    () => computeStats(records, performanceById, setlists),
    [records, performanceById, setlists]
  );

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
      <Metadata title={`${t('stats.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <Heading as="h1" fontSize="2xl">
          {t('stats.title')}
        </Heading>
        {stats.attendedCount === 0 && stats.interestedCount === 0 ? (
          <Text color="fg.muted">{t('stats.empty')}</Text>
        ) : (
          <HStack gap="6" alignItems="flex-start" flexWrap="wrap">
            <StatsCard ref={cardRef} stats={stats} />
            <Stack gap="2" minW="48">
              <Button
                size="sm"
                onClick={async () => {
                  if (cardRef.current) {
                    await downloadElementAsImage(cardRef.current, 'llernote-stats.png');
                    toast({ title: t('share.image_generated'), type: 'success' });
                  }
                }}
              >
                <FaDownload />
                {t('share.download_image')}
              </Button>
            </Stack>
          </HStack>
        )}

        <Stack gap="2" mt="8">
          <Heading as="h2" fontSize="lg">
            {t('settings.data_management')}
          </Heading>
          <Wrap gap="2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], {
                  type: 'application/json'
                });
                saveAs(blob, `llernote-backup-${new Date().toISOString().slice(0, 10)}.json`);
              }}
            >
              <FaFileExport />
              {t('settings.export_data')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <FaFileImport />
              {t('settings.import_data')}
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
          </Wrap>
        </Stack>
      </Stack>
    </>
  );
}
