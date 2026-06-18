import { lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { join } from 'path-browserify';
import {
  FaArrowRight,
  FaCalendarDays,
  FaChartColumn,
  FaCloudArrowDown,
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
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { usePerformances, useSongs } from '~/hooks/useData';
import { useAppSettings } from '~/hooks/useAppSettings';
import { useAttendance } from '~/hooks/useAttendance';
import { useDerivedDataWorker } from '~/hooks/useDerivedDataWorker';
import { useDetail } from '~/components/detail/DetailStack';
import { todayString } from '~/utils/event-filter';

const href = (path: string) => join(import.meta.env.BASE_URL, path);
const EventernoteImportDialog = lazy(() =>
  import('~/components/eventernote/EventernoteImportDialog').then((module) => ({
    default: module.EventernoteImportDialog
  }))
);

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
    <Link href={href(to)} display="block" w="full" h="full" _hover={{ textDecoration: 'none' }}>
      <Card.Root
        cursor="pointer"
        w="full"
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
  const songs = useSongs();
  const { inPersonOnly } = useAppSettings();
  const { records } = useAttendance();
  const { openEvent } = useDetail();
  const [search, setSearch] = useState('');
  const [eventernoteOpen, setEventernoteOpen] = useState(false);
  const [eventernoteMounted, setEventernoteMounted] = useState(false);

  const openEventernote = () => {
    setEventernoteMounted(true);
    setEventernoteOpen(true);
  };

  const derivedStats = useDerivedDataWorker(
    'stats',
    {
      records,
      year: '',
      seriesId: '',
      category: '',
      multiSeries: false,
      inPersonOnly
    },
    [records, inPersonOnly]
  );
  const stats = derivedStats.result;

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
    const rest = upcoming.filter((p) => !goingIds.has(p.id));
    return [...going, ...rest].slice(0, 2);
  }, [performances, goingIds]);

  const recentAttended = useMemo(() => {
    const today = todayString();
    const ids = new Set(records.filter((r) => r.status === 'attended').map((r) => r.performanceId));
    return performances.filter((p) => ids.has(p.id) && p.date <= today).slice(0, 3);
  }, [performances, records]);

  const hasData = (stats?.attendedCount ?? 0) > 0;

  const submitSearch = () => {
    window.location.href = `${href('/events')}?q=${encodeURIComponent(search)}`;
  };

  return (
    <>
      <Metadata helmet />
      <Stack gap="6">
        <Stack
          gap="4"
          alignItems="center"
          w="full"
          maxW="2xl"
          mx="auto"
          py={{ base: '8', md: '14' }}
          textAlign="center"
        >
          <Heading
            as="h1"
            textStyle="display"
            style={{
              background: 'linear-gradient(92deg, #e4007f 10%, #ff7a00 45%, #00a0e0 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            fontSize={{ base: '5xl', md: '6xl' }}
            lineHeight="1.1"
          >
            LLerNote
          </Heading>
          <Text maxW="md" color="fg.muted" fontSize={{ base: 'sm', md: 'md' }}>
            {t('home.tagline')}
          </Text>
          <HStack gap="2" w="full" maxW="lg">
            <Input
              size="lg"
              value={search}
              placeholder={t('events.search_placeholder')}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              borderRadius="full"
              px="5"
              boxShadow="0 0 24px rgba(228,0,127,0.18)"
            />
            <Button
              size="lg"
              aria-label={t('common.search')}
              onClick={submitSearch}
              borderRadius="full"
            >
              <FaMagnifyingGlass />
            </Button>
          </HStack>
          {!hasData && (
            <Stack gap="3" alignItems="center">
              <HStack gap="2" justifyContent="center" flexWrap="wrap">
                <Text color="fg.muted" fontSize="sm">
                  {t('home.get_started')}
                </Text>
                <Button asChild size="sm">
                  <a href={href('/events')}>
                    {t('home.browse_events')}
                    <FaArrowRight />
                  </a>
                </Button>
              </HStack>
              <Card.Root w="full" maxW="lg">
                <Card.Body gap="2" alignItems="center" p="4" textAlign="center">
                  <Text fontWeight="bold">{t('eventernote.onboarding_title')}</Text>
                  <Text color="fg.muted" fontSize="sm">
                    {t('eventernote.onboarding_text')}
                  </Text>
                  <Button size="sm" variant="outline" onClick={openEventernote}>
                    <FaCloudArrowDown />
                    {t('eventernote.import_from')}
                  </Button>
                </Card.Body>
              </Card.Root>
            </Stack>
          )}
        </Stack>

        {hasData && stats && (
          <Grid gap="2" gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }}>
            {(
              [
                ['total_attended', stats.attendedCount],
                ['songs_witnessed', stats.songsWitnessed],
                ['unique_songs', `${stats.uniqueSongs}/${songs.length}`],
                ['venues_visited', stats.venuesVisited],
                ['total_interested', stats.interestedCount]
              ] as const
            ).map(([key, value]) => (
              <Link
                key={key}
                href={href('/stats')}
                display="block"
                w="full"
                _hover={{ textDecoration: 'none' }}
              >
                <Stack
                  cursor="pointer"
                  gap="0"
                  alignItems="center"
                  borderColor="accent.a5"
                  borderRadius="l3"
                  borderWidth="1px"
                  w="full"
                  p="4"
                  bgColor="accent.a2"
                  transition="all"
                  _hover={{ borderColor: 'accent.8', transform: 'translateY(-2px)' }}
                >
                  <Text
                    textStyle="display"
                    color="accent.default"
                    fontSize="3xl"
                    fontWeight="bold"
                    lineHeight="1.2"
                  >
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
              <SectionHeading>{t('home.next_up')}</SectionHeading>
              <Link href={href('/calendar')}>
                <Text color="accent.default" fontSize="sm">
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
                  <EventCard performance={p} onClick={() => openEvent(p.id)} />
                </Stack>
              ))}
            </Grid>
          </Stack>
        )}

        {recentAttended.length > 0 && (
          <Stack gap="2">
            <HStack justifyContent="space-between" alignItems="baseline">
              <SectionHeading>{t('home.recent')}</SectionHeading>
              <Link href={href('/calendar')}>
                <Text color="accent.default" fontSize="sm">
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
                <EventCard key={p.id} performance={p} onClick={() => openEvent(p.id)} />
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

        {eventernoteMounted && (
          <Suspense fallback={null}>
            <EventernoteImportDialog
              open={eventernoteOpen}
              onClose={() => setEventernoteOpen(false)}
            />
          </Suspense>
        )}
      </Stack>
    </>
  );
}
