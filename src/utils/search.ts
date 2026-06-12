import { toHiragana, toRomaji } from 'wanakana';

export interface SearchableItem {
  id: string | number;
  name: string;
  englishName?: string;
  phoneticName?: string;
}

const stripPunctuation = (value: string) =>
  value
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const compact = (value: string) => stripPunctuation(value).replace(/\s+/g, '');

export function getLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }

  return matrix[b.length][a.length];
}

const maxDistanceForLength = (length: number) => {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  if (length <= 8) return 2;
  return 3;
};

const searchTerms = (item: SearchableItem, query: string) => {
  const q = query.toLowerCase();
  const queryHiragana = toHiragana(q, { passRomaji: false });
  const queryRomaji = toRomaji(queryHiragana);
  const normalizedQueryRomaji = queryRomaji.replace(/\s+/g, '');
  const phoneticName = item.phoneticName ?? '';
  const phoneticRomaji = toRomaji(phoneticName);

  return {
    q,
    queryHiragana,
    normalizedQueryRomaji,
    itemName: item.name.toLowerCase(),
    englishName: (item.englishName ?? '').toLowerCase(),
    phoneticName,
    normalizedPhoneticRomaji: phoneticRomaji.replace(/\s+/g, '')
  };
};

export function fuzzySearch(item: SearchableItem, query: string): boolean {
  if (!query.trim()) return true;

  const {
    q,
    queryHiragana,
    normalizedQueryRomaji,
    itemName,
    englishName,
    phoneticName,
    normalizedPhoneticRomaji
  } = searchTerms(item, query);
  const strippedQ = stripPunctuation(q);
  const strippedItemName = stripPunctuation(itemName);
  const strippedEnglishName = stripPunctuation(englishName);
  const compactQ = compact(q);
  const compactItemName = compact(itemName);
  const compactEnglishName = compact(englishName);

  if (
    itemName.includes(q) ||
    strippedItemName.includes(strippedQ) ||
    compactItemName.includes(compactQ) ||
    phoneticName.includes(queryHiragana) ||
    normalizedPhoneticRomaji.includes(normalizedQueryRomaji) ||
    englishName.includes(q) ||
    strippedEnglishName.includes(strippedQ) ||
    compactEnglishName.includes(compactQ)
  ) {
    return true;
  }

  if (
    englishName &&
    getLevenshteinDistance(englishName, q) <= maxDistanceForLength(englishName.length)
  ) {
    return true;
  }

  if (
    normalizedPhoneticRomaji &&
    getLevenshteinDistance(normalizedPhoneticRomaji, normalizedQueryRomaji) <=
      maxDistanceForLength(normalizedPhoneticRomaji.length)
  ) {
    return true;
  }

  return (
    Boolean(phoneticName) &&
    getLevenshteinDistance(phoneticName, queryHiragana) <= maxDistanceForLength(phoneticName.length)
  );
}

export function getSearchScore(item: SearchableItem, query: string): number {
  if (!query.trim()) return 0;

  const {
    q,
    queryHiragana,
    normalizedQueryRomaji,
    itemName,
    englishName,
    phoneticName,
    normalizedPhoneticRomaji
  } = searchTerms(item, query);
  const strippedQ = stripPunctuation(q);
  const strippedItemName = stripPunctuation(itemName);
  const strippedEnglishName = stripPunctuation(englishName);
  const compactQ = compact(q);
  const compactItemName = compact(itemName);
  const compactEnglishName = compact(englishName);

  if (itemName === q || strippedItemName === strippedQ) return 100;
  if (englishName === q || strippedEnglishName === strippedQ) return 95;
  if (compactItemName === compactQ) return 94;
  if (compactEnglishName === compactQ) return 93;
  if (itemName.startsWith(q) || strippedItemName.startsWith(strippedQ)) return 90;
  if (englishName.startsWith(q) || strippedEnglishName.startsWith(strippedQ)) return 85;
  if (compactItemName.startsWith(compactQ)) return 84;
  if (compactEnglishName.startsWith(compactQ)) return 83;
  if (itemName.includes(q) || strippedItemName.includes(strippedQ)) return 80;
  if (englishName.includes(q) || strippedEnglishName.includes(strippedQ)) return 75;
  if (compactItemName.includes(compactQ)) return 74;
  if (compactEnglishName.includes(compactQ)) return 73;
  if (phoneticName === queryHiragana || normalizedPhoneticRomaji === normalizedQueryRomaji) {
    return 70;
  }
  if (
    phoneticName.startsWith(queryHiragana) ||
    normalizedPhoneticRomaji.startsWith(normalizedQueryRomaji)
  ) {
    return 65;
  }
  if (
    phoneticName.includes(queryHiragana) ||
    normalizedPhoneticRomaji.includes(normalizedQueryRomaji)
  ) {
    return 60;
  }

  if (englishName) {
    const distance = getLevenshteinDistance(englishName, q);
    if (distance <= maxDistanceForLength(englishName.length)) return 50 - distance;
  }

  if (normalizedPhoneticRomaji) {
    const distance = getLevenshteinDistance(normalizedPhoneticRomaji, normalizedQueryRomaji);
    if (distance <= maxDistanceForLength(normalizedPhoneticRomaji.length)) return 50 - distance;
  }

  if (phoneticName) {
    const distance = getLevenshteinDistance(phoneticName, queryHiragana);
    if (distance <= maxDistanceForLength(phoneticName.length)) return 50 - distance;
  }

  return 0;
}
