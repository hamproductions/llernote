import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa6';
import { Box, HStack } from 'styled-system/jsx';
import { Table } from '~/components/ui/table';
import { clickable } from '~/utils/clickable';

export interface DataTableColumnMeta {
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  textAlign?: 'left' | 'center' | 'right';
  width?: string;
}

export function DataTable<T>({
  data,
  columns,
  initialSorting = [],
  sorting: controlledSorting,
  onSortingChange,
  page,
  pageSize,
  minW,
  onRowClick
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  initialSorting?: SortingState;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  page?: number;
  pageSize?: number;
  minW?: string;
  onRowClick?: (row: T) => void;
}) {
  'use no memo';
  const [internalSorting, setInternalSorting] = useState<SortingState>(initialSorting);
  const sorting = controlledSorting ?? internalSorting;
  const paginated = page !== undefined && pageSize !== undefined;
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      ...(paginated && { pagination: { pageIndex: page - 1, pageSize } })
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setInternalSorting(next);
      onSortingChange?.(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginated && { getPaginationRowModel: getPaginationRowModel() })
  });

  return (
    <Box w="full" overflowX="auto">
      <Table.Root size="sm" minW={minW}>
        <Table.Head zIndex="1" position="sticky" top="0" bgColor="bg.default">
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined;
                const sorted = header.column.getIsSorted();
                return (
                  <Table.Header
                    key={header.id}
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                    }
                    hideBelow={meta?.hideBelow}
                    w={meta?.width}
                    textAlign={meta?.textAlign}
                  >
                    {header.column.getCanSort() ? (
                      <HStack
                        {...clickable(
                          header.column.getToggleSortingHandler() as () => void,
                          typeof header.column.columnDef.header === 'string'
                            ? header.column.columnDef.header
                            : undefined
                        )}
                        cursor="pointer"
                        display="inline-flex"
                        gap="1"
                        userSelect="none"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <FaArrowUp size={10} />
                        ) : sorted === 'desc' ? (
                          <FaArrowDown size={10} />
                        ) : (
                          <Box w="2.5" />
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
          {table.getRowModel().rows.map((row, index) => (
            <Table.Row
              key={row.id}
              {...(onRowClick && clickable(() => onRowClick(row.original)))}
              cursor={onRowClick ? 'pointer' : undefined}
              bgColor={index % 2 === 1 ? 'bg.subtle' : undefined}
              _hover={{ bgColor: 'accent.a2' }}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
                return (
                  <Table.Cell key={cell.id} hideBelow={meta?.hideBelow} textAlign={meta?.textAlign}>
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
