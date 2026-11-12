import type { Setlist, Song } from '~/types';

export interface BingoCard {
  v: 1;
  performanceId: string;
  freeIndex: number | null;
  cells: (string | null)[];
}

export const emptyBingo = (): BingoCard => ({
  v: 1,
  performanceId: '',
  freeIndex: 12,
  cells: Array.from({ length: 25 }, () => null)
});

export const parseBingo = (value: unknown): BingoCard | null => {
  if (!value || typeof value !== 'object') return null;
  const card = value as BingoCard;
  const freeIndex = card.freeIndex === undefined ? 12 : card.freeIndex;
  if (
    card.v !== 1 ||
    typeof card.performanceId !== 'string' ||
    card.performanceId.length > 100 ||
    !Array.isArray(card.cells) ||
    ![9, 16, 25].includes(card.cells.length) ||
    (freeIndex !== null &&
      (!Number.isInteger(freeIndex) ||
        freeIndex < 0 ||
        freeIndex >= card.cells.length ||
        card.cells.length % 2 === 0 ||
        freeIndex !== Math.floor(card.cells.length / 2) ||
        card.cells[freeIndex] !== null)) ||
    card.cells.some((id) => id !== null && (typeof id !== 'string' || !id || id.length > 100))
  )
    return null;
  const ids = card.cells.filter((id) => id !== null);
  if (new Set(ids).size !== ids.length) return null;
  return { v: 1, performanceId: card.performanceId, freeIndex, cells: [...card.cells] };
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const FREE = 4095;

const toChars = (value: number, width: number) =>
  Array.from(
    { length: width },
    (_, index) => ALPHABET[Math.floor(value / 64 ** (width - 1 - index)) % 64]
  ).join('');

const fromChars = (chars: string) =>
  [...chars].reduce((total, char) => total * 64 + ALPHABET.indexOf(char), 0);

export const encodeBingo = (card: BingoCard) => {
  const performance = Math.abs(Number(card.performanceId) || 0);
  return (
    toChars(performance * 2 + (card.performanceId.startsWith('-') ? 1 : 0), 3) +
    card.cells
      .map((id, index) => toChars(index === card.freeIndex ? FREE : Number(id ?? 0), 2))
      .join('')
  );
};

const decodeLegacy = (encoded: string) => {
  if (encoded.length > 512 || !/^-?\d+(?:\.(?:\d+|-1)){9,25}$/.test(encoded)) return null;
  const values = encoded.split('.').map(Number);
  if (values.some((value) => !Number.isSafeInteger(value) || Math.abs(value) > 2147483647))
    return null;
  const [performance, ...cells] = values;
  return { performance: performance ? String(performance) : '', cells };
};

const decodeCompact = (encoded: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded) || ![21, 35, 53].includes(encoded.length)) return null;
  const performance = fromChars(encoded.slice(0, 3));
  const id = Math.floor(performance / 2);
  const cells = Array.from({ length: (encoded.length - 3) / 2 }, (_, index) => {
    const value = fromChars(encoded.slice(3 + index * 2, 5 + index * 2));
    return value === FREE ? -1 : value;
  });
  return { performance: id ? `${performance % 2 ? '-' : ''}${id}` : '', cells };
};

export const decodeBingo = (encoded: string): BingoCard | null => {
  const decoded = encoded.includes('.') ? decodeLegacy(encoded) : decodeCompact(encoded);
  if (!decoded) return null;
  const { performance, cells } = decoded;
  if (cells.filter((value) => value === -1).length > 1) return null;
  const freeIndex = cells.indexOf(-1);
  return parseBingo({
    v: 1,
    performanceId: performance,
    freeIndex: freeIndex < 0 ? null : freeIndex,
    cells: cells.map((value) => (value > 0 ? String(value) : null))
  });
};

const normalizeTitle = (value: string) =>
  value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');

export const scoreBingo = (card: BingoCard, setlist: Setlist | undefined, songs: Song[]) => {
  const played = new Set<string>();
  let unresolved = 0;
  const byTitle = new Map<string, string[]>();
  const knownIds = new Set(songs.map((song) => song.id));
  for (const song of songs) {
    const key = normalizeTitle(song.name);
    byTitle.set(key, [...(byTitle.get(key) ?? []), song.id]);
  }
  if (setlist?.isActual) {
    for (const item of setlist.items) {
      if (item.type !== 'song') continue;
      if (item.songId && knownIds.has(item.songId)) {
        played.add(item.songId);
      } else {
        const matches = byTitle.get(normalizeTitle(item.customSongName ?? item.title ?? ''));
        if (matches?.length === 1) played.add(matches[0]);
        else unresolved++;
      }
    }
  }
  const marked = card.cells.map(
    (id, index) => index === card.freeIndex || (id !== null && played.has(id))
  );
  const size = Math.sqrt(card.cells.length);
  const lines = [
    ...Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, col) => row * size + col)
    ),
    ...Array.from({ length: size }, (_, col) =>
      Array.from({ length: size }, (_, row) => row * size + col)
    ),
    Array.from({ length: size }, (_, index) => index * (size + 1)),
    Array.from({ length: size }, (_, index) => (index + 1) * (size - 1))
  ].filter((line) => line.every((index) => marked[index]));
  return {
    available: Boolean(setlist?.isActual),
    marked,
    hits: marked.filter((hit, index) => hit && index !== card.freeIndex).length,
    lines: lines.length,
    winningCells: new Set(lines.flat()),
    unresolved
  };
};
