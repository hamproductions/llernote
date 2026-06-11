import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCopy, FaDownload, FaFileExport, FaFileImport } from 'react-icons/fa6';
import { saveAs } from 'file-saver';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { StatsCard } from '~/components/stats/StatsCard';
import { NativeSelect } from '~/components/events/NativeSelect';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useAttendance } from '~/hooks/useAttendance';
import {
  useEventYears,
  useSeries,
  useSeriesById,
  useSetlists,
  usePerformances
} from '~/hooks/useData';
import { computeStats } from '~/utils/stats';
import { getSeriesShortName } from '~/utils/series-short';
import { copyTextToClipboard, downloadElementAsImage, formatEventShareText } from '~/utils/share';
import { exportBackup, importBackup } from '~/utils/attendance/storage';
import { useToaster } from '~/context/ToasterContext';
import type { EventCategory } from '~/types';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack
      gap="0"
      alignItems="center"
      borderColor="accent.a5"
      borderRadius="l3"
      borderWidth="1px"
      p="4"
      bgColor="accent.a2"
    >
      <Text textStyle="display" color="accent.default" fontSize="3xl" lineHeight="1.2">
        {value}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        {label}
      </Text>
    </Stack>
  );
}

function BarList({
  items,
  max
}: {
  items: { key: string; label: string; count: number; color?: string }[];
  max: number;
}) {
  return (
    <Stack gap="2">
      {items.map((item) => (
        <HStack key={item.key} gap="3">
          <Text title={item.label} minW="24" maxW="24" fontSize="sm" lineClamp={1}>
            {item.label}
          </Text>
          <Box flex="1" borderRadius="full" h="2.5" bgColor="bg.subtle" overflow="hidden">
            <Box
              style={{
                width: `${(item.count / max) * 100}%`,
                background: item.color ? item.color : 'linear-gradient(90deg, #e4007f, #ff7a00)'
              }}
              borderRadius="full"
              h="full"
            />
          </Box>
          <Text minW="8" fontSize="sm" fontVariantNumeric="tabular-nums" textAlign="right">
            {item.count}
          </Text>
        </HStack>
      ))}
    </Stack>
  );
}

function MonthHeatmap({ byMonth, years }: { byMonth: Map<string, number>; years: string[] }) {
  const max = Math.max(1, ...byMonth.values());
  const allYears = years.length
    ? Array.from({ length: Number(years[years.length - 1]) - Number(years[0]) + 1 }, (_, i) =>
        String(Number(years[0]) + i)
      )
    : [];

  return (
    <Grid gap="1" alignItems="center" gridTemplateColumns="3rem repeat(12, 1fr)">
      <Box />
      {Array.from({ length: 12 }, (_, m) => (
        <Text key={m} color="fg.muted" fontSize="xs" textAlign="center">
          {m + 1}
        </Text>
      ))}
      {allYears.map((year) => [
        <Text key={year} color="fg.muted" fontSize="xs" fontVariantNumeric="tabular-nums">
          {year}
        </Text>,
        ...Array.from({ length: 12 }, (_, m) => {
          const key = `${year}-${String(m + 1).padStart(2, '0')}`;
          const count = byMonth.get(key) ?? 0;
          return (
            <Box
              key={key}
              title={`${key}: ${count}`}
              style={{
                backgroundColor:
                  count > 0
                    ? `rgba(228, 0, 127, ${0.25 + 0.75 * (count / max)})`
                    : 'rgba(128, 128, 128, 0.12)'
              }}
              borderRadius="xs"
              h="5"
            />
          );
        })
      ])}
    </Grid>
  );
}

function ChartCard({
  title,
  children,
  span = false
}: {
  title: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <Card.Root gridColumn={span ? { base: 'auto', lg: 'span 2' } : undefined}>
      <Card.Body gap="4" p="5">
        <Heading as="h3" textStyle="display" fontSize="md">
          {title}
        </Heading>
        {children}
      </Card.Body>
    </Card.Root>
  );
}

export default function Page() {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const { records } = useAttendance();
  const performances = usePerformances();
  const setlists = useSetlists();
  const series = useSeries();
  const seriesById = useSeriesById();
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

  const empty = stats.attendedCount === 0 && stats.interestedCount === 0;

  return (
    <>
      <Metadata title={`${t('stats.title')} - LLerNote`} helmet />
      <Stack gap="5">
        <HStack gap="3" justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <SectionHeading size="2xl">{t('stats.title')}</SectionHeading>
          {!empty && (
            <Wrap gap="2">
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
            </Wrap>
          )}
        </HStack>

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

        {empty ? (
          <Text color="fg.muted">{t('stats.empty')}</Text>
        ) : (
          <>
            <Grid gap="3" gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }}>
              <StatTile label={t('stats.total_attended')} value={stats.attendedCount} />
              <StatTile label={t('stats.songs_witnessed')} value={stats.songsWitnessed} />
              <StatTile label={t('stats.unique_songs')} value={stats.uniqueSongs} />
              <StatTile label={t('stats.venues_visited')} value={stats.venuesVisited} />
              <StatTile label={t('stats.total_interested')} value={stats.interestedCount} />
            </Grid>

            {stats.firstEvent && (
              <Text color="fg.muted" fontSize="sm">
                {t('stats.first_event')}: {stats.firstEvent.date} {stats.firstEvent.tourName}
              </Text>
            )}

            <Grid
              gap="4"
              alignItems="start"
              gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
            >
              {stats.byYear.length > 0 && (
                <ChartCard title={t('stats.heatmap')} span>
                  <MonthHeatmap byMonth={stats.byMonth} years={stats.byYear.map((y) => y.year)} />
                </ChartCard>
              )}
              {stats.byYear.length > 0 && (
                <ChartCard title={t('stats.by_year')}>
                  <BarList
                    items={stats.byYear.map((y) => ({
                      key: y.year,
                      label: y.year,
                      count: y.count
                    }))}
                    max={Math.max(...stats.byYear.map((y) => y.count))}
                  />
                </ChartCard>
              )}
              {stats.bySeries.length > 0 && (
                <ChartCard title={t('stats.by_series')}>
                  <BarList
                    items={stats.bySeries.map((s) => ({
                      key: s.seriesId,
                      label: getSeriesShortName(
                        s.seriesId,
                        seriesById.get(s.seriesId)?.name ?? s.seriesId
                      ),
                      count: s.count,
                      color: seriesById.get(s.seriesId)?.color
                    }))}
                    max={Math.max(...stats.bySeries.map((s) => s.count))}
                  />
                </ChartCard>
              )}
              {stats.byVenue.length > 0 && (
                <ChartCard title={t('stats.by_venue')}>
                  <BarList
                    items={stats.byVenue.slice(0, 6).map((v) => ({
                      key: v.venue,
                      label: v.venue,
                      count: v.count
                    }))}
                    max={Math.max(...stats.byVenue.map((v) => v.count))}
                  />
                </ChartCard>
              )}
              {stats.byCategory.length > 0 && (
                <ChartCard title={t('events.category')}>
                  <BarList
                    items={stats.byCategory.map((c) => ({
                      key: c.category,
                      label: t(`events.category_${c.category}` as 'events.category_live'),
                      count: c.count
                    }))}
                    max={Math.max(...stats.byCategory.map((c) => c.count))}
                  />
                </ChartCard>
              )}
            </Grid>

            <Box aria-hidden="true" position="absolute" top="0" left="-9999px">
              <StatsCard ref={cardRef} stats={stats} />
            </Box>
          </>
        )}

        <Stack gap="2" borderColor="border.subtle" borderTopWidth="1px" mt="2" pt="5">
          <Heading as="h2" textStyle="display" fontSize="md">
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
