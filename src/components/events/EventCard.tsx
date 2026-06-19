import { useTranslation } from 'react-i18next';
import { FaStar } from 'react-icons/fa6';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from './SeriesBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { EventThumb } from './EventThumb';
import { VenueText } from './VenueText';
import { useAttendance } from '~/hooks/useAttendance';
import { daysFromToday, isFutureEvent } from '~/utils/event-filter';
import { isWatched, isWitnessed } from '~/utils/attendance/witness';
import { clickable } from '~/utils/clickable';
import type { Performance } from '~/types';

export function EventCard({
  performance,
  onClick
}: {
  performance: Performance;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const { get } = useAttendance();
  const record = get(performance.id);
  const witnessed = isWitnessed(record, performance);
  const watched = isWatched(record, performance);
  const future = isFutureEvent(performance);
  const days = daysFromToday(performance.date);
  const relativeDate =
    days === 0
      ? t('events.today')
      : days > 0
        ? t('events.days_until', { count: days })
        : t('events.days_ago', { count: Math.abs(days) });

  return (
    <Card.Root
      {...(onClick ? clickable(onClick) : {})}
      cursor={onClick ? 'pointer' : undefined}
      borderLeftWidth="4px"
      borderLeftColor={
        witnessed
          ? 'accent.default'
          : watched
            ? 'blue.9'
            : record?.status === 'interested'
              ? 'amber.9'
              : 'transparent'
      }
      bgColor={
        witnessed
          ? 'accent.a2'
          : watched
            ? 'blue.a2'
            : record?.status === 'interested'
              ? 'amber.a2'
              : undefined
      }
      transition="colors"
      _hover={onClick ? { borderColor: 'accent.8' } : undefined}
    >
      <Card.Body h="full" p="4">
        <Stack gap="2" h="full">
          <HStack gap="2" justifyContent="space-between" alignItems="flex-start">
            <Stack flex="1" gap="1" minW="0">
              <HStack gap="2" flexWrap="wrap">
                <Text color="fg.muted" fontSize="sm" fontVariantNumeric="tabular-nums">
                  {performance.date}
                </Text>
                <Text color="fg.subtle" fontSize="xs">
                  {relativeDate}
                </Text>
                {performance.seriesIds.map((id) => (
                  <SeriesBadge key={id} seriesId={id} />
                ))}
                {performance.hasSetlist && (
                  <Badge variant="outline" size="sm">
                    {t('events.setlist')}
                  </Badge>
                )}
              </HStack>
              <Text fontWeight="semibold">{performance.tourName}</Text>
              <Text color="fg.muted" fontSize="sm" lineClamp={1}>
                <VenueText performance={performance} compact />
              </Text>
              {record?.rating && (
                <HStack gap="0.5" color="accent.default">
                  {Array.from({ length: record.rating }, (_, i) => (
                    <FaStar key={i} size={11} />
                  ))}
                </HStack>
              )}
              {record?.memo && (
                <Text color="fg.muted" fontSize="xs" lineClamp={1} fontStyle="italic">
                  {record.memo}
                </Text>
              )}
            </Stack>
            <EventThumb performance={performance} />
          </HStack>
          <Wrap gap="2" mt="auto">
            <AttendanceButtons
              performanceId={performance.id}
              category={performance.category}
              future={future}
            />
          </Wrap>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
