import { describe, expect, it } from 'vitest';
import { computeCompletion } from '../completion';
import type { Performance, Setlist, Song } from '~/types';
import type { AttendanceRecord } from '~/types/attendance';

const songs: Song[] = [
  { id: 'a', name: 'Song A', seriesIds: [1], releasedOn: '2024-01-01' },
  { id: 'b', name: 'Song B', seriesIds: [1], releasedOn: '2024-01-01' },
  { id: 'c', name: 'Song C', seriesIds: [1], releasedOn: '2024-01-01' },
  { id: 'other', name: 'Other series', seriesIds: [2], releasedOn: '2024-01-01' },
  { id: 'future', name: 'Future release', seriesIds: [1], releasedOn: '2026-01-01' }
];
const performance = (id: string, overrides: Partial<Performance> = {}): Performance => ({
  id,
  tourName: id,
  date: '2024-06-01',
  venue: 'Hall',
  seriesIds: ['1'],
  status: 'completed',
  hasSetlist: true,
  category: 'live',
  ...overrides
});
const setlist = (id: string, songIds: string[], isActual = true): Setlist => ({
  id,
  performanceId: id,
  isActual,
  sections: [],
  items: songIds.map((songId, position) => ({
    id: `${id}-${position}`,
    type: 'song',
    songId,
    position
  }))
});
const performances = new Map(
  [
    performance('first'),
    performance('second'),
    performance('online', { category: 'online' }),
    performance('future', { date: '2026-01-01' }),
    performance('canceled', { canceled: true }),
    performance('unconfirmed')
  ].map((p) => [p.id, p])
);
const setlists = {
  first: setlist('first', ['a', 'a', 'other', 'future']),
  second: setlist('second', ['a', 'b']),
  online: setlist('online', ['b']),
  future: setlist('future', ['c']),
  canceled: setlist('canceled', ['c']),
  unconfirmed: setlist('unconfirmed', ['c'], false)
};
const record = (
  performanceId: string,
  watchType: AttendanceRecord['watchType'] = 'live'
): AttendanceRecord => ({
  performanceId,
  status: 'attended',
  watchType,
  createdAt: '',
  updatedAt: ''
});
const compute = (records: AttendanceRecord[] = [], includeRemote = false) =>
  computeCompletion(songs, records, performances, setlists, '1', includeRemote, '2025-01-01');

describe('completion performance counts', () => {
  it('counts all confirmed performances independently of attendance', () => {
    const result = compute();
    expect([...result.performed.entries()]).toEqual([
      ['a', 2],
      ['b', 1]
    ]);
    expect(result.heard.size).toBe(0);
    expect(result.catalog.map((song) => song.id)).toEqual(['a', 'b', 'c']);
    expect(result.performed.has('c')).toBe(false);
  });

  it('counts a song once per show while preserving repeated song plays', () => {
    const result = compute([record('first')]);
    expect(result.heard.get('a')).toBe(1);
    expect(result.performed.get('a')).toBe(2);
    expect(result.plays).toBe(2);
    expect(result.shows).toBe(1);
    expect(result.percent).toBe(33.3);
  });

  it('includes remote performances and watched records only when enabled', () => {
    const records = [record('first', 'stream'), record('online', 'stream')];
    expect(compute(records).heard.size).toBe(0);
    const result = compute(records, true);
    expect(result.performed.get('b')).toBe(2);
    expect([...result.heard.entries()]).toEqual([
      ['a', 1],
      ['b', 1]
    ]);
  });
});
