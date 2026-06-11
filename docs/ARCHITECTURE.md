# Architecture

## Overview

LLerNote is a static, offline-first SPA (prerendered by Vike). All event/song/cast data is bundled at build time; all user data lives in `localStorage`. There is no backend.

```
src/
├── pages/            Vike file-based routes
│   ├── index/        Events list (search, filters, detail dialog)
│   ├── calendar/     Calendar + Timeline tabs
│   ├── upcoming/     Future events with countdown
│   ├── stats/        Statistics + share image + data export/import
│   ├── mypick/       Favorites picker + share card
│   └── songs/        Witnessed-song tally and ranking
├── components/
│   ├── ui/           Park UI generated primitives (do not hand-edit)
│   ├── events/       EventCard, EventDetailDialog, EventFiltersBar, AttendanceButtons, SeriesBadge, NativeSelect
│   ├── stats/        StatsCard (share-image render target)
│   ├── mypick/       PickDialog, MyPickCard (share-image render target)
│   └── layout/       Nav, footer, metadata, color mode / language toggles
├── hooks/
│   ├── useData.ts        Static dataset accessors (module-level maps, sorted lists)
│   └── useAttendance.ts  useSyncExternalStore bindings for user data
├── utils/
│   ├── attendance/storage.ts  SyncedStore (localStorage + subscribers), CRUD, backup
│   ├── stats.ts                computeStats aggregation
│   ├── song-tally.ts           tallySongs aggregation
│   ├── event-filter.ts         filterEvents predicate
│   ├── performance-cast.ts     performance → character-ids map (via setlists → songs → artists)
│   └── share.ts                image download, X intent, EventerNote URL, clipboard
└── types/            Domain types (static data + attendance)
```

## Data flow

- **Static data**: JSON in `data/` imported directly into the bundle (`hooks/useData.ts`). Module-level `Map`s give O(1) lookups; everything is immutable.
- **User data**: `utils/attendance/storage.ts` exposes `SyncedStore<T>` — a localStorage-backed store with a subscriber set. React components consume it through `useSyncExternalStore` (`hooks/useAttendance.ts`), so any write re-renders every subscribed component without prop drilling or context.

## Key decisions

- **localStorage over IndexedDB**: attendance records are ~200 bytes each; even 1000 events ≈ 200 KB, far below the 5 MB budget. The `SyncedStore` interface isolates the backend so it can be swapped later.
- **Tombstones, not deletes**: removing a mark sets `deleted: true` + `updatedAt` instead of dropping the key. Required for conflict-free sync later (see SYNC.md).
- **Cast filter is derived**: performances carry no artist IDs, so `performance-cast.ts` walks setlist → song → artist → character once (cached module-level) to answer "which casts appeared at this event".
- **Share images**: `modern-screenshot`'s `domToBlob` on a real DOM node (StatsCard / MyPickGrid) at 2× scale — no canvas drawing code to maintain.
- **Tour grouping**: events list groups performances by `tourName` (`utils/tour.ts`); legs render with real `concertName`/`performanceName` labels from `event-extra.json`. Row-major masonry via `useColumnCount` + round-robin column stacks.
- **MyPick is a configurable grid**: rows = series or any artist (group/solo), columns = slot columns (cast/song/event) or year columns (addable left/right). Cells keyed `rowKey|columnKey` in one flat map (`types/attendance.ts` `cellKey`), so config changes never orphan unrelated cells.
- **Songs page is a collection tracker**: all 884 songs with witnessed/unwitnessed state derived from `tallySongs`, completion percentage scoped to the active series filter.
- **Setlist song numbering**: non-song items (MC/VTR/custom) get no number; numbering is precomputed per item id before render.

## Conventions

- Park UI primitives in `components/ui` are generated (`bun codegen:components`); never hand-edit.
- Panda CSS style props; dynamic (data-driven) colors go through `style={{}}` (the 4 lint warnings for this are accepted).
- i18n: every user-visible string goes through `t()`; locales at `src/i18n/locales/{en,ja}.json`.
- Dates are `YYYY-MM-DD` strings; compare with `localeCompare`, never `new Date()` parsing (timezone traps).
