# LLerNote — Design Handoff (for AI designer)

You are taking over the **visual & interaction design** of LLerNote, a LoveLive! event-attendance tracker (EventerNote spirit). The functionality is built and tested. The owner has rejected several design passes as "generic AI slop". Your job is to make every screen feel intentional, dense-but-breathable, and on-brand — and to fix the open issues at the bottom. Read this whole document before touching anything.

---

## 1. Product in one paragraph

Offline-first SPA. 761 LoveLive!-franchise performances (2011–2027), 737 setlists, 884 songs, 83 characters with cast (seiyuu) data, 8 series each with an official brand color. Users mark performances as **attended** (past) or **going** (future), rate/memo them, then get: stats dashboards + share images, a song-collection tracker ("which of the 884 songs have I witnessed live"), a calendar/timeline, and **MyPick** — a configurable favorites grid exported as a share image (modeled on https://mypick.rurino.dev/ — study it, including its HTML/CSS; the owner explicitly demands parity with its polish).

## 2. Hard constraints (do not violate)

- **Stack:** React 19 + Vike SSR + **Panda CSS** + **Park UI** components + i18next (ja primary, en secondary). Styles via Panda style-props/tokens only; `hash.cssVar` is **off** (raw `var(--colors-*)` works but prefer tokens).
- **Never read `window`/`localStorage`/`new Date()` in render paths** — SSR hydration must stay deterministic (this bit us repeatedly). First paint is `lng: 'ja'`; saved language applies in an effect.
- **Brand:** accent `#e4007f` (ll pink, full 12-step `ll` scale in `src/theme/index.ts`). Display font `Zen Maru Gothic` (900) via `textStyle="display"`; body is Park UI default. Established motif: "live venue at night" — dark-first, penlight gradient `#e4007f → #ff7a00 → #00a0e0`, radial stage-glow at page top, `SectionHeading` (gradient bar + display font) on every page h1.
- **Series colors are data** (`data/series-info.json`); always shown via `SeriesBadge`/pills. Contrast helpers exist: `seriesTextColor()` darkens for light mode / brightens for dark (`src/utils/series-contrast.ts`). Short aliases via `getSeriesShortName()` (μ's, Aqours, 虹ヶ咲, Liella!, ミュージカル, 蓮ノ空, ヨハネ, イキヅライブ) — **never render full series names in tight UI**.
- **Both themes, both locales, 375/768/1440** must all be screenshot-verified for any change. Console must stay at **0 errors**. Gates: `bun lint` (0/0), `bun run type-check`, `bunx vitest run` (25 tests), `bun run build`.
- **Gradient text (`background-clip: text`) does NOT rasterize in PNG export** (`modern-screenshot`). Export render paths must use solid colors — `MyPickGrid` has an `exporting` prop for this. Export captures `scrollWidth/scrollHeight` with `overflow: visible`.

## 3. Asset reality (design around the gaps)

| Asset | Coverage | Path |
|---|---|---|
| Character full art (portrait) | all 83 | `/assets/character/{id}.webp` |
| Character icons (member symbol glyphs — e.g. Honoka = orange ほ) | 66 | `/assets/icons/{id}.webp` |
| Seiyuu photos | 103 | `/assets/seiyuu/{id}.webp` |
| Song thumbnails | **226 of 884 only** | `/assets/songs/thumbnails/{id}.webp`; manifest `data/song-thumbs.json`, check via `hasSongThumb()` |
| Event/venue images | **none** | — |

Rules already established: songs without art show **no image at all** in lists (no placeholder icon spam); MyPick square cells may use the music-note fallback (layout needs the square). Events have no art — event cells/cards are typography + series color only.

## 4. The owner's taste rules (distilled from ~40 rounds of feedback — these are LAW)

1. **No ellipsis on names.** Event/song names wrap. Truncation allowed only in true tables, and grudgingly.
2. **No badge spam.** One status signal per row. Status lives in the button state (`+ 参加を記録` ⇄ `✓ 参加済み`), not in extra badges. Dense rows use icon-only buttons.
3. **Real labels over synthetic.** Tour legs show actual `concertName performanceName` ("名古屋公演 Day.1", "第1回"), never invented "Day N". Read `data/event-extra.json` fields before inventing anything.
4. **Grey out, never hide.** Unavailable options render disabled (`opacity .35`, "追加済み" sub-label), not removed and not silently no-op.
5. **Density.** Pinterest row-major masonry for event cards (`useColumnCount` + round-robin columns); uniform row heights in grids (no ragged heights); compact paddings. "Random space" and "too big" are rejection triggers.
6. **Everything filterable gets**: type-ahead (kana-folded via `foldKana`), multi-select chips with labeled groups (no floating divider bars), year **range** selects (no modal pickers, no dropdown with duplicated boundary year).
7. **Tables wherever lists exist** — events and songs both have card/table toggles (table = sortable date, zebra, sticky header). Mobile forces card view.
8. **Degenerate states must be impossible or graceful** — min 1 row/column in MyPick, empty states with a single clear CTA.
9. **Mobile: shrink, don't scroll.** MyPick mobile mirrors the original site: columns compress (`minmax(0,1fr)`, ~73px cells) so everything fits 375px with zero horizontal page scroll.
10. **Predictability over cleverness.** If an interaction needs explanation, it's wrong.

## 5. Page map & current state

| Page | File | State |
|---|---|---|
| Home `/` | `src/pages/index/+Page.tsx` | Gradient hero, pill search → `/events?q=`, 5 stat tiles (block-level links, equal widths), 次の予定 (going pinned first), 最近の参加, 4 guide cards. Accepted. |
| Events `/events` | `src/pages/events/+Page.tsx` | Filter bar (`EventFiltersBar`: search, `CastFilter` ARIA combobox, year range, labeled chip groups, mobile 絞り込み disclosure), masonry `TourCard`s (season-split via 60-day gap in `groupByTour`), `EventTable`, pagination. Accepted. |
| Calendar `/calendar` | `src/pages/calendar/+Page.tsx` | 3 tabs: month grid (series dots + count + legend) + agenda panel; Upcoming (date-block rows + countdown); Timeline (rail, rating in meta row, centered 3xl). Accepted-ish. |
| Stats `/stats` | `src/pages/stats/+Page.tsx` | Dashboard: 5 tiles, heatmap (active years only), gradient bar charts in 2-col `ChartCard`s, filters, offscreen `StatsCard` for PNG export, data export/import/copy-history. Accepted. |
| Songs `/songs` | `src/pages/songs/+Page.tsx` | Collection tracker: progress bar, search/series/heard/sort filters, uniform-height cards **with artist names**, table view, `SongDetailDialog` with **embedded YouTube player** + clickable "聴いた場所" → event dialog. Accepted. |
| MyPick `/mypick` | `src/pages/mypick/+Page.tsx`, `src/components/mypick/*` | Configurable grid: rows = series/group/solo, columns = pick-slots or year columns. In-grid `＋` affordances, visual pickers, URL share (`?d=` lz-string, read-only view), PNG export. **Still has open issues — see §6.** |

Shared: `EventDetailDialog` (setlist with ×N counts + 初 first-witness badges, artists toggle, copy, X/EventerNote share), `clickable()` util (keyboard access + focus ring — required on every clickable non-button), `PickDialog`, `SectionHeading`.

## 6. OPEN ISSUES — fix these first (owner's latest screenshots, 2026-06-12)

1. **MyPick "Add column" dialog is unacceptable.** Current: flat list of 9 text rows ("Oshi Event / Pick column", "2027 Oshi Cast / Year column", "2025 Oshi Song / Year column"…) plus a pointless search field (the ≤8 hide-threshold misses at 9 items). Owner verdict: "unpredictable slop, 0 intuitivity". Redesign completely — e.g. two visually distinct sections ("ピック列" with 3 large option tiles, "年別の列" with a year stepper + 3 type tiles), no search, disabled-with-reason for existing, max one decision per glance. The year options must read as *one* concept (pick year ± type), not 6 lookalike rows.
2. **MyPick song picker falls back to barren text rows for series with no thumbnails** (μ's: plain name + date rows — owner screenshot). `PickDialog` switches to Row mode when *no* item has an image. For song slots it should always render **tile mode** with the music-note square placeholder so the picker looks intentional, and tiles should show the series-colored frame; or design a proper text-tile hybrid. Make it look designed, not degraded.
3. **Row-pill ✗ still renders half-clipped outside the rounded pill corner** (owner screenshot 3). Either inset it fully (`top/right ≥ 6px`, contrast-safe circle backdrop) or show it only on hover/focus with proper hit area. Must look clean at every pill color, both themes.
4. General pass on MyPick dialog visual identity: the dialogs are the *least* designed surfaces in the app — bring them up to the level of the grid (display-font titles, accent accents, consistent paddings, themed hover).

## 7. Verification protocol (non-negotiable)

For every change: `bunx panda codegen` → gates (lint/type/test/build) → screenshot the affected page(s) with `agent-browser` at 1440 + 375, dark + light, ja + en where text changed → **actually look at the screenshots** → reproduce the owner's exact flow (their state often includes edge configs — degenerate column counts, missing art, EN locale, light mode). The owner WILL screenshot the exact state you didn't check. Seed data recipe and verification scripts: see git history (`/tmp/*.sh` patterns in commits) and `dogfood-output/screenshots/` for before/after baselines.

## 8. References

- Original MyPick: https://mypick.rurino.dev/ — grid uses Tailwind `grid-cols-4`, cells shrink to ~73px on 375px, dashed empty slots labeled "PICK SONG", section headers per generation, light pastel identity, "Generate Image" as primary CTA. Owner considers this the bar for MyPick polish.
- EventerNote (spirit reference for the tracker concept): https://www.eventernote.com/
- Data docs: `docs/DATA.md`. Architecture: `docs/ARCHITECTURE.md`. Sync model: `docs/SYNC.md`.
- Repo history: every commit message names the feedback it answered — read `git log --oneline` (≈20 commits) for the full design-iteration trail.
