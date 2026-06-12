import { describe, expect, it } from 'vitest';
import { fuzzySearch, getSearchScore } from '../search';

describe('search', () => {
  it('matches compact romanized queries through spaces and punctuation', () => {
    expect(fuzzySearch({ id: '1', name: 'Snow halation' }, 'snowhalation')).toBe(true);
    expect(fuzzySearch({ id: '2', name: 'KiRa-KiRa Sensation!' }, 'kirakirasensation')).toBe(true);
    expect(fuzzySearch({ id: '3', name: 'GAME ON！' }, 'gameon')).toBe(true);
  });

  it('scores exact compact matches above partial compact matches', () => {
    const exact = getSearchScore({ id: '1', name: 'Deep Blue' }, 'deepblue');
    const partial = getSearchScore({ id: '2', name: 'Deep Resonance' }, 'deep');

    expect(exact).toBeGreaterThan(partial);
  });
});
