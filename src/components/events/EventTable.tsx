import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaListUl } from 'react-icons/fa6';
import { HStack } from 'styled-system/jsx';
import { Table } from '~/components/ui/table';
import { IconButton } from '~/components/ui/icon-button';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { SeriesBadge } from './SeriesBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { isFutureEvent } from '~/utils/event-filter';
import { eventernoteSearchUrl } from '~/utils/share';
import type { Performance } from '~/types';

export function EventTable({
  performances,
  onSelect
}: {
  performances: Performance[];
  onSelect: (p: Performance) => void;
}) {
  const { t } = useTranslation();

  return (
    <Table.Root size="sm">
      <Table.Head>
        <Table.Row>
          <Table.Header w="28">{t('events.date')}</Table.Header>
          <Table.Header>{t('events.title')}</Table.Header>
          <Table.Header hideBelow="md">{t('events.venue')}</Table.Header>
          <Table.Header hideBelow="lg">{t('events.series')}</Table.Header>
          <Table.Header textAlign="right">{t('events.attendance_filter')}</Table.Header>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {performances.map((p) => (
          <Table.Row key={p.id} onClick={() => onSelect(p)} cursor="pointer">
            <Table.Cell color="fg.muted" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
              {p.date}
            </Table.Cell>
            <Table.Cell maxW="md">
              <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                {p.tourName}
              </Text>
            </Table.Cell>
            <Table.Cell hideBelow="md" maxW="48">
              <Text color="fg.muted" fontSize="sm" lineClamp={1}>
                {p.venue}
              </Text>
            </Table.Cell>
            <Table.Cell hideBelow="lg">
              <HStack gap="1">
                {p.seriesIds.map((id) => (
                  <SeriesBadge key={id} seriesId={id} />
                ))}
              </HStack>
            </Table.Cell>
            <Table.Cell>
              <HStack onClick={(e) => e.stopPropagation()} gap="1" justifyContent="flex-end">
                <AttendanceButtons performanceId={p.id} future={isFutureEvent(p)} />
                {p.hasSetlist && (
                  <IconButton
                    aria-label={t('events.setlist')}
                    title={t('events.setlist')}
                    variant="ghost"
                    size="xs"
                    onClick={() => onSelect(p)}
                  >
                    <FaListUl />
                  </IconButton>
                )}
                <Link href={eventernoteSearchUrl(p)} target="_blank">
                  <IconButton
                    aria-label={t('share.eventernote')}
                    title={t('share.eventernote')}
                    variant="ghost"
                    size="xs"
                  >
                    <FaArrowUpRightFromSquare />
                  </IconButton>
                </Link>
              </HStack>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
