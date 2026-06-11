import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaCheck, FaListUl, FaRegStar } from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { IconButton } from '~/components/ui/icon-button';
import { SeriesBadge } from './SeriesBadge';
import { CategoryBadge } from './CategoryBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { useAttendance } from '~/hooks/useAttendance';
import { isFutureEvent } from '~/utils/event-filter';
import { eventernoteSearchUrl } from '~/utils/share';
import { clickable } from '~/utils/clickable';
import type { TourGroup } from '~/utils/tour';
import type { Performance } from '~/types';

export const legLabel = (performance: Performance) => {
  const [, month, day] = performance.date.split('-');
  const dateLike = `${Number(month)}/${Number(day)}`;
  return [performance.concertName, performance.performanceName]
    .filter((part): part is string => !!part && part !== dateLike)
    .join(' ');
};

function StatusDot({ performance }: { performance: Performance }) {
  const { get } = useAttendance();
  const record = get(performance.id);
  if (record?.status === 'attended') {
    return (
      <Badge size="sm" variant="solid">
        <FaCheck />
      </Badge>
    );
  }
  if (record?.status === 'interested') {
    return (
      <Badge size="sm" variant="solid" colorPalette="amber">
        <FaRegStar />
      </Badge>
    );
  }
  return null;
}

function LegRow({
  performance,
  onSelect
}: {
  performance: Performance;
  onSelect: (p: Performance) => void;
}) {
  const { t } = useTranslation();
  const { get } = useAttendance();
  const record = get(performance.id);
  const label = legLabel(performance);

  return (
    <HStack
      {...clickable(() => onSelect(performance))}
      cursor="pointer"
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
      py="0.5"
      pl="2.5"
      _hover={{ bgColor: 'bg.subtle' }}
    >
      <Stack flex="1" gap="0" minW="0">
        <HStack gap="1.5">
          <Text
            flexShrink={0}
            color="fg.muted"
            textDecoration={performance.canceled ? 'line-through' : undefined}
            fontSize="xs"
            fontVariantNumeric="tabular-nums"
          >
            {performance.date.slice(5).replace('-', '/')}
          </Text>
          {label && (
            <Text fontSize="xs" fontWeight="medium" lineClamp={1}>
              {label}
            </Text>
          )}
          {performance.startTime && (
            <Text flexShrink={0} color="fg.subtle" fontSize="xs">
              {performance.startTime}〜
            </Text>
          )}
          <StatusDot performance={performance} />
        </HStack>
        <Text color="fg.muted" fontSize="xs" lineClamp={1}>
          {performance.venue}
        </Text>
      </Stack>
      <HStack onClick={(e) => e.stopPropagation()} gap="0.5" flexShrink={0}>
        <AttendanceButtons performanceId={performance.id} future={isFutureEvent(performance)} />
        {performance.hasSetlist && (
          <IconButton
            aria-label={t('events.setlist')}
            title={t('events.setlist')}
            variant="ghost"
            size="xs"
            onClick={() => onSelect(performance)}
          >
            <FaListUl />
          </IconButton>
        )}
      </HStack>
    </HStack>
  );
}

function CardHeader({ tour }: { tour: TourGroup }) {
  const { t } = useTranslation();
  const first = tour.legs[0]!;
  const dateRange =
    tour.startDate === tour.endDate ? tour.startDate : `${tour.startDate} 〜 ${tour.endDate}`;

  return (
    <Stack gap="1">
      <HStack gap="1.5" justifyContent="space-between">
        <Text color="fg.muted" fontSize="xs" fontVariantNumeric="tabular-nums">
          {dateRange}
        </Text>
        <IconButton
          asChild
          aria-label={t('share.eventernote')}
          title={t('share.eventernote')}
          variant="ghost"
          size="xs"
          color="fg.muted"
        >
          <a
            href={eventernoteSearchUrl(first)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <FaArrowUpRightFromSquare />
          </a>
        </IconButton>
      </HStack>
      <Text fontSize="sm" fontWeight="semibold" lineHeight="tight">
        {tour.tourName}
      </Text>
      <Wrap gap="1">
        {tour.seriesIds.map((id) => (
          <SeriesBadge key={id} seriesId={id} />
        ))}
        <CategoryBadge category={first.category} tourType={first.tourType} />
      </Wrap>
    </Stack>
  );
}

export function TourCard({
  tour,
  onSelect
}: {
  tour: TourGroup;
  onSelect: (p: Performance) => void;
}) {
  const { get } = useAttendance();
  const single = tour.legs.length === 1;
  const first = tour.legs[0]!;

  if (single) {
    const record = get(first.id);
    return (
      <Card.Root
        {...clickable(() => onSelect(first))}
        cursor="pointer"
        borderLeftWidth="3px"
        borderLeftColor={
          record?.status === 'attended'
            ? 'accent.default'
            : record?.status === 'interested'
              ? 'amber.9'
              : 'transparent'
        }
        transition="colors"
        _hover={{ borderColor: 'accent.8' }}
      >
        <Card.Body gap="2" p="3">
          <CardHeader tour={tour} />
          <HStack gap="2" justifyContent="space-between">
            <Text color="fg.muted" fontSize="xs" lineClamp={1}>
              {first.venue}
              {first.startTime ? `・${first.startTime}〜` : ''}
            </Text>
            <HStack onClick={(e) => e.stopPropagation()} gap="1" flexShrink={0}>
              <StatusDot performance={first} />
              <AttendanceButtons performanceId={first.id} future={isFutureEvent(first)} />
            </HStack>
          </HStack>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root>
      <Card.Body gap="2" p="3">
        <Box {...clickable(() => onSelect(first))} cursor="pointer">
          <CardHeader tour={tour} />
        </Box>
        <Stack gap="1">
          {tour.legs.map((leg) => (
            <LegRow key={leg.id} performance={leg} onSelect={onSelect} />
          ))}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
