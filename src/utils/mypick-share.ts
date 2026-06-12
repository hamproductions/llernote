import { decompressFromEncodedURIComponent } from 'lz-string';
import type { MyPick, MyPickColumn, MyPickRow } from '~/types/attendance';
import { cellKey } from '~/types/attendance';

interface LegacyShareData {
  v: 1 | 2;
  r: [string, string][];
  c: (['s', string] | ['m'] | ['l'] | ['y', number, string])[];
  l: Record<string, string>;
}

const ROW_TYPE_CODES: Record<MyPickRow['type'], string> = {
  series: 's',
  artist: 'a',
  category: 'c'
};
const ROW_TYPE_BY_CODE = Object.fromEntries(
  Object.entries(ROW_TYPE_CODES).map(([type, code]) => [code, type])
) as Record<string, MyPickRow['type']>;
const SLOT_CODES: Record<string, string> = { song: 's', event: 'e', cast: 'c' };
const SLOT_BY_CODE = Object.fromEntries(
  Object.entries(SLOT_CODES).map(([slot, code]) => [code, slot])
);

const encodeRow = (row: MyPickRow) => `${ROW_TYPE_CODES[row.type]}${row.id}`;
const decodeRow = (token: string): MyPickRow | null => {
  const type = ROW_TYPE_BY_CODE[token[0] ?? ''];
  const id = token.slice(1);
  if (!type || !id) return null;
  return { type, id } as MyPickRow;
};

const encodeColumn = (col: MyPickColumn) => {
  if (col.type === 'member') return 'm';
  if (col.type === 'slot') return `s${SLOT_CODES[col.slot] ?? col.slot}`;
  return `y${col.year}${SLOT_CODES[col.slot] ?? col.slot}`;
};
const decodeColumn = (token: string): MyPickColumn | null => {
  if (token === 'm') return { type: 'member' };
  if (token[0] === 's') {
    const slot = SLOT_BY_CODE[token.slice(1)];
    return slot ? ({ type: 'slot', slot } as MyPickColumn) : null;
  }
  if (token[0] === 'y') {
    const year = Number(token.slice(1, -1));
    const slot = SLOT_BY_CODE[token.slice(-1)];
    return Number.isInteger(year) && slot ? ({ type: 'year', year, slot } as MyPickColumn) : null;
  }
  return null;
};

export const encodeMyPick = (myPick: MyPick, rows: MyPickRow[], columns: MyPickColumn[]) => {
  const cells = rows
    .flatMap((row, rowIndex) =>
      columns.map((col, colIndex) => {
        const value = myPick.cells[cellKey(row, col)];
        return value != null ? `${rowIndex}.${colIndex}.${value}` : null;
      })
    )
    .filter(Boolean)
    .join('!');
  return [3, rows.map(encodeRow).join('-'), columns.map(encodeColumn).join('-'), cells].join('~');
};

export const decodeMyPick = (
  encoded: string
): { rows: MyPickRow[]; columns: MyPickColumn[]; myPick: MyPick } | null => {
  if (encoded.startsWith('3~')) {
    const [, rowPart, columnPart, cellPart] = encoded.split('~');
    const rows = (rowPart ?? '')
      .split('-')
      .map(decodeRow)
      .filter((row): row is MyPickRow => row != null);
    const columns = (columnPart ?? '')
      .split('-')
      .map(decodeColumn)
      .filter((column): column is MyPickColumn => column != null);
    if (rows.length === 0 || columns.length === 0) return null;
    const cells: Record<string, string> = {};
    for (const token of (cellPart ?? '').split('!').filter(Boolean)) {
      const [rowIndex, colIndex, ...value] = token.split('.');
      const row = rows[Number(rowIndex)];
      const column = columns[Number(colIndex)];
      if (row && column && value.length) cells[cellKey(row, column)] = value.join('.');
    }
    return { rows, columns, myPick: { cells, updatedAt: '' } };
  }
  try {
    const data = JSON.parse(decompressFromEncodedURIComponent(encoded)) as LegacyShareData;
    if (![1, 2].includes(data.v) || !Array.isArray(data.r) || !Array.isArray(data.c)) return null;
    return {
      rows: data.r.map(([type, id]) => ({ type, id }) as MyPickRow),
      columns: data.c
        .map((col) =>
          col[0] === 'm'
            ? ({ type: 'member' } as MyPickColumn)
            : col[0] === 's'
              ? ({ type: 'slot', slot: col[1] } as MyPickColumn)
              : col[0] === 'y'
                ? ({ type: 'year', year: col[1], slot: col[2] } as MyPickColumn)
                : null
        )
        .filter((column): column is MyPickColumn => column != null),
      myPick: { cells: data.l ?? {}, updatedAt: '' }
    };
  } catch {
    return null;
  }
};

export const myPickShareUrl = (encoded: string) =>
  `${window.location.origin}${window.location.pathname}?d=${encoded}`;
