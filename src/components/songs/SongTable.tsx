import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import { Box, HStack } from 'styled-system/jsx';
import { Table } from '~/components/ui/table';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { SongThumb } from './SongThumb';
import { useArtistById } from '~/hooks/useData';
import { localizedName } from '~/utils/names';
import { clickable } from '~/utils/clickable';
import { hasSongThumb } from '~/utils/song-thumbs';
import type { Song } from '~/types';

interface ColumnMeta {
  w?: string;
  minW?: string;
  maxW?: string;
  hideBelow?: 'md' | 'lg';
  textAlign?: 'right';
}

export function SongTable({
  songs,
  page,
  pageSize,
  heardCount,
  performedCount,
  onSelect
}: {
  songs: Song[];
  page: number;
  pageSize: number;
  heardCount: (songId: string) => number;
  performedCount: (songId: string) => number;
  onSelect: (song: Song) => void;
}) {
  const { t, i18n } = useTranslation();
  const artistById = useArtistById();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'performed', desc: true }]);

  const artistNames = (song: Song) =>
    [
      ...new Set(
        (song.artists ?? [])
          .map((a) => artistById.get(a.id))
          .filter(Boolean)
          .map((a) => localizedName(i18n.language, a!.name, a!.englishName))
      )
    ].join('・');

  const columns = useMemo<ColumnDef<Song>[]>(
    () => [
      {
        id: 'thumb',
        header: '',
        enableSorting: false,
        meta: { w: '12' } satisfies ColumnMeta,
        cell: ({ row }) =>
          hasSongThumb(row.original.id) && (
            <SongThumb songId={row.original.id} dim={heardCount(row.original.id) === 0} />
          )
      },
      {
        id: 'name',
        header: t('songs.song'),
        accessorFn: (song) => song.phoneticName ?? song.name,
        sortingFn: (a, b) =>
          (a.original.phoneticName ?? a.original.name).localeCompare(
            b.original.phoneticName ?? b.original.name,
            'ja'
          ),
        sortDescFirst: false,
        meta: { minW: '48' } satisfies ColumnMeta,
        cell: ({ row }) => (
          <Text
            color={heardCount(row.original.id) > 0 ? 'fg.default' : 'fg.muted'}
            fontSize="sm"
            fontWeight="medium"
          >
            {localizedName(i18n.language, row.original.name, row.original.englishName)}
          </Text>
        )
      },
      {
        id: 'cast',
        header: t('events.cast'),
        enableSorting: false,
        meta: { maxW: '56' } satisfies ColumnMeta,
        cell: ({ row }) => (
          <Text color="fg.muted" fontSize="xs" lineClamp={2}>
            {artistNames(row.original)}
          </Text>
        )
      },
      {
        id: 'series',
        header: t('events.series'),
        enableSorting: false,
        meta: { hideBelow: 'lg' } satisfies ColumnMeta,
        cell: ({ row }) => (
          <HStack gap="1">
            {row.original.seriesIds.slice(0, 2).map((id) => (
              <SeriesBadge key={id} seriesId={String(id)} />
            ))}
          </HStack>
        )
      },
      {
        id: 'release',
        header: t('songs.release'),
        accessorFn: (song) => song.releasedOn ?? '',
        sortDescFirst: true,
        meta: { w: '28', hideBelow: 'md' } satisfies ColumnMeta,
        cell: ({ row }) => (
          <Text color="fg.muted" fontSize="sm" fontVariantNumeric="tabular-nums">
            {row.original.releasedOn ?? '—'}
          </Text>
        )
      },
      {
        id: 'performed',
        header: t('songs.performed'),
        accessorFn: (song) => performedCount(song.id),
        sortDescFirst: true,
        meta: { w: '24', textAlign: 'right' } satisfies ColumnMeta,
        cell: ({ row }) => (
          <Text color="fg.muted" fontSize="sm" fontVariantNumeric="tabular-nums">
            {performedCount(row.original.id)}
          </Text>
        )
      },
      {
        id: 'heard',
        header: t('songs.heard'),
        accessorFn: (song) => heardCount(song.id),
        sortDescFirst: true,
        meta: { w: '24', textAlign: 'right' } satisfies ColumnMeta,
        cell: ({ row }) => {
          const count = heardCount(row.original.id);
          return count > 0 ? (
            <Badge size="sm" variant="solid">
              {t('songs.times', { count })}
            </Badge>
          ) : (
            <Text color="fg.subtle" fontSize="xs">
              {t('songs.unheard')}
            </Text>
          );
        }
      }
    ],
    [t, i18n.language, artistById, heardCount, performedCount]
  );

  const table = useReactTable({
    data: songs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false
  });

  const rows = table.getRowModel().rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Box w="full" overflowX="auto">
      <Table.Root size="sm">
        <Table.Head zIndex="1" position="sticky" top="0" bgColor="bg.default">
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = (header.column.columnDef.meta ?? {}) as ColumnMeta;
                const sorted = header.column.getIsSorted();
                return (
                  <Table.Header
                    key={header.id}
                    aria-sort={
                      header.column.getCanSort()
                        ? sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    hideBelow={meta.hideBelow}
                    w={meta.w}
                    minW={meta.minW}
                    maxW={meta.maxW}
                    textAlign={meta.textAlign}
                  >
                    {header.column.getCanSort() ? (
                      <HStack
                        role="button"
                        tabIndex={0}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            header.column.getToggleSortingHandler()?.(e);
                          }
                        }}
                        cursor="pointer"
                        gap="1"
                        justifyContent={meta.textAlign === 'right' ? 'flex-end' : undefined}
                        userSelect="none"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <FaSortUp size={10} />
                        ) : sorted === 'desc' ? (
                          <FaSortDown size={10} />
                        ) : (
                          <Box color="fg.subtle">
                            <FaSort size={10} />
                          </Box>
                        )}
                      </HStack>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </Table.Header>
                );
              })}
            </Table.Row>
          ))}
        </Table.Head>
        <Table.Body>
          {rows.map((row, i) => (
            <Table.Row
              key={row.original.id}
              {...clickable(() => onSelect(row.original))}
              cursor="pointer"
              bgColor={i % 2 === 1 ? 'bg.subtle' : undefined}
              _hover={{ bgColor: 'accent.a2' }}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = (cell.column.columnDef.meta ?? {}) as ColumnMeta;
                return (
                  <Table.Cell
                    key={cell.id}
                    hideBelow={meta.hideBelow}
                    w={meta.w}
                    minW={meta.minW}
                    maxW={meta.maxW}
                    textAlign={meta.textAlign}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
