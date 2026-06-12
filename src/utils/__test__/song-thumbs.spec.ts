import { describe, expect, it } from 'vitest';
import { getSongThumbId, hasSongThumb } from '../song-thumbs';

describe('song thumbnail resolution', () => {
  it('uses direct current song thumbnails', () => {
    expect(getSongThumbId('864')).toBe('864');
    expect(hasSongThumb('864')).toBe(true);
  });

  it('uses direct thumbnails before legacy aliases', () => {
    expect(getSongThumbId('502')).toBe('502');
    expect(hasSongThumb('502')).toBe(true);
  });

  it('falls back to same-discography thumbnails', () => {
    expect(getSongThumbId('77')).toBe('2');
    expect(hasSongThumb('77')).toBe(true);
  });
});
