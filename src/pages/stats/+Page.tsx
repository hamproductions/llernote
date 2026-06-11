import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCopy, FaDownload, FaFileExport, FaFileImport } from 'react-icons/fa6';
import { saveAs } from 'file-saver';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { StatsCard } from '~/components/stats/StatsCard';
import { NativeSelect } from '~/components/events/NativeSelect';
import { Metadata } from '~/components/layout/Metadata';
import { useAttendance } from '~/hooks/useAttendance';
import { useEventYears, useSeries, useSetlists, usePerformances } from '~/hooks/useData';
import { computeStats } from '~/utils/stats';
import { copyTextToClipboard, downloadElementAsImage, formatEventShareText } from '~/utils/share';
import { exportBackup, importBackup } from '~/utils/attendance/storage';
import { useToaster } from '~/context/ToasterContext';
import type { EventCategory } from '~/types';

export default function Page() {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const { records } = useAttendance();
  const performances = usePerformances();
  const setlists = useSetlists();
  const series = useSeries();
  const years = useEventYears();
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [category, setCategory] = useState('');

  const performanceById = useMemo(
    () => new Map(performances.map((p) => [p.id, p])),
    [performances]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((r) => {
        const p = performanceById.get(r.performanceId);
        if (!p) return false;
        if (year && !p.date.startsWith(year)) return false;
        if (seriesId && !p.seriesIds.includes(seriesId)) return false;
        if (category && p.category !== (category as EventCategory)) return false;
        return true;
      }),
    [records, performanceById, year, seriesId, category]
  );

  const stats = useMemo(
    () => computeStats(filteredRecords, performanceById, setlists),
    [filteredRecords, performanceById, setlists]
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
        <HStack gap="2" flexWrap="wrap">
          <NativeSelect
            aria-label={t('events.year')}
            value={year}
            placeholder={`${t('events.year')}: ${t('common.all')}`}
            options={years.map((y) => ({ value: y, label: y }))}
            onChange={setYear}
          />
          <NativeSelect
            aria-label={t('events.series')}
            value={seriesId}
            placeholder={`${t('events.series')}: ${t('common.all')}`}
            options={series.map((s) => ({ value: s.id, label: s.name }))}
            onChange={setSeriesId}
          />
          <NativeSelect
            aria-label={t('events.category')}
            value={category}
            placeholder={`${t('events.category')}: ${t('common.all')}`}
            options={[
              { value: 'live', label: t('events.category_live') },
              { value: 'online', label: t('events.category_online') },
              { value: 'tv', label: t('events.category_tv') }
            ]}
            onChange={setCategory}
          />
        </HStack>
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
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const attended = filteredRecords
                  .filter((r) => r.status === 'attended')
                  .map((r) => performanceById.get(r.performanceId))
                  .filter((p) => p !== undefined)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((p) => formatEventShareText(p));
                try {
                  await copyTextToClipboard(
                    [t('stats.share_title'), ...attended, '', t('stats.generated_by')].join('\n')
                  );
                  toast({ title: t('share.copied'), type: 'success' });
                } catch {
                  toast({ title: t('share.copy_failed'), type: 'error' });
                }
              }}
            >
              <FaCopy />
              {t('settings.copy_history')}
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
