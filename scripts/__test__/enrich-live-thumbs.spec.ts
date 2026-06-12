import { describe, expect, test } from 'vitest';
import {
  buildThumbEntries,
  diceSimilarity,
  matchWikiTitle,
  normalizeTitle
} from '../enrich-live-thumbs';

describe('normalizeTitle', () => {
  test('strips punctuation, fullwidth marks and non-ascii decoration', () => {
    expect(normalizeTitle('Aqours 4th LoveLive! ～Sailing to the Sunshine～')).toBe(
      'aqours4thlovelivesailingtothesunshine'
    );
    expect(normalizeTitle('Aqours 4th Love Live! ~Sailing to the Sunshine~')).toBe(
      'aqours4thlovelivesailingtothesunshine'
    );
  });

  test('drops Japanese series prefixes via ascii projection', () => {
    expect(normalizeTitle('ラブライブ！サンシャイン!! Aqours First LoveLive! ～Step! ZERO to ONE!!～')).toBe(
      'aqoursfirstlovelivestepzerotoone'
    );
  });

  test('maps μ to muse', () => {
    expect(normalizeTitle("μ's Fan Meeting Tour 2015")).toBe('musesfanmeetingtour2015');
  });
});

describe('diceSimilarity', () => {
  test('returns 1 for identical strings and 0 for disjoint strings', () => {
    expect(diceSimilarity('lovelive', 'lovelive')).toBe(1);
    expect(diceSimilarity('abcd', 'wxyz')).toBe(0);
  });

  test('scores near-identical strings highly', () => {
    expect(
      diceSimilarity('musesfinallovelivemusesicforever', 'musesfinallovelivemusicforever')
    ).toBeGreaterThan(0.9);
  });
});

describe('matchWikiTitle', () => {
  const titles = [
    'Aqours 4th LoveLive! ～Sailing to the Sunshine～',
    'Aqours First Love Live! ~Step! ZERO to ONE~',
    'Animelo Summer Live',
    'HAKODATE UNIT CARNIVAL',
    "Muse's Final LoveLive! Mu'sic Forever",
    'Liella! no TUTOLiella!! LIVE',
    'Liella! no TUTOLiella!! LIVE 2'
  ];

  test('accepts exact normalized matches ignoring the Japanese series prefix', () => {
    expect(
      matchWikiTitle('ラブライブ！サンシャイン!! Aqours 4th LoveLive! ～Sailing to the Sunshine～', titles)
    ).toMatchObject({ title: 'Aqours 4th LoveLive! ～Sailing to the Sunshine～', method: 'exact' });
  });

  test('accepts containment matches without year drift', () => {
    expect(
      matchWikiTitle('Saint Snow PRESENTS LOVELIVE! SUNSHINE!! HAKODATE UNIT CARNIVAL', titles)
    ).toMatchObject({ title: 'HAKODATE UNIT CARNIVAL', method: 'contain', confidence: 0.88 });
  });

  test('rejects containment when the tour carries a year the wiki page lacks', () => {
    expect(matchWikiTitle('Animelo Summer Live 2017 -THE CARD-', titles)).toBeUndefined();
  });

  test('accepts high-similarity romanization variants', () => {
    expect(
      matchWikiTitle("ラブライブ！μ's Final LoveLive!〜μ'sic Forever♪♪♪♪♪♪♪♪♪〜", titles)
    ).toMatchObject({ title: "Muse's Final LoveLive! Mu'sic Forever", method: 'similar' });
  });

  test('rejects unrelated and too-short names', () => {
    expect(matchWikiTitle('NAOMIの部屋', titles)).toBeUndefined();
    expect(matchWikiTitle('沼津地元愛まつり2023', titles)).toBeUndefined();
  });

  test('keeps numbered sequels separate', () => {
    expect(matchWikiTitle('Liella!のTUTOLiella!! LIVE 2', titles)).toMatchObject({
      title: 'Liella! no TUTOLiella!! LIVE 2',
      method: 'exact'
    });
  });
});

describe('buildThumbEntries', () => {
  const pages = [
    { pageid: 1, title: 'Aqours 4th LoveLive! ～Sailing to the Sunshine～', imageUrl: 'https://img/4th.jpg' },
    { pageid: 2, title: 'HAKODATE UNIT CARNIVAL', imageUrl: 'https://img/hakodate.jpg' },
    { pageid: 3, title: 'Guilty Kiss 2nd LoveLive! ~Return To Love ♡ Kiss Kiss Kiss~', imageUrl: 'https://img/gk2.jpg' },
    { pageid: 4, title: 'Love Live! Fest' }
  ];

  test('emits tour-scoped entries keyed with an explicit marker', () => {
    const { entries, stats } = buildThumbEntries(
      [
        {
          id: '10',
          tourName: 'ラブライブ！サンシャイン!! Aqours 4th LoveLive! ～Sailing to the Sunshine～'
        },
        {
          id: '11',
          tourName: 'ラブライブ！サンシャイン!! Aqours 4th LoveLive! ～Sailing to the Sunshine～'
        }
      ],
      pages
    );
    expect(entries).toEqual({
      'tour:ラブライブ！サンシャイン!! Aqours 4th LoveLive! ～Sailing to the Sunshine～': {
        scope: 'tour',
        image: 'https://img/4th.jpg',
        source: 'Aqours 4th LoveLive! ～Sailing to the Sunshine～',
        confidence: 0.95
      }
    });
    expect(stats).toMatchObject({ tours: 1, tourMatched: 1, performanceMatched: 0 });
  });

  test('emits performance-scoped entries when the concert leg has its own page', () => {
    const { entries } = buildThumbEntries(
      [
        {
          id: '20',
          tourName: 'ラブライブ！サンシャイン!! ユニットライブツアー',
          concertName: 'Guilty Kiss 2nd LoveLive! ～Return To Love ♡ Kiss Kiss Kiss～'
        },
        { id: '21', tourName: 'ラブライブ！サンシャイン!! ユニットライブツアー' }
      ],
      pages
    );
    expect(entries['20']).toMatchObject({ scope: 'performance', image: 'https://img/gk2.jpg' });
    expect(entries['21']).toBeUndefined();
    expect(entries['tour:ラブライブ！サンシャイン!! ユニットライブツアー']).toBeUndefined();
  });

  test('ignores pages without an image', () => {
    const { entries } = buildThumbEntries([{ id: '30', tourName: 'Love Live! Fest' }], pages);
    expect(entries).toEqual({});
  });
});
