import { describe, expect, test } from 'vitest';
import {
  buildVenueQueries,
  scoreNominatimCandidate,
  scoreWikidataCandidate
} from '../enrich-venues';

describe('buildVenueQueries', () => {
  test('keeps the original name and adds cleaned aliases', () => {
    expect(
      buildVenueQueries('京王アリーナTOKYO（旧：武蔵野の森総合スポーツプラザ）・メインアリーナ')
    ).toEqual([
      '京王アリーナTOKYO（旧：武蔵野の森総合スポーツプラザ）・メインアリーナ',
      '京王アリーナTOKYO・メインアリーナ',
      '京王アリーナ東京（旧：武蔵野の森総合スポーツプラザ）・メインアリーナ',
      '京王アリーナTOKYO',
      'メインアリーナ'
    ]);
  });

  test('extracts latin parenthetical aliases without dropping the source name', () => {
    expect(buildVenueQueries('上海新国际博览中心 (SNIEC)')).toEqual([
      '上海新国际博览中心 (SNIEC)',
      '上海新国际博览中心',
      'SNIEC'
    ]);
  });

  test('adds parent venue queries for hall and mall subspaces', () => {
    expect(buildVenueQueries('沼津市民文化センター 大ホール')).toEqual([
      '沼津市民文化センター 大ホール',
      '沼津市民文化センター'
    ]);
    expect(buildVenueQueries('三井ショッピングパーク ららぽーと福岡1Fオーバルパーク')).toEqual([
      '三井ショッピングパーク ららぽーと福岡1Fオーバルパーク',
      '三井ショッピングパーク ららぽーと福岡'
    ]);
  });

  test('adds the OSM query spelling for Osaka-Jo Hall', () => {
    expect(buildVenueQueries('大阪城ホール')).toEqual(['大阪城ホール', '大阪城 ホール']);
  });

  test('adds romanized place OSM query spellings', () => {
    expect(buildVenueQueries('Zepp Namba')).toEqual([
      'Zepp Namba',
      'Zepp 難波',
      'Zepp難波',
      'Zepp なんば',
      'Zeppなんば',
      'Zepp なんば大阪',
      'Zeppなんば大阪'
    ]);
  });

  test('adds compact Latin OSM query spellings', () => {
    expect(buildVenueQueries('Zepp Osaka Bayside')).toContain('Zepp OsakaBayside');
  });
});

describe('scoreWikidataCandidate', () => {
  test('accepts exact label matches as high confidence', () => {
    expect(
      scoreWikidataCandidate('東京ガーデンシアター', {
        item: 'http://www.wikidata.org/entity/Q85833146',
        itemLabel: '東京ガーデンシアター',
        aliases: '',
        coord: 'Point(139.7934 35.6297)',
        address: '東京都江東区有明2丁目1-6'
      })
    ).toMatchObject({ confidence: 0.96, reviewRequired: false });
  });

  test('requires review for weak non-exact matches', () => {
    expect(
      scoreWikidataCandidate('東京ガーデンシアター', {
        item: 'http://www.wikidata.org/entity/Q1',
        itemLabel: '東京',
        aliases: '',
        coord: 'Point(139 35)'
      })
    ).toMatchObject({ reviewRequired: true });
  });
});

describe('scoreNominatimCandidate', () => {
  test('accepts exact display name prefix matches with address data', () => {
    expect(
      scoreNominatimCandidate('ぴあアリーナMM', {
        osm_type: 'way',
        osm_id: 123,
        display_name: 'ぴあアリーナMM, みなとみらい, 横浜市, 神奈川県, 日本',
        lat: '35.457',
        lon: '139.631',
        address: {
          city: '横浜市',
          province: '神奈川県',
          country: '日本'
        }
      })
    ).toMatchObject({ confidence: 0.98, reviewRequired: false });
  });

  test('extracts Japanese prefecture from OSM ISO admin code', () => {
    expect(
      scoreNominatimCandidate('東京ガーデンシアター', {
        osm_type: 'way',
        osm_id: 123,
        display_name: '東京ガーデンシアター, 6, 有明二丁目, 有明, 江東区, 東京都, 135-0063, 日本',
        lat: '35.638',
        lon: '139.792',
        address: {
          amenity: '東京ガーデンシアター',
          city: '江東区',
          'ISO3166-2-lvl4': 'JP-13',
          postcode: '135-0063',
          country: '日本',
          country_code: 'jp'
        }
      })
    ).toMatchObject({
      confidence: 0.98,
      reviewRequired: false,
      region: '東京都',
      locality: '江東区'
    });
  });

  test('accepts Osaka-Jo Hall from structured OSM names and province', () => {
    expect(
      scoreNominatimCandidate('大阪城ホール', {
        osm_type: 'way',
        osm_id: 123,
        name: '大阪城 ホール',
        display_name: '大阪城 ホール, 大阪城新橋, 大阪城, 中央区, 大阪市, 大阪府, 540-8510, 日本',
        lat: '34.689',
        lon: '135.530',
        address: {
          amenity: '大阪城 ホール',
          city: '大阪市',
          province: '大阪府',
          'ISO3166-2-lvl4': 'JP-27',
          postcode: '540-8510',
          country: '日本',
          country_code: 'jp'
        },
        namedetails: {
          name: '大阪城 ホール',
          'name:en': 'Osaka-jō Hall',
          'name:ja': '大阪城 ホール'
        }
      })
    ).toMatchObject({
      confidence: 0.98,
      reviewRequired: false,
      region: '大阪府',
      locality: '大阪市'
    });
  });

  test('accepts Zepp Namba through structured venue name prefix match', () => {
    expect(
      scoreNominatimCandidate(
        'Zepp Namba',
        {
          osm_type: 'way',
          osm_id: 123,
          name: 'Zepp なんば大阪',
          display_name:
            'Zepp なんば大阪, パークス通, 敷津東二丁目, 浪速区, 大阪市, 大阪府, 556-0012, 日本',
          lat: '34.662',
          lon: '135.501',
          address: {
            amenity: 'Zepp なんば大阪',
            city: '大阪市',
            province: '大阪府',
            'ISO3166-2-lvl4': 'JP-27',
            postcode: '556-0012',
            country: '日本',
            country_code: 'jp'
          },
          namedetails: {
            name: 'Zepp なんば大阪',
            'name:en': 'ZEPP NambaOsaka',
            'name:ja': 'Zepp なんば大阪'
          }
        },
        'Zepp Namba'
      )
    ).toMatchObject({
      confidence: 0.9,
      reviewRequired: false,
      region: '大阪府',
      locality: '大阪市'
    });
  });

  test('requires review when the candidate does not contain the venue name', () => {
    expect(
      scoreNominatimCandidate('ぴあアリーナMM', {
        osm_type: 'node',
        osm_id: 456,
        display_name: '横浜アリーナ, 横浜市, 神奈川県, 日本',
        lat: '35.512',
        lon: '139.62',
        address: {
          city: '横浜市',
          province: '神奈川県',
          country: '日本'
        }
      })
    ).toMatchObject({ reviewRequired: true });
  });
});
