# LLerNote — Complete Project Documentation

Everything known about this project as of 2026-06-12. This is the knowledge-transfer document: read this and you know what the previous agent knew.

---

## 1. What this is

**LLerNote** — offline-first LoveLive! event-attendance tracker in the spirit of EventerNote. Track which of 761 franchise performances you attended, browse setlists, tally every song you've witnessed live (884 catalog), view statistics, build a shareable "MyPick" favorites grid. No backend; all user data in localStorage with a sync-ready schema.

Built 2026-06-11→12 in ~20 commits. Origin mandate: *"yank everything from ../the-sorter — the frontend, the libs, the data, the vibes"*. the-sorter (sibling repo) remains the **single source of truth for all data**.

## 2. Stack

- **Bun** (scripts, install), **Vite 7 + Vike** (SSR prerender, file-based routes in `src/pages/*/+Page.tsx`), **React 19** + React Compiler babel plugin
- **Panda CSS** (`panda.config.ts`; `hash: { className: true, cssVar: false }` — cssVar hashing was ON originally and **silently broke every Park UI focus ring and any raw `var(--colors-*)`**; it is now OFF, keep it off)
- **Park UI** components generated into `src/components/ui/` (do not hand-edit; `bun codegen:components`)
- **i18next** ja/en — init is `lng: 'ja'` with NO language detector (detector caused SSR hydration mismatches); saved language (`i18nextLng` in localStorage) is applied in a `+Wrapper.tsx` effect post-mount, and persisted via `languageChanged` listener
- **modern-screenshot** (`domToBlob`) for PNG share images, **lz-string** for share URLs, **file-saver** (must stay in `vite.config.ts` `cjsInterop.dependencies` — removing it breaks SSR with "Named export 'saveAs' not found")
- Fonts: `Zen Maru Gothic` (display, weight 900, via Google Fonts link in `+Head.tsx`) exposed as `textStyle="display"`; Outfit secondary
- Service worker `public/sw.js` (cache `llernote-v2`): cache-first for `/assets/`, network-first with cache fallback for the rest, navigation fallback to `/`; registered in PROD only from `+Wrapper.tsx`. PWA manifest `public/manifest.webmanifest`
- CI: `.github/workflows/ci.yml` (bun install → lint → type-check → vitest → build)

## 3. Commands

```sh
bun dev                 # dev server (project convention: port 5199 during this build)
bun run build           # tsc + vite build (client + server)
bun run type-check      # tsc
bun lint / bun lint:fix # oxlint + eslint (prettier rules; @pandacss/no-dynamic-styling is OFF by design — series colors are data-driven)
bunx vitest run         # 25 unit tests
bunx panda codegen      # REQUIRED after adding new style props/tokens
bun scripts/build-event-extra.ts   # regenerate data/event-extra.json from ../the-sorter raw data
```

## 4. Data layer

All static data bundled at build time from `data/` (copied/derived from the-sorter):

| File | Records | Notes |
|---|---|---|
| `performance-info.json` | 761 | `{id, tourName, date(YYYY-MM-DD), venue, seriesIds: string[], status: completed/upcoming, hasSetlist}`. Dates 2011-05-29 → 2027-03-22, 19 future events. |
| `event-extra.json` | 744 | **Generated** by `scripts/build-event-extra.ts` from `../the-sorter/data/raw/llfans-performances.json`: `performanceName` ("Day.1", "昼の部", "第1回"), `concertName` ("名古屋公演"), `openTime`/`startTime`, `tourType` (ライブ・ファンミ ×458, 外部のフェス ×87, TV出演 ×68, リリイベ・ミニライブ, 外部イベント内のライブ, バーチャルライブ, 有観客バーチャルライブ, 収録配信), `audience`, `canceled`, `note`. 17 newest performances missing → tourType inherited from same-tourName siblings, else category defaults `live`. IDs verified aligned 744/744. |
| `performance-setlists.json` | 737 | keyed by performanceId; items typed `song`(8656, all have songId)/`mc`(1374)/`custom`(801)/`vtr`(325) + sections (Main/Encore). |
| `song-info.json` | 884 | name, phoneticName, seriesIds (**number[]** — performances use string[], cross with `String()`; known wart), releasedOn, artists[], englishName, musicVideo.videoId (YouTube). |
| `character-info.json` | 83 | fullName, seriesId, seriesColor, school, colorCode, casts (seiyuu + englishName), units, birthMonth/Day, hasIcon. |
| `artists-info.json` | 232 | groups/units/solos: name, characters[], seriesIds, englishName. |
| `series-info.json` | 8 | id, name, brand color. Short aliases hardcoded in `src/utils/series-short.ts`. |
| `song-thumbs.json` | 226 | **Generated** manifest of song IDs that actually have thumbnail art (`hasSongThumb()` in `src/utils/song-thumbs.ts`). 658 songs have NO art — render no image for them. |
| `units.json`, `series.json`, `school.json`, `build-info.json` | — | units list, JA→EN name maps, data timestamp (footer). |

Assets in `public/assets/`: `character/{id}.webp` (83 portraits), `icons/{id}.webp` (66 member-symbol glyphs — small use only, NOT cell art), `seiyuu/{id}.webp` (103), `songs/thumbnails/{id}.webp` (226), `bg.webp` (watermark, opacity 0.03). **No event images exist. Audio (300MB) was deliberately not copied.**

`src/hooks/useData.ts` merges performance-info + event-extra at module load, derives `category: 'live' | 'online' | 'tv'` (TV出演→tv; バーチャルライブ/収録配信/audience:false→online; else live), exposes module-level Maps (`usePerformanceById`, `useSongById`, `useArtistById`, `useSeriesById`) and sorted lists.

`src/utils/performance-cast.ts`: performances carry no artist IDs — cast filtering works via cached map performance→setlist→songs→artists→characters.

`src/utils/tour.ts` `groupByTour`: groups performances by tourName, then **splits on >60-day gaps** between consecutive legs (recurring TV programs would otherwise merge into multi-year "tours"). Tour key in lists: `tourName|startDate`.

## 5. User-data model (sync-ready)

`src/utils/attendance/storage.ts` — `SyncedStore<T>`: localStorage-backed, subscriber set, **cross-tab sync** via storage events, consumed through `useSyncExternalStore` (`src/hooks/useAttendance.ts`).

- `llernote-attendance`: `Record<performanceId, { performanceId, status: 'attended'|'interested', watchType?: 'live'|'stream'|'delay', rating?: 1-5, memo?, deleted?, createdAt, updatedAt }>`
  - Semantics: **past events → attended only; future events → interested ("参戦予定"/going) only.** "気になる/Interested" as a separate past-event state was explicitly killed by the owner.
  - Tombstones (deleted:true) preserved for future sync; tombstoned records drop memo/rating/watchType (no resurrection on re-mark); memo trimmed; marking attended persists default watchType 'live'.
- `llernote-mypick`: `{ config: { rows: ({type:'series'|'artist', id})[], columns: ({type:'slot',slot} | {type:'year',year,slot})[] }, cells: Record<"rowKey|colKey", pickedId>, updatedAt }` (key helpers in `src/types/attendance.ts`). Cells pruned on config change; null clears delete keys.
- Backup: `exportBackup()/importBackup()` versioned (v1), validates record shape (invalid entries skipped, bad files throw → error toast), attendance merges per-record LWW by updatedAt, myPick merges newer-wins with **cell union** so older device's cells survive.
- View prefs: `llernote-events-view`, `llernote-songs-view` ('cards'|'table'), `color-mode`, `i18nextLng`.
- Future sync plan: docs/SYNC.md (LWW per record, dirty flags later, same merge server-side).

## 6. Features (all implemented & tested)

### Home `/`
Gradient penlight hero (gradient text `#e4007f→#ff7a00→#00a0e0`), pill search → `/events?q=`, first-run CTA, 5 stat tiles (equal-width block links → /stats), 次の予定 (going-marked events pinned first, then nearest upcoming, 2 shown), 最近の参加イベント (3), 4 guide cards.

### Events `/events`
- Filter bar: text search (kana-folded, matches tourName+venue+concertName+performanceName+tourType), **CastFilter** (ARIA combobox: type-ahead, arrow/enter/escape, avatar suggestions, removable chips), **year range** (two selects, auto-clamping from>to), labeled chip groups (series short-name chips in brand colors with light/dark contrast adjustment, category chips, attendance chips), clear; mobile collapses behind 絞り込み disclosure.
- Card view: **row-major masonry** (`useColumnCount` 1/2/3 + round-robin), TourCards with real leg labels (`legLabel()` = concertName+performanceName, date-dupes filtered), per-leg icon-only attend buttons, setlist buttons, EventerNote link, category badge (raw tourType in ja, mapped EN strings in en), single-leg compact variant.
- Table view (≥md only; mobile forces cards): global date sort asc/desc (sort BEFORE pagination slice), zebra, sticky header, leg column, venue 2-line, series chips capped +N, icon actions.
- Pagination (Park UI, 24/page, responsive siblingCount), `?q=` param hydrated in effect.

### Event detail dialog
Header (date, series, category, leg label, 開場/開演 times, note) → attend/going button → if attended: watchType select, 5★ rating (accent fill, aria-pressed), memo textarea (saved on blur, labeled) → share row (copy text, X intent, EventerNote search link — all `Button asChild <a>`) → setlist: sections, song numbering, **×N witness counts + 初 first-witness badges** (computed from user's other attended setlists), artist-display toggle (deduped, localized), copy-setlist text, MC/VTR rendered as outline chips.

### Calendar `/calendar` (3 tabs)
- Month grid: series-colored dots (max 5 + count badge for multi-event days), color legend below, today/selected highlights, prev/next/year-select/今日; side agenda panel always listing the month (or selected day) with icon attend buttons.
- 今後のイベント: 2-col compact rows — date block (big day number on accent tint), title+leg (wrapping), series chip, venue, countdown (今日/明日/あとN日), going button.
- タイムライン: centered 3xl rail; year in display type, dot nodes, date / wrapping title / series + venue + ★rating meta row / italic memo.

### Stats `/stats`
Filters (year/series/category applied to records) → 5 stat tiles (attended / songs witnessed / unique songs / venues / going-future-only) → 初参加イベント line → chart cards 2-col: **activity heatmap** (active years × 12 months, intensity pink), by-year, by-series (brand-color bars, short names), top venues, category — gradient pill bars. Header actions: 画像をダウンロード (renders offscreen `StatsCard` share card), 参加履歴をコピー (tweetable text list). Data management: JSON export / import (validated, toasts) below.

### Songs `/songs`
Collection tracker over all 884: progress bar + "N/884 聴取済み (x%)" scoped to series filter; search (kana-folded incl. phonetic/english), series, heard/unheard, sort (count/release/name); uniform-height cards (artist names + series chip; **no image when no art exists** — no placeholder spam, no 404s, via thumb manifest); table view toggle (song/artist/series/release/count); pagination. Song detail dialog: art (if any), localized title, artists, release badge, **embedded YouTube player** (youtube-nocookie 16:9), 聴いた場所 list — each row clickable → opens that event's detail dialog.

### MyPick `/mypick`
Full spec lives in this doc §7 + chat handoff. Summary: configurable grid (series/group/solo rows × pick-or-year columns), scoped visual pickers, min 1 row/col enforced, empty-state guard, in-grid ＋ affordances, solid series-color row pills, square art-first cells (portraits for cast), URL share (`?d=` lz-string → read-only view + CTA), PNG export (`exporting` prop: solid wordmark — gradient text doesn't rasterize — fit-content width, no edit affordances, no scrollbar artifacts), mobile shrink-to-fit (matches mypick.rurino.dev behavior).

### Cross-cutting
- `clickable()` util (`src/utils/clickable.ts`): role=button + tabIndex + Enter/Space + focus ring — applied to every clickable card/row/cell. The keyboard-unreachable-dialog issue was the one critical finding of the 20-agent review.
- EN localization: `localizedName(lang, name, englishName)` across songs/casts/artists/setlists; locale files `src/i18n/locales/{en,ja}.json` (key parity maintained); plurals via i18next `_one/_other`; tourType EN map in CategoryBadge.
- Light mode fully supported; series-color contrast auto-adjusted per theme (`src/utils/series-contrast.ts`: darken-for-light / brighten-for-dark with luminance floors).
- 404 localized; error boundary with copy/reload/clear actions.

## 7. MyPick functional spec (owner-approved wording)

Rows: series (8) or group/unit/solo (232), no duplicates, min 1. Columns: pick columns (推しキャスト/推し曲/推しイベント, max one each) + unlimited year columns (year+type, addable left=earlier/right=later), min 1 total. Cells scoped by row (members/songs/events of that series/group) and by year for year columns. Operations: add/remove rows & columns (cells pruned), set/replace/clear cells. Sharing: PNG export (no edit affordances, complete regardless of viewport) + self-contained share URL (read-only view + "make your own" CTA). Persistence: localStorage + included in backup. Default: 8 series rows × 3 pick columns. **Design layer was rejected and handed off — see §10.**

## 8. The owner's taste rules (LAW — every rejection traced to one of these)

1. No ellipsis on names — wrap. 2. No badge spam — status lives in the button state; dense rows use icon-only buttons. 3. Real data labels over synthetic ("名古屋公演 Day.1" not "Day 2") — read all available data fields before inventing. 4. Grey out disabled options with a reason; never hide, never silent no-op. 5. Density: row-major masonry, uniform heights, tight padding; "random space/too big" = rejection. 6. Filters: inline, type-ahead, multi-select chips with group captions, year ranges — **no modal pickers for filters**. 7. Tables as alternates everywhere lists exist. 8. Degenerate states impossible or graceful. 9. Mobile shrinks (like the reference), doesn't horizontally scroll the page. 10. If an interaction needs explanation it's wrong.

## 9. Known issues / open items

**Open (design, handed off — see docs/DESIGN_HANDOFF.md §6):**
1. MyPick "Add column" chooser is unintuitive slop (9 lookalike rows + pointless search at exactly 9 items, hide-threshold is ≤8).
2. MyPick song picker degrades to bare text rows for series with no song art (PickDialog tile-mode triggers on "any item has image" — μ's has none).
3. Row-pill ✗ remove button still clips outside the rounded pill corner.
4. MyPick dialogs generally under-designed vs the grid.

**Accepted/parked:**
- `Song.seriesIds` is number[] vs string everywhere else (per-call-site String(); normalize someday).
- ~2MB catalog JSON in one eager chunk (fine for offline-first; route-split someday).
- Server first paint is always ja (deterministic by design); language applies post-mount.
- Two upstream data oddities reported by review agents (南條愛乃 listed at New Year LoveLive! 2013 via cast-derivation; venue shown under renamed 2025 name for old events) — LLFans data, not ours.
- the-sorter goodies inventoried but not ported: multi save-slots, CSV import with wanakana fuzzy matching, CharacterInfoDialog (birthdays/units), deploy.yml + data-update automation, release-it. See git history "Mine the-sorter" agent output.

## 10. Process history (what was tried, what the owner did)

~40 rounds of feedback across one marathon session. Major arcs: scaffold→features→“everything is dogshit” design rounds (masonry, real legs, categories, configurable MyPick, home dashboard, inline filters)→**20-subagent review** (10 browser personas + 10 code auditors → 111 findings, all fixed: keyboard access everywhere, storage hardening, light-mode contrast, SW fixes, hydration)→fresh-agent QA (11 findings: theme persistence race, page-slice sort bug, dup keys, import feedback, mobile overflows)→visual overhaul ("live venue at night" identity)→two critic waves (12+6 findings, converged)→MyPick degenerate-state meltdown→**design fired, handed off**. Every commit message names the feedback it answers — `git log --oneline` is the audit trail.

Verification protocol that survived: after every change — panda codegen, lint/type/test/build gates, `agent-browser` screenshots at 1440+375 in dark+light and ja+en, **actually look at the screenshots**, reproduce the owner's exact state (edge configs, missing art, EN, light), open exported PNGs (export-only bugs: gradient text, scrollbars, clipping). The owner always screenshots the state you didn't check. Console must be 0 errors in both locales.

## 11. File map

```
data/                      bundled datasets (+ generated: event-extra.json, song-thumbs.json)
scripts/build-event-extra.ts
public/sw.js, manifest.webmanifest, assets/
src/
  pages/{index,events,calendar,stats,songs,mypick,_error}/+Page.tsx
  pages/+Layout.tsx (+nav, stage-glow, watermark) +Head.tsx +Wrapper.tsx (SW + lang effect)
  components/
    ui/                    Park UI (generated)
    events/  TourCard EventCard EventTable EventDetailDialog EventFiltersBar CastFilter
             CategoryBadge SeriesBadge AttendanceButtons NativeSelect
    songs/   SongCard SongTable SongDetailDialog SongThumb
    mypick/  MyPickGrid PickDialog
    stats/   StatsCard (export-only render)
    layout/  SectionHeading Metadata Footer ColorModeToggle LanguageToggle
  hooks/    useData useAttendance useLocalStorage useColumnCount
  utils/    attendance/storage stats song-tally tour event-filter performance-cast
            clickable share mypick-share series-short series-contrast song-thumbs names assets
  types/    index.ts (domain) attendance.ts (user data + mypick keys)
  i18n/     index.ts locales/{en,ja}.json
docs/       PROJECT.md (this) ARCHITECTURE.md DATA.md SYNC.md DESIGN_HANDOFF.md
dogfood-output/  QA report + ~60 screenshot baselines
```

## 12. Quality state at handoff

Lint 0 errors / 0 warnings · tsc clean · 25/25 tests · client+server builds green · 0 console errors on all routes in ja and en, dark and light · keyboard operable · offline after first visit. Dev server convention: `bun dev --port 5199`. ~20 commits, each gated.
