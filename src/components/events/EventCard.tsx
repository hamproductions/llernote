import { useTranslation } from 'react-i18next';
import { FaCheck, FaRegStar } from 'react-icons/fa6';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from './SeriesBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { useAttendance } from '~/hooks/useAttendance';
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

  return (
    <Card.Root
      onClick={onClick}
      style={{
        borderLeftColor:
          record?.status === 'attended'
            ? 'var(--colors-accent-default)'
            : record?.status === 'interested'
              ? 'var(--colors-amber-9)'
              : 'transparent'
      }}
      cursor={onClick ? 'pointer' : undefined}
      borderLeftWidth="4px"
    >
      <Card.Body p="4">
        <Stack gap="2">
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
                {record?.status === 'attended' && (
                  <Badge size="sm">
                    <FaCheck /> {t('events.status_attended')}
                  </Badge>
                )}
                {record?.status === 'interested' && (
                  <Badge size="sm" colorPalette="amber">
                    <FaRegStar /> {t('events.status_interested')}
                  </Badge>
                )}
              </HStack>
              <Text fontWeight="semibold" lineClamp={2}>
                {performance.tourName}
              </Text>
              <Text color="fg.muted" fontSize="sm" lineClamp={1}>
                {performance.venue}
              </Text>
            </Stack>
          </HStack>
          <Wrap gap="2">
            <AttendanceButtons performanceId={performance.id} />
          </Wrap>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
