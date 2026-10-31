import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight, FaStar } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { IconButton } from '~/components/ui/icon-button';
import { Tabs } from '~/components/ui/tabs';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { AttendanceButtons } from '~/components/events/AttendanceButtons';
import { NativeSelect } from '~/components/events/NativeSelect';
import { VenueText } from '~/components/events/VenueText';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { usePerformances, useSeriesById } from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import { useDetail } from '~/components/detail/DetailStack';
import { daysFromToday, isFutureEvent } from '~/utils/event-filter';
import { isWatched, isWitnessed } from '~/utils/attendance/witness';
import { legLabel } from '~/components/events/TourCard';
import { getSeriesShortName } from '~/utils/series-short';
import { clickable } from '~/utils/clickable';
import type { Performance } from '~/types';

const pad = (n: number) => String(n).padStart(2, '0');
const MULTI_SERIES_FILTER = '__multi_series__';

function MonthView({
  onSelect,
  seriesFilter
}: {
  onSelect: (p: Performance) => void;
  seriesFilter: string;
}) {
  const { t, i18n } = useTranslation();
  const performances = usePerformances();
  const seriesById = useSeriesById();
  const { get } = useAttendance();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string>();

  const multiSeries = seriesFilter === MULTI_SERIES_FILTER;
  const seriesId = multiSeries ? '' : seriesFilter;
  const monthPrefix = `${year}-${pad(month + 1)}`;
  const monthEvents = useMemo(
    () =>
      performances
        .filter((p) => p.date.startsWith(monthPrefix))
        .filter((p) => !seriesId || p.seriesIds.includes(seriesId))
        .filter((p) => !multiSeries || p.seriesIds.length > 1)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [performances, monthPrefix, seriesId, multiSeries]
  );
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Performance[]>();
    for (const p of monthEvents) {
      map.set(p.date, [...(map.get(p.date) ?? []), p]);
    }
    return map;
  }, [monthEvents]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthPrefix}-${pad(i + 1)}`)
  ];
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map((d) =>
    new Date(2024, 8, 1 + d).toLocaleDateString(i18n.language, { weekday: 'short' })
  );
  const monthLabel = new Date(year, month, 1).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long'
  });

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDay(undefined);
  };

  const agendaEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : monthEvents;
  const yearOptions = useMemo(() => {
    const years = new Set(performances.map((p) => p.date.slice(0, 4)));
    return [...years].sort().map((y) => ({ value: y, label: y }));
  }, [performances]);

  return (
    <Grid gap="4" alignItems="start" gridTemplateColumns={{ base: '1fr', lg: '3fr 2fr' }}>
      <Stack gap="2">
        <HStack justifyContent="space-between">
          <IconButton
            aria-label={t('calendar.prev_month')}
            variant="ghost"
            size="sm"
            onClick={() => changeMonth(-1)}
          >
            <FaChevronLeft />
          </IconButton>
          <HStack gap="2">
            <Text fontWeight="semibold">{monthLabel}</Text>
            <NativeSelect
              aria-label={t('events.year')}
              value={String(year)}
              options={yearOptions}
              onChange={(y) => {
                if (y) {
                  setYear(Number(y));
                  setSelectedDay(undefined);
                }
              }}
            />
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth());
                setSelectedDay(undefined);
              }}
            >
              {t('common.today')}
            </Button>
          </HStack>
          <IconButton
            aria-label={t('calendar.next_month')}
            variant="ghost"
            size="sm"
            onClick={() => changeMonth(1)}
          >
            <FaChevronRight />
          </IconButton>
        </HStack>
        <Grid gap="1" gridTemplateColumns="repeat(7, 1fr)">
          {weekdays.map((d) => (
            <Text key={d} color="fg.muted" fontSize="xs" textAlign="center">
              {d}
            </Text>
          ))}
          {cells.map((day, i) => {
            const events = day ? (eventsByDay.get(day) ?? []) : [];
            const isToday = day === todayStr;
            const isSelected = day === selectedDay;
            return (
              <Box
                key={day ?? `empty-${i}`}
                {...(day && events.length > 0
                  ? clickable(() => setSelectedDay(isSelected ? undefined : day), day)
                  : {})}
                cursor={day && events.length > 0 ? 'pointer' : undefined}
                borderColor={isSelected ? 'accent.default' : isToday ? 'accent.8' : 'border.subtle'}
                borderRadius="l1"
                borderWidth="1px"
                minH={{ base: '12', md: '20' }}
                p="1"
                bgColor={events.length > 0 ? 'bg.default' : 'transparent'}
                opacity={day ? 1 : 0}
                _hover={day && events.length > 0 ? { borderColor: 'accent.8' } : undefined}
              >
                {day && (
                  <Stack gap="0.5">
                    <Text
                      color={isToday ? 'accent.default' : 'fg.muted'}
                      fontSize="xs"
                      fontWeight={isToday ? 'bold' : undefined}
                    >
                      {Number(day.slice(8))}
                    </Text>
                    <HStack gap="1" alignItems="center" flexWrap="wrap">
                      {events.length > 1 && (
                        <Text color="accent.default" fontSize="2xs" fontWeight="bold">
                          {events.length}
                        </Text>
                      )}
                      {events.slice(0, 5).map((p) => (
                        <Box
                          key={p.id}
                          title={p.tourName}
                          style={{
                            backgroundColor:
                              seriesById.get(p.seriesIds[0] ?? '')?.color ?? '#e4007f'
                          }}
                          borderRadius="full"
                          w="2"
                          h="2"
                        />
                      ))}
                      {events.length > 5 && (
                        <Text color="fg.muted" fontSize="2xs" fontWeight="bold">
                          +{events.length - 5}
                        </Text>
                      )}
                    </HStack>
                  </Stack>
                )}
              </Box>
            );
          })}
        </Grid>
        <HStack gap="2.5" mt="1" flexWrap="wrap">
          {[...seriesById.values()].map((series) => (
            <HStack key={series.id} gap="1" alignItems="center">
              <Box style={{ backgroundColor: series.color }} borderRadius="full" w="2" h="2" />
              <Text color="fg.muted" fontSize="2xs">
                {getSeriesShortName(series.id, series.name)}
              </Text>
            </HStack>
          ))}
        </HStack>
      </Stack>

      <Stack gap="2">
        <HStack justifyContent="space-between" alignItems="baseline">
          <Text fontWeight="semibold">{selectedDay ?? monthLabel}</Text>
          <HStack gap="2">
            {selectedDay && (
              <Button size="xs" variant="ghost" onClick={() => setSelectedDay(undefined)}>
                {t('common.clear')}
              </Button>
            )}
            <Badge size="sm" variant="outline">
              {t('events.results_count', { count: agendaEvents.length })}
            </Badge>
          </HStack>
        </HStack>
        {agendaEvents.length === 0 && (
          <Text color="fg.muted" fontSize="sm">
            {t('events.no_results')}
          </Text>
        )}
        <Stack gap="1" maxH="70vh" overflowY="auto">
          {agendaEvents.map((p) => {
            const record = get(p.id);
            const label = legLabel(p);
            return (
              <HStack
                key={p.id}
                {...clickable(() => onSelect(p))}
                cursor="pointer"
                gap="2"
                borderColor="border.subtle"
                borderRadius="l2"
                borderWidth="1px"
                p="2"
                bgColor={
                  isWitnessed(record, p)
                    ? 'accent.a2'
                    : isWatched(record, p)
                      ? 'blue.a2'
                      : record?.status === 'interested'
                        ? 'amber.a2'
                        : 'bg.default'
                }
                _hover={{ borderColor: 'accent.8' }}
              >
                <Text
                  flexShrink={0}
                  color="fg.muted"
                  fontSize="xs"
                  fontVariantNumeric="tabular-nums"
                >
                  {p.date.slice(5).replace('-', '/')}
                </Text>
                <Stack flex="1" gap="0" minW="0">
                  <Text fontSize="xs" fontWeight="medium">
                    {p.tourName}
                    {label ? ` ${label}` : ''}
                  </Text>
                  <Text color="fg.muted" fontSize="2xs" lineClamp={1}>
                    <VenueText performance={p} compact />
                  </Text>
                </Stack>
                <HStack gap="1" flexShrink={0}>
                  {p.seriesIds.slice(0, 1).map((id) => (
                    <SeriesBadge key={id} seriesId={id} />
                  ))}
                </HStack>
                <HStack onClick={(e) => e.stopPropagation()} gap="1" flexShrink={0}>
                  <AttendanceButtons
                    performanceId={p.id}
                    category={p.category}
                    future={isFutureEvent(p)}
                    iconOnly
                  />
                </HStack>
              </HStack>
            );
          })}
        </Stack>
      </Stack>
    </Grid>
  );
}

function Upcoming({
  onSelect,
  seriesFilter
}: {
  onSelect: (p: Performance) => void;
  seriesFilter: string;
}) {
  const { t } = useTranslation();
  const performances = usePerformances();

  const multiSeries = seriesFilter === MULTI_SERIES_FILTER;
  const seriesId = multiSeries ? '' : seriesFilter;
  const upcoming = useMemo(
    () =>
      performances
        .filter((p) => daysFromToday(p.date) >= 0)
        .filter((p) => !seriesId || p.seriesIds.includes(seriesId))
        .filter((p) => !multiSeries || p.seriesIds.length > 1)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [performances, seriesId, multiSeries]
  );

  if (upcoming.length === 0) {
    return <Text color="fg.muted">{t('upcoming.empty')}</Text>;
  }

  return (
    <Grid gap="2" alignItems="start" gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}>
      {upcoming.map((p) => {
        const days = daysFromToday(p.date);
        const label = legLabel(p);
        return (
          <HStack
            key={p.id}
            {...clickable(() => onSelect(p))}
            cursor="pointer"
            gap="3"
            borderColor="border.subtle"
            borderRadius="l2"
            borderWidth="1px"
            p="3"
            bgColor="bg.default"
            transition="colors"
            _hover={{ borderColor: 'accent.8' }}
          >
            <Stack
              gap="0"
              flexShrink={0}
              justifyContent="center"
              alignItems="center"
              minW={{ base: '16', md: '20' }}
            >
              <Text
                textStyle="display"
                color="red.9"
                fontSize={{ base: '3xl', md: '4xl' }}
                fontWeight="bold"
                fontVariantNumeric="tabular-nums"
                lineHeight="1"
              >
                {days}
              </Text>
              <Text color="red.10" fontSize="2xs" fontWeight="bold">
                {t(days === 0 ? 'upcoming.today_short' : 'upcoming.days')}
              </Text>
            </Stack>
            <Stack flex="1" gap="0.5" minW="0">
              <Text color="fg.muted" fontSize="xs" fontVariantNumeric="tabular-nums">
                {p.date}
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {p.tourName}
                {label ? ` ${label}` : ''}
              </Text>
              <HStack gap="1.5">
                {p.seriesIds.slice(0, 2).map((id) => (
                  <SeriesBadge key={id} seriesId={id} />
                ))}
                <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                  <VenueText performance={p} compact />
                </Text>
              </HStack>
            </Stack>
            <Stack
              onClick={(e) => e.stopPropagation()}
              gap="1"
              flexShrink={0}
              alignItems="flex-end"
            >
              <AttendanceButtons
                performanceId={p.id}
                category={p.category}
                future={isFutureEvent(p)}
                iconOnly
              />
            </Stack>
          </HStack>
        );
      })}
    </Grid>
  );
}

function Timeline({
  onSelect,
  seriesFilter
}: {
  onSelect: (p: Performance) => void;
  seriesFilter: string;
}) {
  const { t } = useTranslation();
  const performances = usePerformances();
  const { records, map } = useAttendance();

  const multiSeries = seriesFilter === MULTI_SERIES_FILTER;
  const seriesId = multiSeries ? '' : seriesFilter;
  const attended = useMemo(() => {
    const ids = new Set(records.filter((r) => r.status === 'attended').map((r) => r.performanceId));
    return performances.filter(
      (p) =>
        ids.has(p.id) &&
        (!seriesId || p.seriesIds.includes(seriesId)) &&
        (!multiSeries || p.seriesIds.length > 1)
    );
  }, [performances, records, seriesId, multiSeries]);

  if (attended.length === 0) {
    return <Text color="fg.muted">{t('timeline.empty')}</Text>;
  }

  const byYear = new Map<string, Performance[]>();
  for (const p of attended) {
    const year = p.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), p]);
  }

  return (
    <Stack gap="6" w="full" maxW="3xl" mx="auto">
      {[...byYear.entries()].map(([year, events]) => (
        <Stack key={year} gap="0">
          <Text textStyle="display" color="accent.default" fontSize="2xl">
            {year}
          </Text>
          <Stack gap="0" borderColor="accent.a6" borderLeftWidth="2px" ml="2" pl="0">
            {events.map((p) => {
              const record = map[p.id];
              const label = legLabel(p);
              return (
                <HStack
                  key={p.id}
                  {...clickable(() => onSelect(p))}
                  cursor="pointer"
                  position="relative"
                  gap="3"
                  alignItems="flex-start"
                  py="2.5"
                  pl="5"
                  transition="colors"
                  _hover={{ bgColor: 'bg.subtle' }}
                >
                  <Box
                    position="absolute"
                    top="4"
                    left="-5px"
                    borderRadius="full"
                    w="2"
                    h="2"
                    bgColor={isWatched(record, p) ? 'blue.9' : 'accent.default'}
                  />
                  <Text
                    flexShrink={0}
                    minW="16"
                    color="fg.muted"
                    fontSize="sm"
                    fontVariantNumeric="tabular-nums"
                  >
                    {p.date.slice(5).replace('-', '/')}
                  </Text>
                  <Stack flex="1" gap="0.5" minW="0">
                    <Text fontSize="sm" fontWeight="medium" lineClamp={2}>
                      {p.tourName}
                      {label ? ` ${label}` : ''}
                    </Text>
                    <HStack gap="2" alignItems="center" flexWrap="wrap">
                      {p.seriesIds.slice(0, 2).map((id) => (
                        <SeriesBadge key={id} seriesId={id} />
                      ))}
                      <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                        <VenueText performance={p} compact />
                      </Text>
                      {record?.rating && (
                        <HStack gap="0.5" color="accent.default">
                          {Array.from({ length: record.rating }, (_, i) => (
                            <FaStar key={i} size={10} />
                          ))}
                        </HStack>
                      )}
                    </HStack>
                    {record?.memo && (
                      <Text color="fg.muted" fontSize="xs" lineClamp={1} fontStyle="italic">
                        {record.memo}
                      </Text>
                    )}
                  </Stack>
                </HStack>
              );
            })}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

export default function Page() {
  const { t } = useTranslation();
  const series = useSeriesById();
  const { openEvent } = useDetail();
  const [seriesFilter, setSeriesFilter] = useState('');

  return (
    <>
      <Metadata title={`${t('calendar.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <SectionHeading size="2xl">{t('calendar.title')}</SectionHeading>
          <NativeSelect
            aria-label={t('events.series')}
            value={seriesFilter}
            placeholder={`${t('events.series')}: ${t('common.all')}`}
            options={[
              { value: MULTI_SERIES_FILTER, label: t('events.multi_series') },
              ...[...series.values()].map((s) => ({ value: s.id, label: s.name }))
            ]}
            onChange={setSeriesFilter}
          />
        </HStack>
        <Tabs.Root defaultValue="calendar">
          <Tabs.List>
            <Tabs.Trigger value="calendar">{t('calendar.title')}</Tabs.Trigger>
            <Tabs.Trigger value="upcoming">{t('upcoming.title')}</Tabs.Trigger>
            <Tabs.Trigger value="timeline">{t('timeline.title')}</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="calendar">
            <MonthView seriesFilter={seriesFilter} onSelect={(p) => openEvent(p.id)} />
          </Tabs.Content>
          <Tabs.Content value="upcoming">
            <Upcoming seriesFilter={seriesFilter} onSelect={(p) => openEvent(p.id)} />
          </Tabs.Content>
          <Tabs.Content value="timeline">
            <Timeline seriesFilter={seriesFilter} onSelect={(p) => openEvent(p.id)} />
          </Tabs.Content>
        </Tabs.Root>
      </Stack>
    </>
  );
}
