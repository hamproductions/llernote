import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import '~/i18n';
import { FesReport } from '../FesReport';
import performanceInfo from '../../../../data/performance-info.json';
import setlistJson from '../../../../data/performance-setlists.json';
import songJson from '../../../../data/song-info.json';
import artistJson from '../../../../data/artists-info.json';
import characterJson from '../../../../data/character-info.json';
import lineupJson from '../../../../data/performance-lineups.json';
import overrideJson from '../../../../data/show-overrides.json';
import {
  buildFesDay,
  type FesContext,
  type FesLineup,
  type FesOverrides
} from '~/utils/fes-report';
import type { Artist, Character, Performance, Setlist, Song } from '~/types';

const characters = characterJson as unknown as Character[];
const ctx: FesContext = {
  songById: new Map((songJson as unknown as Song[]).map((s) => [s.id, s])),
  artistById: new Map((artistJson as unknown as Artist[]).map((a) => [a.id, a])),
  characterById: new Map(characters.map((c) => [c.id, c])),
  characters,
  lineups: lineupJson as Record<string, FesLineup>,
  overrides: overrideJson as FesOverrides
};
const performances = performanceInfo as unknown as Performance[];
const setlists = setlistJson as unknown as Record<string, Setlist>;
const days = ['756', '757'].map((id, i) =>
  buildFesDay(performances.find((p) => p.id === id)!, setlists[id]!, `Day ${i + 1}`, i, ctx)
);
const event = {
  key: 'fes',
  tour: {
    tourName: 'Fes',
    seriesIds: ['1', '2', '3', '4', '6', '8'],
    legs: [],
    startDate: '2026-11-14',
    endDate: '2026-11-15'
  },
  days: days.map((d) => ({ performanceId: d.performanceId, date: d.date, label: d.label }))
};

describe('FesReport', () => {
  it('renders every section and switches views', async () => {
    const user = userEvent.setup();
    render(<FesReport event={event} days={days} />);
    expect(screen.getByText(/Findings|ポイント/)).toBeTruthy();
    expect(screen.getAllByText(/Song time|曲の時間/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cast time|出演時間/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Day to day|日替わり/).length).toBeGreaterThan(0);
    // the day-to-day tiles come from the audited diff: 24 repeated, 26 dropped, 25 new
    expect(screen.getByText('26')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
    await user.click(screen.getByText(/Active only|現役のみ/));
    await user.click(screen.getAllByText(/^Day 2$/)[0]!);
    expect(screen.getAllByText(/Liella!/).length).toBeGreaterThan(0);
  });
});
