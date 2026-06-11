import { useTranslation } from 'react-i18next';
import { FaCheck, FaListUl, FaRegStar } from 'react-icons/fa6';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { SeriesBadge } from './SeriesBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { useAttendance } from '~/hooks/useAttendance';
import { isFutureEvent } from '~/utils/event-filter';
import type { TourGroup } from '~/utils/tour';
import type { Performance } from '~/types';

function LegRow({
  performance,
  dayNumber,
  showDayNumber,
  onSelect
}: {
  performance: Performance;
  dayNumber: number;
  showDayNumber: boolean;
  onSelect: (p: Performance) => void;
}) {
  const { t } = useTranslation();
  const { get } = useAttendance();
  const record = get(performance.id);
  const future = isFutureEvent(performance);

  return (
    <HStack
      gap="2"
      justifyContent="space-between"
      borderLeftWidth="3px"
      borderLeftColor={
        record?.status === 'attended'
          ? 'accent.default'
          : record?.status === 'interested'
            ? 'amber.9'
            : 'border.subtle'
      }
      py="1"
      pl="3"
      flexWrap="wrap"
    >
      <HStack flex="1" gap="2" minW="0" flexWrap="wrap">
        {showDayNumber && (
          <Badge size="sm" variant="outline" flexShrink={0}>
            Day {dayNumber}
          </Badge>
        )}
        <Text flexShrink={0} color="fg.muted" fontSize="sm" fontVariantNumeric="tabular-nums">
          {performance.date}
        </Text>
        <Text fontSize="sm" lineClamp={1}>
          {performance.venue}
        </Text>
        {record?.status === 'attended' && (
          <Badge size="sm" variant="solid">
            <FaCheck />
          </Badge>
        )}
        {record?.status === 'interested' && (
          <Badge size="sm" variant="solid" colorPalette="amber">
            <FaRegStar />
          </Badge>
        )}
      </HStack>
      <HStack gap="1" flexShrink={0}>
        <AttendanceButtons performanceId={performance.id} future={future} />
        {performance.hasSetlist && (
          <Button size="xs" variant="ghost" onClick={() => onSelect(performance)}>
            <FaListUl />
            {t('events.setlist')}
          </Button>
        )}
      </HStack>
    </HStack>
  );
}

export function TourCard({
  tour,
  onSelect
}: {
  tour: TourGroup;
  onSelect: (p: Performance) => void;
}) {
  const dateRange =
    tour.startDate === tour.endDate ? tour.startDate : `${tour.startDate} 〜 ${tour.endDate}`;

  return (
    <Card.Root>
      <Card.Body p="4">
        <Stack gap="3">
          <Stack onClick={() => tour.legs[0] && onSelect(tour.legs[0])} cursor="pointer" gap="1">
            <Wrap gap="2">
              <Text color="fg.muted" fontSize="sm" fontVariantNumeric="tabular-nums">
                {dateRange}
              </Text>
              {tour.seriesIds.map((id) => (
                <SeriesBadge key={id} seriesId={id} />
              ))}
            </Wrap>
            <Text fontWeight="semibold" lineClamp={2}>
              {tour.tourName}
            </Text>
          </Stack>
          <Stack gap="1">
            {tour.legs.map((leg, i) => (
              <LegRow
                key={leg.id}
                performance={leg}
                dayNumber={i + 1}
                showDayNumber={tour.legs.length > 1}
                onSelect={onSelect}
              />
            ))}
          </Stack>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
