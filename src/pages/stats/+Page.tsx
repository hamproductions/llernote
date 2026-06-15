import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp, FaCopy, FaDownload } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { StatsCard } from '~/components/stats/StatsCard';
import { NativeSelect } from '~/components/events/NativeSelect';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useAppSettings } from '~/hooks/useAppSettings';
import { useAttendance } from '~/hooks/useAttendance';
import {
  useEventYears,
  useSeries,
  useSeriesById,
  useSetlists,
  usePerformances,
  useVenueById
} from '~/hooks/useData';
import { useDerivedDataWorker } from '~/hooks/useDerivedDataWorker';
import { getSeriesShortName } from '~/utils/series-short';
import { copyTextToClipboard, downloadElementAsImage, formatEventShareText } from '~/utils/share';
import { useToaster } from '~/context/ToasterContext';

const MULTI_SERIES_FILTER = '__multi_series__';

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
  const allYears = years;

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

function SeriesPie({
  items
}: {
  items: { key: string; label: string; count: number; color?: string }[];
}) {
  const { t } = useTranslation();
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const slices = items.reduce<
    { key: string; label: string; count: number; color?: string; value: number; offset: number }[]
  >((acc, item) => {
    const value = total > 0 ? (item.count / total) * 100 : 0;
    const offset = acc.length === 0 ? 25 : acc[acc.length - 1]!.offset + acc[acc.length - 1]!.value;
    return [...acc, { ...item, value, offset }];
  }, []);

  return (
    <Grid gap="4" alignItems="center" gridTemplateColumns={{ base: '1fr', md: 'auto 1fr' }}>
      <Box position="relative" w="44" h="44" mx="auto">
        <svg viewBox="0 0 44 44" width="100%" height="100%">
          <circle
            cx="22"
            cy="22"
            r="15.9155"
            fill="none"
            stroke="var(--colors-bg-subtle)"
            strokeWidth="8"
          />
          {slices.map((item) => (
            <circle
              key={item.key}
              cx="22"
              cy="22"
              r="15.9155"
              fill="none"
              stroke={item.color ?? '#e4007f'}
              strokeDasharray={`${item.value} ${100 - item.value}`}
              strokeDashoffset={100 - item.offset}
              strokeWidth="8"
            />
          ))}
        </svg>
        <Stack
          inset="0"
          position="absolute"
          gap="0"
          justifyContent="center"
          alignItems="center"
          pointerEvents="none"
        >
          <Text textStyle="display" color="accent.default" fontSize="2xl" lineHeight="1">
            {total}
          </Text>
          <Text color="fg.muted" fontSize="2xs">
            {t('stats.events_total')}
          </Text>
        </Stack>
      </Box>
      <Stack gap="2">
        {slices.map((item) => (
          <HStack key={item.key} gap="2">
            <Box
              style={{ backgroundColor: item.color ?? '#e4007f' }}
              flexShrink={0}
              borderRadius="full"
              w="2.5"
              h="2.5"
            />
            <Text flex="1" minW="0" fontSize="sm" lineClamp={1}>
              {item.label}
            </Text>
            <Text color="fg.muted" fontSize="sm" fontVariantNumeric="tabular-nums">
              {Math.round(item.value)}%
            </Text>
          </HStack>
        ))}
      </Stack>
    </Grid>
  );
}

function MonthEventChart({
  items
}: {
  items: {
    month: string;
    total: number;
    attended: number;
    going: number;
    attendanceRate: number;
  }[];
}) {
  const visible = items;
  const max = Math.max(1, ...visible.map((item) => item.attended));
  const chartWidth = 960;
  const chartHeight = 240;
  const padding = { top: 32, right: 28, bottom: 46, left: 44 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const step = visible.length > 1 ? plotWidth / (visible.length - 1) : 0;
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  const points = visible.map((item, index) => ({
    item,
    x: padding.left + index * step,
    y: padding.top + plotHeight - (item.attended / max) * plotHeight
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const markerModulo = Math.max(1, Math.ceil(visible.length / 10));

  return (
    <Box w="full" py="1">
      <svg
        role="img"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{
          width: '100%',
          height: `${chartHeight}px`,
          display: 'block',
          fontFamily: 'inherit'
        }}
      >
        {ticks.map((tick) => {
          const y = padding.top + plotHeight - (tick / max) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                stroke="var(--colors-border-subtle)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="var(--colors-fg-muted)"
                fontSize="12"
                fontWeight="600"
                textAnchor="end"
              >
                {tick}
              </text>
            </g>
          );
        })}
        <polyline
          points={line}
          fill="none"
          stroke="var(--colors-accent-default)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map(({ item, x, y }, index) => {
          const showLabel = index === 0 || index === points.length - 1 || item.attended === max;
          const showMonth =
            index === 0 || index === points.length - 1 || index % markerModulo === 0;
          return (
            <g key={item.month}>
              <title>{`${item.month}: ${item.attended}`}</title>
              <circle cx={x} cy={y} r="5" fill="var(--colors-accent-default)" />
              {showLabel && (
                <text
                  x={x}
                  y={Math.max(padding.top + 14, y - 12)}
                  fill="var(--colors-fg-default)"
                  fontSize="14"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {item.attended}
                </text>
              )}
              {showMonth && (
                <text
                  x={x}
                  y={chartHeight - 24}
                  fill="var(--colors-fg-default)"
                  fontSize="13"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {item.month.slice(2).replace('-', '/')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

function AttendanceCoverageChart({
  rate,
  eligible,
  attended,
  items,
  seriesById
}: {
  rate: number;
  eligible: number;
  attended: number;
  items: {
    seriesId: string;
    total: number;
    attended: number;
    rate: number;
  }[];
  seriesById: Map<string, { name: string; color: string }>;
}) {
  return (
    <Grid gap="5" alignItems="center" gridTemplateColumns={{ base: '1fr', md: '14rem 1fr' }}>
      <Stack gap="1" alignItems="center" borderRadius="l3" p="5" bgColor="accent.a2">
        <Text color="accent.default" fontSize="4xl" fontWeight="bold" lineHeight="1">
          {rate}%
        </Text>
        <Text color="fg.muted" fontSize="sm" fontVariantNumeric="tabular-nums">
          {attended} / {eligible}
        </Text>
      </Stack>
      <Stack gap="3">
        {items.slice(0, 8).map((item) => {
          const series = seriesById.get(item.seriesId);
          const color = series?.color ?? 'var(--colors-accent-default)';
          return (
            <HStack key={item.seriesId} gap="3">
              <Text minW="32" maxW="32" fontSize="sm" lineClamp={1}>
                {getSeriesShortName(item.seriesId, series?.name ?? item.seriesId)}
              </Text>
              <Box flex="1" borderRadius="full" h="2.5" bgColor="bg.subtle" overflow="hidden">
                <Box
                  style={{
                    width: `${item.rate}%`,
                    background: color
                  }}
                  borderRadius="full"
                  h="full"
                />
              </Box>
              <Text minW="20" fontSize="sm" fontVariantNumeric="tabular-nums" textAlign="right">
                {item.rate}% {item.attended}/{item.total}
              </Text>
            </HStack>
          );
        })}
      </Stack>
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
  const [open, setOpen] = useState(true);

  return (
    <Card.Root gridColumn={span ? { base: 'auto', lg: 'span 2' } : undefined}>
      <Card.Body gap="4" p="5">
        <HStack justifyContent="space-between" alignItems="center">
          <Heading as="h3" textStyle="display" fontSize="md">
            {title}
          </Heading>
          <Button size="xs" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? <FaChevronUp /> : <FaChevronDown />}
          </Button>
        </HStack>
        {open && children}
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
  const venueById = useVenueById();
  const series = useSeries();
  const seriesById = useSeriesById();
  const years = useEventYears();
  const cardRef = useRef<HTMLDivElement>(null);
  const [year, setYear] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [category, setCategory] = useState('');
  const { inPersonOnly } = useAppSettings();
  const multiSeries = seriesFilter === MULTI_SERIES_FILTER;
  const seriesId = multiSeries ? '' : seriesFilter;

  useEffect(() => {
    if (inPersonOnly && category) setCategory('');
  }, [inPersonOnly, category]);

  const performanceById = useMemo(
    () => new Map(performances.map((p) => [p.id, p])),
    [performances]
  );

  const derived = useDerivedDataWorker(
    'stats',
    { records, performances, setlists, year, seriesId, category, multiSeries, venueById },
    [records, performances, setlists, year, seriesId, category, multiSeries, venueById]
  );
  const stats = derived.result;

  const attendedMonthEvents = useMemo(() => {
    const months = stats?.byMonthEvents ?? [];
    const active = (m: (typeof months)[number]) => m.attended > 0 || m.going > 0;
    const first = months.findIndex(active);
    if (first < 0) return [];
    return months.slice(first, months.findLastIndex(active) + 1);
  }, [stats]);

  const empty = !stats || (stats.attendedCount === 0 && stats.interestedCount === 0);

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
                  const attended = records
                    .filter((r) => r.status === 'attended')
                    .map((r) => performanceById.get(r.performanceId))
                    .filter((p) => p !== undefined)
                    .filter((p) => {
                      if (year && !p.date.startsWith(year)) return false;
                      if (seriesId && !p.seriesIds.includes(seriesId)) return false;
                      if (multiSeries && p.seriesIds.length < 2) return false;
                      if (category && p.category !== category) return false;
                      return true;
                    })
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
            value={seriesFilter}
            placeholder={`${t('events.series')}: ${t('common.all')}`}
            options={[
              { value: MULTI_SERIES_FILTER, label: t('events.multi_series') },
              ...series.map((s) => ({ value: s.id, label: s.name }))
            ]}
            onChange={setSeriesFilter}
          />
          {!inPersonOnly && (
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
          )}
        </HStack>

        {derived.loading ? (
          <Grid gap="3" gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} borderRadius="l3" h="24" />
            ))}
          </Grid>
        ) : empty ? (
          <Text color="fg.muted">{t('stats.empty')}</Text>
        ) : stats ? (
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
                  <SeriesPie
                    items={stats.bySeries.map((s) => ({
                      key: s.seriesId,
                      label: getSeriesShortName(
                        s.seriesId,
                        seriesById.get(s.seriesId)?.name ?? s.seriesId
                      ),
                      count: s.count,
                      color: seriesById.get(s.seriesId)?.color
                    }))}
                  />
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
              {attendedMonthEvents.length > 0 && (
                <ChartCard title={t('stats.events_by_month')} span>
                  <MonthEventChart items={attendedMonthEvents} />
                </ChartCard>
              )}
              {stats.attendanceEligibleCount > 0 && (
                <ChartCard title={t('stats.attendance')} span>
                  <AttendanceCoverageChart
                    rate={stats.attendanceRate}
                    eligible={stats.attendanceEligibleCount}
                    attended={stats.attendedCount}
                    items={stats.attendanceBySeries}
                    seriesById={seriesById}
                  />
                </ChartCard>
              )}
              {stats.byVenue.length > 0 && (
                <ChartCard title={t('stats.by_venue')}>
                  <BarList
                    items={stats.byVenue.slice(0, 6).map((v) => ({
                      key: v.venueId ?? v.venue,
                      label: v.venue,
                      count: v.count
                    }))}
                    max={Math.max(...stats.byVenue.map((v) => v.count))}
                  />
                </ChartCard>
              )}
              {stats.byCity.length > 0 && (
                <ChartCard title={t('stats.by_city')}>
                  <BarList
                    items={stats.byCity.slice(0, 6).map((v) => ({
                      key: v.city,
                      label: v.city,
                      count: v.count
                    }))}
                    max={Math.max(...stats.byCity.map((v) => v.count))}
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
        ) : null}
      </Stack>
    </>
  );
}
