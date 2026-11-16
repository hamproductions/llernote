import { useTranslation } from 'react-i18next';
import { FaCheck, FaChevronDown, FaPeopleGroup } from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Select, createListCollection } from '~/components/ui/select';
import { Text } from '~/components/ui/text';
import { fesColor, fesSeriesName } from './fes-style';
import lineupJson from '../../../data/performance-lineups.json';
import type { FesEvent } from '~/hooks/useFesReport';

const hasLineup = (event: FesEvent) =>
  event.days.some((d) => (lineupJson as Record<string, unknown>)[d.performanceId] !== undefined);
const dateRange = (event: FesEvent) =>
  event.tour.startDate === event.tour.endDate
    ? event.tour.startDate
    : `${event.tour.startDate} – ${event.tour.endDate}`;

function Franchises({ event }: { event: FesEvent }) {
  const { t } = useTranslation();
  return (
    <Wrap gap="1.5">
      {event.tour.seriesIds.map((id) => (
        <HStack
          key={id}
          gap="1.5"
          borderColor="border.subtle"
          borderRadius="full"
          borderWidth="1px"
          py="0.5"
          px="2"
          color="fg.muted"
          fontSize="xs"
          bg="bg.default"
        >
          <Box style={{ background: fesColor(id) }} borderRadius="full" w="2" h="2" />
          {fesSeriesName(id, t('fes.others'))}
        </HStack>
      ))}
    </Wrap>
  );
}

/**
 * The selected event as a card (title, dates, venue, franchises) with a dropdown to switch:
 * long festival names do not fit in a row of buttons.
 */
export function FesEventPicker({
  events,
  event,
  onSelect
}: {
  events: FesEvent[];
  event: FesEvent;
  onSelect: (key: string) => void;
}) {
  const { t } = useTranslation();
  const items = events.map((e) => ({ value: e.key, label: e.tour.tourName, event: e }));
  const collection = createListCollection({ items });
  const days = event.days.length;
  const venue = event.tour.legs[0]?.venue;

  return (
    <Box
      borderColor="border.subtle"
      borderLeftWidth="4px"
      borderLeftColor="accent.default"
      borderRadius="l3"
      borderWidth="1px"
      p={{ base: '4', md: '5' }}
      bg="bg.default"
    >
      <Stack gap="3">
        <HStack gap="3" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap">
          <Stack flex="1" gap="1" minW="0">
            <HStack gap="2" color="fg.muted" fontSize="xs">
              <FaPeopleGroup />
              <Text>
                {dateRange(event)} ·{' '}
                {days === 1 ? t('fes.event_day') : t('fes.event_days', { n: days })}
                {venue ? ` · ${venue}` : ''}
              </Text>
              {hasLineup(event) && (
                <Box
                  borderRadius="full"
                  py="0.5"
                  px="2"
                  color="accent.fg"
                  fontSize="2xs"
                  fontWeight="semibold"
                  bg="accent.default"
                >
                  {t('fes.official_lineup')}
                </Box>
              )}
            </HStack>
            <Heading as="h2" fontSize={{ base: 'lg', md: 'xl' }} lineHeight="1.3">
              {event.tour.tourName}
            </Heading>
          </Stack>
          {events.length > 1 && (
            <Select.Root
              collection={collection}
              value={[event.key]}
              onValueChange={(e) => e.value[0] && onSelect(e.value[0])}
              positioning={{ sameWidth: false, placement: 'bottom-end' }}
              w={{ base: 'full', md: '48' }}
            >
              <Select.Label srOnly>{t('fes.pick_event')}</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Text as="span" fontWeight="medium">
                    {t('fes.change_event')}
                  </Text>
                  <Select.Indicator>
                    <FaChevronDown size={11} />
                  </Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner>
                <Select.Content minW="96" maxH="96" p="1" overflowY="auto">
                  {items.map((item) => (
                    <Select.Item
                      key={item.value}
                      item={item}
                      gap="3"
                      alignItems="center"
                      py="2"
                      px="3"
                    >
                      <Stack flex="1" gap="0" minW="0">
                        <Select.ItemText>{item.label}</Select.ItemText>
                        <Text color="fg.muted" fontSize="xs">
                          {dateRange(item.event)} ·{' '}
                          {item.event.days.length === 1
                            ? t('fes.event_day')
                            : t('fes.event_days', { n: item.event.days.length })}{' '}
                          · {t('fes.event_franchises', { n: item.event.tour.seriesIds.length })}
                        </Text>
                      </Stack>
                      <Select.ItemIndicator>
                        <FaCheck size={11} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          )}
        </HStack>
        <Franchises event={event} />
      </Stack>
    </Box>
  );
}
