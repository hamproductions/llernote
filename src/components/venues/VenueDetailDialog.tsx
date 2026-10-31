import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaChevronLeft, FaLocationDot, FaXmark } from 'react-icons/fa6';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { ScopeTabs } from '~/components/events/ScopeTabs';
import { useAttendance } from '~/hooks/useAttendance';
import { sortedPerformances } from '~/data/core';
import { isWatched, isWitnessed, scopeMatches, type Scope } from '~/utils/attendance/witness';
import { venueKey } from '~/utils/venues';
import type { VenueSummary } from '~/types';

export function VenueDetailDialog({
  venue,
  open,
  onClose,
  onBack,
  onOpenEvent
}: {
  venue: VenueSummary;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  onOpenEvent?: (performanceId: string) => void;
}) {
  const { t } = useTranslation();
  const attendance = useAttendance();
  const [scope, setScope] = useState<Scope>('all');

  const venuePerformances = useMemo(
    () =>
      sortedPerformances.filter(
        (performance) =>
          venueKey(performance) === venue.id && scopeMatches(scope, performance.category)
      ),
    [venue.id, scope]
  );

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content w="full" maxW="2xl" maxH="85vh" mx="4" overflowY="auto">
          <Stack gap="4" p={{ base: '4', md: '6' }}>
            <Stack gap="1.5" pl={onBack ? '8' : undefined} pr="8">
              <HStack gap="2" alignItems="center" flexWrap="wrap">
                <Dialog.Title>{venue.name}</Dialog.Title>
                {venue.website && (
                  <Link
                    href={venue.website}
                    target="_blank"
                    rel="noreferrer"
                    color="accent.default"
                  >
                    <FaArrowUpRightFromSquare />
                  </Link>
                )}
              </HStack>
              {(venue.location ?? venue.address) && (
                <HStack gap="1.5" color="fg.muted" fontSize="sm">
                  <FaLocationDot />
                  <Text>{venue.location ?? venue.address}</Text>
                </HStack>
              )}
              <Wrap gap="2">
                <Badge variant="subtle">
                  {t('venues.performance_count', { count: venue.performanceCount })}
                </Badge>
                {venue.witnessedCount > 0 && (
                  <Badge variant="solid">
                    {t('venues.witnessed_count', { count: venue.witnessedCount })}
                  </Badge>
                )}
                {venue.watchedCount > 0 && (
                  <Badge variant="solid" colorPalette="blue">
                    {t('venues.watched_count', { count: venue.watchedCount })}
                  </Badge>
                )}
                <Badge variant="outline">
                  {venue.firstDate} - {venue.lastDate}
                </Badge>
              </Wrap>
              <ScopeTabs value={scope} onChange={setScope} size="xs" />
            </Stack>

            <Stack gap="2">
              {venuePerformances.map((performance) => {
                const record = attendance.get(performance.id);
                return (
                  <Card.Root
                    key={performance.id}
                    onClick={() => onOpenEvent?.(performance.id)}
                    cursor={onOpenEvent ? 'pointer' : undefined}
                  >
                    <Card.Body p="3">
                      <HStack gap="3" justifyContent="space-between" alignItems="center">
                        <Stack flex="1" gap="0.5" minW="0">
                          <HStack gap="2" flexWrap="wrap">
                            <Text color="fg.muted" fontSize="xs">
                              {performance.date}
                            </Text>
                            {isWitnessed(record, performance) ? (
                              <Badge size="sm" variant="solid">
                                {t('events.status_attended')}
                              </Badge>
                            ) : isWatched(record, performance) ? (
                              <Badge size="sm" variant="solid" colorPalette="blue">
                                {t('events.status_watched')}
                              </Badge>
                            ) : null}
                          </HStack>
                          <Text fontSize="sm" fontWeight="bold" lineClamp={2}>
                            {performance.tourName}
                            {performance.performanceName ? ` ${performance.performanceName}` : ''}
                          </Text>
                        </Stack>
                        <Wrap hideBelow="md" gap="1.5" flexShrink={0}>
                          {performance.seriesIds.slice(0, 2).map((id) => (
                            <SeriesBadge key={id} seriesId={id} />
                          ))}
                        </Wrap>
                      </HStack>
                    </Card.Body>
                  </Card.Root>
                );
              })}
            </Stack>
            {venuePerformances.length === 0 && (
              <Text color="fg.muted">{t('common.no_results')}</Text>
            )}
          </Stack>
          {onBack && (
            <IconButton
              aria-label={t('common.back')}
              variant="ghost"
              size="sm"
              onClick={onBack}
              position="absolute"
              top="2"
              left="2"
            >
              <FaChevronLeft />
            </IconButton>
          )}
          <Dialog.CloseTrigger asChild position="absolute" top="2" right="2">
            <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
              <FaXmark />
            </IconButton>
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
