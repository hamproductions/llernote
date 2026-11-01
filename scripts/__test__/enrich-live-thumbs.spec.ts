import { describe, expect, test } from 'vitest';
import {
  buildThumbEntries,
  diceSimilarity,
  extractNihongoTitle,
  matchJapaneseTitle,
  matchWikiTitle,
  normalizeJapanese,
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
    expect(
      normalizeTitle('ラブライブ！サンシャイン!! Aqours First LoveLive! ～Step! ZERO to ONE!!～')
    ).toBe('aqoursfirstlovelivestepzerotoone');
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
      matchWikiTitle(
        'ラブライブ！サンシャイン!! Aqours 4th LoveLive! ～Sailing to the Sunshine～',
        titles
      )
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
    {
      pageid: 1,
      title: 'Aqours 4th LoveLive! ～Sailing to the Sunshine～',
      imageUrl: 'https://img/4th.jpg'
    },
    { pageid: 2, title: 'HAKODATE UNIT CARNIVAL', imageUrl: 'https://img/hakodate.jpg' },
    {
      pageid: 3,
      title: 'Guilty Kiss 2nd LoveLive! ~Return To Love ♡ Kiss Kiss Kiss~',
      imageUrl: 'https://img/gk2.jpg'
    },
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

describe('normalizeJapanese', () => {
  test('keeps Japanese that normalizeTitle would delete', () => {
    // normalizeTitle reduces this to "3rdlivetour", too short to match anything.
    expect(normalizeJapanese('ラブライブ！蓮ノ空女学院スクールアイドルクラブ 3rd Live Tour')).toBe(
      'ラブライブ蓮ノ空女学院スクールアイドルクラブ3rdlivetour'
    );
  });

  test('folds width, case and the tilde variants wiki titles disagree on', () => {
    expect(normalizeJapanese('Aqours ～Sailing～')).toBe(
      normalizeJapanese('ａｑｏｕｒｓ〜sailing〜')
    );
  });
});

describe('extractNihongoTitle', () => {
  const page = 'Liella! no TUTOLiella!! LIVE 2';
  const wikitext =
    "{{Nihongo|'''Liella! no TUTOLiella!! LIVE 2026'''|Liella!の ちゅーとりえらいぶ!! 2026}} was a live.";

  test('reads the Japanese name out of the lead template', () => {
    expect(extractNihongoTitle(wikitext, page)).toBe('Liella!の ちゅーとりえらいぶ!! 2026');
  });

  test('ignores Nihongo templates that are not the page title', () => {
    // Tracklists use the same template, so a song must not be mistaken for the title.
    const withSong = `{{Nihongo|Aozora Jumping Heart|青空Jumping Heart}} ${wikitext}`;
    expect(extractNihongoTitle(withSong, page)).toBe('Liella!の ちゅーとりえらいぶ!! 2026');
  });

  test('is undefined when the page has no Japanese name', () => {
    expect(extractNihongoTitle('Just prose, no template.', page)).toBeUndefined();
  });
});

describe('matchJapaneseTitle', () => {
  const pages = [
    {
      pageid: 1,
      title: 'Numazu Jimo Ai Festival 2023',
      imageUrl: 'a.jpg',
      japaneseTitle: 'ラブライブ！サンシャイン!! 沼津地元愛まつり 2023'
    },
    {
      pageid: 2,
      title: 'Numazu Jimo Ai Festival 2024',
      imageUrl: 'b.jpg',
      japaneseTitle: 'ラブライブ！サンシャイン!! 沼津地元愛まつり 2024'
    },
    {
      pageid: 3,
      title: 'Uta Gassen',
      imageUrl: 'c.jpg',
      japaneseTitle: '異次元フェス アイドルマスター★♥ラブライブ！歌合戦'
    },
    {
      pageid: 4,
      title: 'Uta Gassen LIVE CD',
      imageUrl: 'd.jpg',
      japaneseTitle: '異次元フェス アイドルマスター★♥ラブライブ！歌合戦'
    }
  ];

  test('matches a Japanese tour name to its page', () => {
    const match = matchJapaneseTitle('ラブライブ！サンシャイン!! 沼津地元愛まつり 2023', pages);
    expect(match?.title).toBe('Numazu Jimo Ai Festival 2023');
  });

  test('does not match an annual event to a different year', () => {
    // The two years differ by four characters out of thirty, so similarity alone
    // would happily pick the wrong one.
    const match = matchJapaneseTitle('ラブライブ！サンシャイン!! 沼津地元愛まつり 2023', [
      pages[1]!
    ]);
    expect(match).toBeUndefined();
  });

  test('prefers the event page over its release on a tie', () => {
    const match = matchJapaneseTitle('異次元フェス アイドルマスター★♥ラブライブ！歌合戦', pages);
    expect(match?.title).toBe('Uta Gassen');
  });

  test('ignores pages with no Japanese title', () => {
    expect(
      matchJapaneseTitle('ラブライブ！沼津地元愛まつり 2023', [{ pageid: 9, title: 'x' }])
    ).toBeUndefined();
  });
});
