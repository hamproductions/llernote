import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { MyPick, MyPickColumn, MyPickRow } from '~/types/attendance';

interface ShareData {
  v: 1 | 2;
  r: [string, string][];
  c: (['s', string] | ['m'] | ['l'] | ['y', number, string])[];
  l: Record<string, string>;
}

export const encodeMyPick = (myPick: MyPick, rows: MyPickRow[], columns: MyPickColumn[]) => {
  const data: ShareData = {
    v: 2,
    r: rows.map((row) => [row.type, row.id]),
    c: columns.map((col) => {
      if (col.type === 'member') return ['m'];
      if (col.type === 'slot') return ['s', col.slot];
      return ['y', col.year, col.slot];
    }),
    l: Object.fromEntries(Object.entries(myPick.cells).filter(([, v]) => v != null)) as Record<
      string,
      string
    >
  };
  return compressToEncodedURIComponent(JSON.stringify(data));
};

export const decodeMyPick = (
  encoded: string
): { rows: MyPickRow[]; columns: MyPickColumn[]; myPick: MyPick } | null => {
  try {
    const data = JSON.parse(decompressFromEncodedURIComponent(encoded)) as ShareData;
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
