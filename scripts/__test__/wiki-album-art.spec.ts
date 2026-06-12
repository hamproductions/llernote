import { describe, expect, it } from 'vitest';
import {
  extractImageFiles,
  findAlbumArtFile,
  matchSongsToWikiPages,
  normalizeWikiTitle
} from '../wiki-album-art';

describe('wiki album art helpers', () => {
  it('extracts image files from wiki markup without audio assets', () => {
    expect(
      extractImageFiles(`
        | image = Bokura_no_LIVE_Kimi_to_no_LIFE_cover.jpg
        [[File:Yuujou_No_Change.ogg]]
        [[File:Snow halation cover.png|thumb]]
        [[File:Logo.svg]]
      `)
    ).toEqual(['Bokura_no_LIVE_Kimi_to_no_LIFE_cover.jpg', 'Snow halation cover.png']);
  });

  it('prefers likely cover artwork over icons and logos', () => {
    expect(
      findAlbumArtFile([
        'Nijigasaki icon.png',
        'Mogyutto love de Sekkin Chuu! cover.jpg',
        'Mogyutto love de Sekkin Chuu! sample.ogg'
      ])
    ).toBe('Mogyutto love de Sekkin Chuu! cover.jpg');
  });

  it('matches local songs to wiki pages through normalized english names', () => {
    const matches = matchSongsToWikiPages(
      [
        { id: '1', name: '僕らのLIVE 君とのLIFE', englishName: 'Bokura no LIVE Kimi to no LIFE' },
        { id: '2', name: '友情ノーチェンジ', englishName: 'Yuujou No Change' }
      ],
      [
        {
          pageid: 10,
          title: 'Bokura no LIVE Kimi to no LIFE',
          imageUrl:
            'https://static.wikia.nocookie.net/love-live/images/2/24/Bokura_no_LIVE_Kimi_to_no_LIFE_-_cover.jpg/revision/latest'
        },
        {
          pageid: 11,
          title: 'Yuujou No Change (single)',
          imageUrl:
            'https://static.wikia.nocookie.net/love-live/images/5/57/Yuujou_No_Change_cover.jpg/revision/latest'
        }
      ]
    );

    expect(matches).toEqual([
      {
        songId: '1',
        pageid: 10,
        title: 'Bokura no LIVE Kimi to no LIFE',
        imageUrl:
          'https://static.wikia.nocookie.net/love-live/images/2/24/Bokura_no_LIVE_Kimi_to_no_LIFE_-_cover.jpg/revision/latest'
      },
      {
        songId: '2',
        pageid: 11,
        title: 'Yuujou No Change (single)',
        imageUrl:
          'https://static.wikia.nocookie.net/love-live/images/5/57/Yuujou_No_Change_cover.jpg/revision/latest'
      }
    ]);
  });

  it('normalizes wiki title punctuation and parenthetical suffixes', () => {
    expect(normalizeWikiTitle('Yuujou No Change (single)')).toBe('yuujounochange');
    expect(normalizeWikiTitle('sweet&sweet holiday')).toBe('sweetsweetholiday');
  });
});
