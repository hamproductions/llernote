import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { IconButton } from '~/components/ui/icon-button';
import { Tabs } from '~/components/ui/tabs';
import { EventCard } from '~/components/events/EventCard';
import { EventDetailDialog } from '~/components/events/EventDetailDialog';
import { Metadata } from '~/components/layout/Metadata';
import { usePerformance, usePerformances, useSeriesById } from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import type { Performance } from '~/types';

const pad = (n: number) => String(n).padStart(2, '0');

function MonthCalendar({
  onSelectDay,
  selectedDay
}: {
  onSelectDay: (day: string) => void;
  selectedDay?: string;
}) {
  const { t, i18n } = useTranslation();
  const performances = usePerformances();
  const seriesById = useSeriesById();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Performance[]>();
    for (const p of performances) {
      const list = map.get(p.date) ?? [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [performances]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`)
  ];

  const monthLabel = new Date(year, month, 1).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long'
  });
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map((d) =>
    new Date(2024, 8, 1 + d).toLocaleDateString(i18n.language, { weekday: 'short' })
  );

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  return (
    <Stack gap="3">
      <HStack justifyContent="space-between">
        <IconButton aria-label="Previous month" variant="ghost" onClick={() => changeMonth(-1)}>
          <FaChevronLeft />
        </IconButton>
        <HStack gap="2">
          <Text fontWeight="semibold">{monthLabel}</Text>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth());
              onSelectDay(todayStr);
            }}
          >
            {t('common.today')}
          </Button>
        </HStack>
        <IconButton aria-label="Next month" variant="ghost" onClick={() => changeMonth(1)}>
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
          return (
            <Box
              key={day ?? `empty-${i}`}
              onClick={() => day && onSelectDay(day)}
              cursor={day ? 'pointer' : undefined}
              borderColor={selectedDay === day ? 'accent.default' : 'border.subtle'}
              borderRadius="l1"
              borderWidth="1px"
              minH="16"
              p="1"
              bgColor={day === todayStr ? 'accent.a3' : undefined}
              opacity={day ? 1 : 0}
            >
              {day && (
                <Stack gap="0.5">
                  <Text color="fg.muted" fontSize="xs">
                    {Number(day.slice(8))}
                  </Text>
                  <HStack gap="0.5" flexWrap="wrap">
                    {events.slice(0, 4).map((p) => (
                      <Box
                        key={p.id}
                        title={p.tourName}
                        style={{
                          backgroundColor: seriesById.get(p.seriesIds[0] ?? '')?.color ?? '#e4007f'
                        }}
                        borderRadius="full"
                        w="2"
                        h="2"
                      />
                    ))}
                    {events.length > 4 && (
                      <Text color="fg.muted" fontSize="2xs">
                        +{events.length - 4}
                      </Text>
                    )}
                  </HStack>
                </Stack>
              )}
            </Box>
          );
        })}
      </Grid>
    </Stack>
  );
}

function Timeline({ onSelect }: { onSelect: (p: Performance) => void }) {
  const { t } = useTranslation();
  const performances = usePerformances();
  const { records } = useAttendance();

  const attended = useMemo(() => {
    const ids = new Set(records.filter((r) => r.status === 'attended').map((r) => r.performanceId));
    return performances.filter((p) => ids.has(p.id));
  }, [performances, records]);

  if (attended.length === 0) {
    return <Text color="fg.muted">{t('timeline.empty')}</Text>;
  }

  const byYear = new Map<string, Performance[]>();
  for (const p of attended) {
    const year = p.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), p]);
  }

  return (
    <Stack gap="6">
      {[...byYear.entries()].map(([year, events]) => (
        <Stack key={year} gap="3">
          <Heading as="h2" color="accent.default" fontSize="xl">
            {year}
          </Heading>
          <Stack gap="3" borderColor="accent.a6" borderLeftWidth="2px" pl="4">
            {events.map((p) => (
              <EventCard key={p.id} performance={p} onClick={() => onSelect(p)} />
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

export default function Page() {
  const { t } = useTranslation();
  const performances = usePerformances();
  const [selectedDay, setSelectedDay] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const selected = usePerformance(selectedId);

  const dayEvents = useMemo(
    () => (selectedDay ? performances.filter((p) => p.date === selectedDay) : []),
    [performances, selectedDay]
  );

  return (
    <>
      <Metadata title={`${t('calendar.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <Heading as="h1" fontSize="2xl">
          {t('calendar.title')}
        </Heading>
        <Tabs.Root defaultValue="calendar">
          <Tabs.List>
            <Tabs.Trigger value="calendar">{t('calendar.title')}</Tabs.Trigger>
            <Tabs.Trigger value="timeline">{t('timeline.title')}</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="calendar">
            <Stack gap="4">
              <MonthCalendar onSelectDay={setSelectedDay} selectedDay={selectedDay} />
              {selectedDay && (
                <Stack gap="3">
                  <Text fontWeight="semibold">{selectedDay}</Text>
                  {dayEvents.length === 0 && (
                    <Text color="fg.muted" fontSize="sm">
                      {t('events.no_results')}
                    </Text>
                  )}
                  {dayEvents.map((p) => (
                    <EventCard key={p.id} performance={p} onClick={() => setSelectedId(p.id)} />
                  ))}
                </Stack>
              )}
            </Stack>
          </Tabs.Content>
          <Tabs.Content value="timeline">
            <Timeline onSelect={(p) => setSelectedId(p.id)} />
          </Tabs.Content>
        </Tabs.Root>
        <EventDetailDialog
          performance={selected}
          open={selected !== undefined}
          onClose={() => setSelectedId(undefined)}
        />
      </Stack>
    </>
  );
}
