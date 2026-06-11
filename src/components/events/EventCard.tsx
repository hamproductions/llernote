import { useTranslation } from 'react-i18next';
import { FaStar } from 'react-icons/fa6';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from './SeriesBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { useAttendance } from '~/hooks/useAttendance';
import { isFutureEvent } from '~/utils/event-filter';
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
  const future = isFutureEvent(performance);

  return (
    <Card.Root
      {...(onClick ? clickable(onClick) : {})}
      cursor={onClick ? 'pointer' : undefined}
      borderLeftWidth="4px"
      borderLeftColor={
        record?.status === 'attended'
          ? 'accent.default'
          : record?.status === 'interested'
            ? 'amber.9'
            : 'transparent'
      }
      bgColor={
        record?.status === 'attended'
          ? 'accent.a2'
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
                {performance.venue}
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
          </HStack>
          <Wrap gap="2" mt="auto">
            <AttendanceButtons performanceId={performance.id} future={future} />
          </Wrap>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
