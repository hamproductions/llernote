# SetlistDle — design spec

A Wordle/Loldle-style daily guessing game built on LLerNote's colored setlist bar.

## Core loop

Player sees a **colored setlist bar** for a hidden event (song names hidden — only the
section-colored segments show). Guess **which event** it is. Each wrong guess:

1. adds a row to a Loldle-style **attribute comparison grid**, and
2. unlocks the next tier on the **hint ladder**.

Win when guessed correctly (or run out of guesses). Daily puzzle is the same for everyone
(date-seeded). Result shareable as an emoji grid.

## Pool

- Pool = performances that have a **non-trivial setlist** (>= MIN_SONGS real songs, e.g. >= 5),
  resolved from actual `performance-setlists.json` (NOT the unreliable `hasSetlist` flag).
- Stable chronological sort → each event gets a **number** `#1..#N` shown in UI ("Event #123 / 480").
- N is shown so the player knows the pool size.

## Daily seed

- `seededIndex(dateStr) = hash("YYYY-MM-DD") % N` (deterministic string hash, no Math.random).
- Today's local date (project "today" is fine). Everyone on the same date → same target.
- After finishing, offer **Practice / Random** (seed from a counter, not date) — secondary.

## Attribute comparison grid (per guess)

Compare guessed event vs target. Columns:

| Column      | Match logic |
|-------------|-------------|
| Series      | green = same series set; yellow = some overlap (multi-series fes); gray = none |
| Year        | green = same; else ↑/↓ arrow toward target |
| Category    | green = same (live/online/tv) else gray |
| Tour type   | green = same tourType; yellow = same category family; gray |
| Prefecture  | green = same; yellow = same region; gray (online → "—") |
| # songs     | green = exact; yellow = within ±2; else ↑/↓ arrow toward target |
| # encores   | green = exact; ↑/↓ |

Color tokens: green = a registered green scale (must register — only pink/mauve exist), yellow =
amber scale (also must register), gray = mauve. **Register green + amber scales in src/theme**
(pink/mauve are the only ones present — unregistered palettes render transparent).

## Hint ladder (user-specified order)

Revealed progressively (one tier per wrong guess, plus an explicit "reveal hint" button):

0. **nothing** — just the colored bar.
1. **section counts** — Main: 12 · Encore: 3 · W-Encore: 1 · MC×4 (counts only, no names).
2. **MC contents** — the MC / 幕間 / VTR remark texts from setlist items.
3. **first song** — reveal the opening song name.
4. **song list** — progressively reveal remaining song names on the bar.

## Persistence (localStorage)

- Key per date: guesses[], status (playing/won/lost), revealedHintTier.
- Global: streak, maxStreak, lastPlayedDate, win distribution.
- No Math.random / Date.now in pure seed logic (matches project SSG constraint); read date once in UI.

## Page

- Hidden Vike route `/setlistdle`. **No nav link anywhere.**
- Hero = the setlist bar. Searchable event combobox. Grid + hint panel below. Win/lose modal with
  share + link to real event detail.
- i18n ja + en. Dark + light. Responsive 1440 + 375.
- Beautiful & fun: gradient hero, segment reveal animation, confetti/celebration on win.

## Reused / new pieces

- Reuse setlist bar component in a **`hidden`/`masked` mode** (colored segments, names hidden).
- New pure engine module `src/game/setlistdle.ts` (pool, seed, compare, hints) — fully unit-tested.
- New page `src/pages/setlistdle/+Page.tsx` (+config for title/hidden).
</content>
</invoke>
