# LLerNote

Offline-first LoveLive! event attendance tracker, in the spirit of [EventerNote](https://www.eventernote.com/).

Track the lives you attended, browse setlists, tally every song you've witnessed, view your stats, and share them as images.

## Features

- **Event tracking** — mark any of 760+ LoveLive! series performances as *Attended* or *Interested*, with watch type (live / livestream / delay), 5-star rating, and free-form memo
- **Browse & filter** — full-text search, series filter (colored per franchise), year, cast (derived from setlists), attendance status
- **Calendar & timeline** — month calendar with per-series event dots; chronological timeline of your attended history
- **Upcoming events** — future events with countdown badges
- **Statistics** — totals, by-year/series/venue/watch-type breakdowns, exportable as a share image (PNG)
- **MyPick** — favorite events / groups / songs / year (multi-group supported), exportable as a share card
- **Song tally** — every song you've witnessed live, ranked by count, with the exact performances where you heard it
- **Sharing** — X (Twitter) intent, copy-as-text, EventerNote search link per event
- **Data ownership** — JSON export/import backup (Stats page → Data Management)
- **Offline** — service worker caches app shell + assets after first visit; installable PWA manifest
- **Personal setlist markers** — 初 badge on songs you witnessed for the first time at that event, ×N witness counts
- **Activity heatmap** — GitHub-style year × month grid on the stats share card

## Stack

Cloned wholesale from [the-sorter](https://github.com/hamproductions/the-sorter): React 19 + Vike (SSR prerender) + Panda CSS + Park UI + i18next (EN/JA) + modern-screenshot. Runtime data and assets come from [LLFans](https://ll-fans.jp).

## Development

```sh
bun install        # also runs panda codegen via prepare
bun dev            # vite dev server
bun run build      # tsc + vite build
bun test           # vitest
bun check          # lint + type-check
```

## Documentation

- [docs/PROJECT.md](docs/PROJECT.md) — **complete project documentation** (start here: every feature, decision, constraint, open issue)
- [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) — design handoff with constraints and open visual issues
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — app structure, state, persistence
- [docs/DATA.md](docs/DATA.md) — bundled datasets and their schemas
- [docs/SYNC.md](docs/SYNC.md) — offline-first design and the future sync plan
