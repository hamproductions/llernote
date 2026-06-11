import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { join } from 'path-browserify';
import {
  FaArrowRight,
  FaCalendarDays,
  FaChartColumn,
  FaMagnifyingGlass,
  FaMusic,
  FaTableCellsLarge
} from 'react-icons/fa6';
import { Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { Link } from '~/components/ui/link';
import { EventCard } from '~/components/events/EventCard';
import { EventDetailDialog } from '~/components/events/EventDetailDialog';
import { Metadata } from '~/components/layout/Metadata';
import { usePerformanceById, usePerformances, useSetlists, useSongs } from '~/hooks/useData';
import { useAttendance } from '~/hooks/useAttendance';
import { computeStats } from '~/utils/stats';
import { todayString } from '~/utils/event-filter';
import type { Performance } from '~/types';

const href = (path: string) => join(import.meta.env.BASE_URL, path);

function QuickLink({
  to,
  icon,
  title,
  description
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href(to)} _hover={{ textDecoration: 'none' }}>
      <Card.Root
        cursor="pointer"
        h="full"
        transition="all"
        _hover={{ borderColor: 'accent.8', transform: 'translateY(-2px)' }}
      >
        <Card.Body gap="2" p="4">
          <HStack gap="2" color="accent.default">
            {icon}
            <Text color="fg.default" fontWeight="semibold">
              {title}
            </Text>
          </HStack>
          <Text color="fg.muted" fontSize="sm">
            {description}
          </Text>
        </Card.Body>
      </Card.Root>
    </Link>
  );
}

export default function Page() {
  const { t } = useTranslation();
  const performances = usePerformances();
  const performanceById = usePerformanceById();
  const setlists = useSetlists();
  const songs = useSongs();
  const { records } = useAttendance();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Performance>();

  const stats = useMemo(
    () => computeStats(records, performanceById, setlists),
    [records, performanceById, setlists]
  );

  const goingIds = useMemo(
    () => new Set(records.filter((r) => r.status === 'interested').map((r) => r.performanceId)),
    [records]
  );

  const nextUp = useMemo(() => {
    const today = todayString();
    const upcoming = performances
      .filter((p) => p.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    const going = upcoming.filter((p) => goingIds.has(p.id));
    return (going.length > 0 ? going : upcoming).slice(0, 2);
  }, [performances, goingIds]);

  const recentAttended = useMemo(() => {
    const ids = new Set(records.filter((r) => r.status === 'attended').map((r) => r.performanceId));
    return performances.filter((p) => ids.has(p.id)).slice(0, 3);
  }, [performances, records]);

  const hasData = stats.attendedCount > 0;

  const submitSearch = () => {
    window.location.href = `${href('/events')}?q=${encodeURIComponent(search)}`;
  };

  return (
    <>
      <Metadata helmet />
      <Stack gap="6">
        <Stack gap="3" alignItems="center" py={{ base: '6', md: '10' }} textAlign="center">
          <Heading as="h1" fontSize={{ base: '3xl', md: '4xl' }}>
            <Text as="span" color="accent.default">
              LLerNote
            </Text>
          </Heading>
          <Text maxW="md" color="fg.muted">
            {t('home.tagline')}
          </Text>
          <HStack gap="2" w="full" maxW="lg">
            <Input
              size="lg"
              value={search}
              placeholder={t('events.search_placeholder')}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
            />
            <Button size="lg" aria-label={t('common.search')} onClick={submitSearch}>
              <FaMagnifyingGlass />
            </Button>
          </HStack>
          {!hasData && (
            <HStack gap="2" justifyContent="center" flexWrap="wrap">
              <Text color="fg.muted" fontSize="sm">
                {t('home.get_started')}
              </Text>
              <Link href={href('/events')}>
                <Button size="sm">
                  {t('home.browse_events')}
                  <FaArrowRight />
                </Button>
              </Link>
            </HStack>
          )}
        </Stack>

        {hasData && (
          <Grid gap="2" gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}>
            {(
              [
                ['total_attended', stats.attendedCount],
                ['songs_witnessed', stats.songsWitnessed],
                ['unique_songs', `${stats.uniqueSongs}/${songs.length}`],
                ['venues_visited', stats.venuesVisited]
              ] as const
            ).map(([key, value]) => (
              <Link key={key} href={href('/stats')} _hover={{ textDecoration: 'none' }}>
                <Stack
                  cursor="pointer"
                  gap="0"
                  alignItems="center"
                  borderRadius="l2"
                  p="3"
                  bgColor="bg.subtle"
                  transition="colors"
                  _hover={{ bgColor: 'bg.muted' }}
                >
                  <Text color="accent.default" fontSize="2xl" fontWeight="bold">
                    {value}
                  </Text>
                  <Text color="fg.muted" fontSize="xs">
                    {t(`stats.${key}`)}
                  </Text>
                </Stack>
              </Link>
            ))}
          </Grid>
        )}

        {nextUp.length > 0 && (
          <Stack gap="2">
            <HStack justifyContent="space-between" alignItems="baseline">
              <Heading as="h2" fontSize="lg">
                {t('home.next_up')}
              </Heading>
              <Link href={href('/calendar')}>
                <Text color="accent.text" fontSize="sm">
                  {t('home.view_all')} →
                </Text>
              </Link>
            </HStack>
            <Grid
              gap="3"
              alignItems="start"
              gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
            >
              {nextUp.map((p) => (
                <Stack key={p.id} gap="1">
                  {goingIds.has(p.id) && (
                    <Wrap>
                      <Badge size="sm" variant="solid" colorPalette="amber">
                        {t('events.status_going')}
                      </Badge>
                    </Wrap>
                  )}
                  <EventCard performance={p} onClick={() => setSelected(p)} />
                </Stack>
              ))}
            </Grid>
          </Stack>
        )}

        {recentAttended.length > 0 && (
          <Stack gap="2">
            <HStack justifyContent="space-between" alignItems="baseline">
              <Heading as="h2" fontSize="lg">
                {t('home.recent')}
              </Heading>
              <Link href={href('/calendar')}>
                <Text color="accent.text" fontSize="sm">
                  {t('home.view_all')} →
                </Text>
              </Link>
            </HStack>
            <Grid
              gap="3"
              alignItems="start"
              gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }}
            >
              {recentAttended.map((p) => (
                <EventCard key={p.id} performance={p} onClick={() => setSelected(p)} />
              ))}
            </Grid>
          </Stack>
        )}

        <Grid
          gap="3"
          gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }}
        >
          <QuickLink
            to="/events"
            icon={<FaTableCellsLarge />}
            title={t('navigation.events')}
            description={t('home.guide_events')}
          />
          <QuickLink
            to="/calendar"
            icon={<FaCalendarDays />}
            title={t('navigation.calendar')}
            description={t('home.guide_calendar')}
          />
          <QuickLink
            to="/songs"
            icon={<FaMusic />}
            title={t('navigation.songs')}
            description={t('home.guide_songs')}
          />
          <QuickLink
            to="/stats"
            icon={<FaChartColumn />}
            title={t('navigation.stats')}
            description={t('home.guide_stats')}
          />
        </Grid>

        <EventDetailDialog
          performance={selected}
          open={selected !== undefined}
          onClose={() => setSelected(undefined)}
        />
      </Stack>
    </>
  );
}
