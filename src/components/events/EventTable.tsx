import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowDown, FaArrowUp, FaArrowUpRightFromSquare, FaListUl } from 'react-icons/fa6';
import { Box, HStack } from 'styled-system/jsx';
import { Table } from '~/components/ui/table';
import { IconButton } from '~/components/ui/icon-button';
import { Text } from '~/components/ui/text';
import { SeriesBadge } from './SeriesBadge';
import { AttendanceButtons } from './AttendanceButtons';
import { legLabel } from './TourCard';
import { isFutureEvent } from '~/utils/event-filter';
import { eventernoteSearchUrl } from '~/utils/share';
import { clickable } from '~/utils/clickable';
import type { Performance } from '~/types';

export function EventTable({
  performances,
  page,
  pageSize,
  onSelect
}: {
  performances: Performance[];
  page: number;
  pageSize: number;
  onSelect: (p: Performance) => void;
}) {
  const { t } = useTranslation();
  const [asc, setAsc] = useState(false);

  const rows = [...performances]
    .sort((a, b) => (asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
    .slice((page - 1) * pageSize, page * pageSize);

  return (
    <Box w="full" overflowX="auto">
      <Table.Root size="sm">
        <Table.Head zIndex="1" position="sticky" top="0" bgColor="bg.default">
          <Table.Row>
            <Table.Header w="28">
              <HStack
                onClick={() => setAsc((v) => !v)}
                aria-sort={asc ? 'ascending' : 'descending'}
                cursor="pointer"
                gap="1"
              >
                {t('events.date')}
                {asc ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
              </HStack>
            </Table.Header>
            <Table.Header>{t('events.title')}</Table.Header>
            <Table.Header hideBelow="lg" w="40">
              {t('events.leg')}
            </Table.Header>
            <Table.Header hideBelow="md" maxW="48">
              {t('events.venue')}
            </Table.Header>
            <Table.Header hideBelow="xl">{t('events.series')}</Table.Header>
            <Table.Header textAlign="right">{t('events.attendance_filter')}</Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((p, i) => (
            <Table.Row
              key={p.id}
              {...clickable(() => onSelect(p))}
              cursor="pointer"
              bgColor={i % 2 === 1 ? 'bg.subtle' : undefined}
              _hover={{ bgColor: 'accent.a2' }}
            >
              <Table.Cell color="fg.muted" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                {p.date}
              </Table.Cell>
              <Table.Cell maxW="md">
                <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                  {p.tourName}
                </Text>
              </Table.Cell>
              <Table.Cell hideBelow="lg">
                <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                  {legLabel(p)}
                </Text>
              </Table.Cell>
              <Table.Cell hideBelow="md" maxW="48">
                <Text color="fg.muted" fontSize="sm" lineClamp={1}>
                  {p.venue}
                </Text>
              </Table.Cell>
              <Table.Cell hideBelow="xl">
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
                  <IconButton
                    asChild
                    aria-label={t('share.eventernote')}
                    title={t('share.eventernote')}
                    variant="ghost"
                    size="xs"
                  >
                    <a href={eventernoteSearchUrl(p)} target="_blank" rel="noreferrer">
                      <FaArrowUpRightFromSquare />
                    </a>
                  </IconButton>
                </HStack>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
