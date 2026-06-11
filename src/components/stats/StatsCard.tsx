import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { useSeriesById } from '~/hooks/useData';
import { getSeriesShortName } from '~/utils/series-short';
import type { StatsSummary } from '~/utils/stats';

function StatNumber({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack gap="0" alignItems="center" borderRadius="l2" p="3" bgColor="bg.subtle">
      <Text color="accent.default" fontSize="3xl" fontWeight="bold">
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
    <Stack gap="1">
      {items.map((item) => (
        <HStack key={item.key} gap="2">
          <Text title={item.label} minW="28" maxW="28" fontSize="xs" lineClamp={1}>
            {item.label}
          </Text>
          <Box flex="1" borderRadius="sm" h="4" bgColor="bg.subtle" overflow="hidden">
            <Box
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: item.color ?? '#e4007f'
              }}
              borderRadius="sm"
              h="full"
            />
          </Box>
          <Text minW="6" fontSize="xs" fontVariantNumeric="tabular-nums" textAlign="right">
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
    <Stack gap="1">
      <Grid gap="0.5" alignItems="center" gridTemplateColumns="2.5rem repeat(12, 1fr)">
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
                h="4"
              />
            );
          })
        ])}
      </Grid>
    </Stack>
  );
}

export const StatsCard = forwardRef<HTMLDivElement, { stats: StatsSummary }>(function StatsCard(
  { stats },
  ref
) {
  const { t } = useTranslation();
  const seriesById = useSeriesById();

  return (
    <Box
      ref={ref}
      borderColor="border.default"
      borderRadius="l3"
      borderWidth="1px"
      w="full"
      maxW="xl"
      p="6"
      bgColor="bg.default"
    >
      <Stack gap="5">
        <HStack justifyContent="space-between" alignItems="baseline">
          <Text color="accent.default" fontSize="xl" fontWeight="bold">
            {t('stats.share_title')}
          </Text>
          <Text color="fg.subtle" fontSize="xs">
            {t('stats.generated_by')}
          </Text>
        </HStack>
        <Grid gap="2" gridTemplateColumns="repeat(3, 1fr)">
          <StatNumber label={t('stats.total_attended')} value={stats.attendedCount} />
          <StatNumber label={t('stats.songs_witnessed')} value={stats.songsWitnessed} />
          <StatNumber label={t('stats.unique_songs')} value={stats.uniqueSongs} />
        </Grid>
        <Grid gap="2" gridTemplateColumns="repeat(2, 1fr)">
          <StatNumber label={t('stats.venues_visited')} value={stats.venuesVisited} />
          <StatNumber label={t('stats.total_interested')} value={stats.interestedCount} />
        </Grid>
        {stats.firstEvent && (
          <Stack gap="1">
            <Text color="fg.muted" fontSize="xs">
              {t('stats.first_event')}
            </Text>
            <Text fontSize="sm" fontWeight="medium">
              {stats.firstEvent.date} {stats.firstEvent.tourName}
            </Text>
          </Stack>
        )}
        {stats.byYear.length > 0 && (
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold">
              {t('stats.heatmap')}
            </Text>
            <MonthHeatmap byMonth={stats.byMonth} years={stats.byYear.map((y) => y.year)} />
          </Stack>
        )}
        {stats.byYear.length > 0 && (
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold">
              {t('stats.by_year')}
            </Text>
            <BarList
              items={stats.byYear.map((y) => ({ key: y.year, label: y.year, count: y.count }))}
              max={Math.max(...stats.byYear.map((y) => y.count))}
            />
          </Stack>
        )}
        {stats.bySeries.length > 0 && (
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold">
              {t('stats.by_series')}
            </Text>
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
          </Stack>
        )}
        {stats.byVenue.length > 0 && (
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold">
              {t('stats.by_venue')}
            </Text>
            <BarList
              items={stats.byVenue.slice(0, 5).map((v) => ({
                key: v.venue,
                label: v.venue,
                count: v.count
              }))}
              max={Math.max(...stats.byVenue.map((v) => v.count))}
            />
          </Stack>
        )}
        {stats.byCategory.length > 0 && (
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold">
              {t('events.category')}
            </Text>
            <BarList
              items={stats.byCategory.map((c) => ({
                key: c.category,
                label: t(`events.category_${c.category}` as 'events.category_live'),
                count: c.count
              }))}
              max={Math.max(...stats.byCategory.map((c) => c.count))}
            />
          </Stack>
        )}
        {stats.byWatchType.length > 0 && (
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold">
              {t('stats.by_type')}
            </Text>
            <BarList
              items={stats.byWatchType.map((w) => ({
                key: w.watchType,
                label: t(`events.watched_${w.watchType}` as 'events.watched_live'),
                count: w.count
              }))}
              max={Math.max(...stats.byWatchType.map((w) => w.count))}
            />
          </Stack>
        )}
      </Stack>
    </Box>
  );
});
