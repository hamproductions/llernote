# Song modal stack + mobile bottom nav proof

Branch: `fix/song-modal-stack-mobile-nav`

## Root cause

- The event detail setlist rendered song rows, but those rows did not expose a song-details action.
- The reusable song details dialog also had no explicit layer contract, so opening it from inside another dialog needed explicit stacking.
- Mobile navigation only used the header/drawer pattern; this PR adds a fixed bottom tab bar inspired by the Bluesky/Bluebird mobile layout: icon-first tabs, active filled pill, safe-area padding, and a More/Menu drawer.

## Screenshots

| File | Evidence |
| --- | --- |
| `01-event-dialog-song-detail-buttons.png` | Event detail dialog setlist rows now show per-song info/detail buttons. |
| `02-stacked-song-dialog-over-event.png` | Clicking a setlist song opens `SongDetailDialog` stacked above the event dialog, with the parent dimmed underneath. |
| `03-mobile-bottom-nav-songs.png` | Mobile `/songs` renders fixed bottom nav with Home / Events / Calendar / Songs / Menu and active Songs state. |
| `04-mobile-more-drawer.png` | Mobile Menu opens the drawer with full navigation and settings/language controls. |
| `05-desktop-header-nav.png` | Desktop (>=lg) header nav shows icon + label tabs with an active filled pill. |
| `06-tablet-header-icononly.png` | At md the header collapses to icon-only tabs so the row never overflows or wraps the toggles. |
| `07-mobile-drawer-icons.png` | Mobile drawer items now render icon + label with an active highlight, matching the rest of the nav. |

## Nav rework

The navigation was unified around a single source of truth and a shared active-route check:

- `src/utils/url.ts` adds `toAppUrl` and `isActiveRoute`. `isActiveRoute` matches on path segment boundaries, so `/songs` no longer falsely activates on routes like `/songsomething` (the previous `startsWith` check did).
- `NAV_ITEMS` drives the desktop header, mobile bottom nav, and drawer; MyPick gets its own `FaStar` icon instead of reusing the Stats icon.
- Desktop header, drawer, and bottom nav all render icon + label with consistent active styling (`accent.subtle` pill, `accent.text`).
- Responsive header: icon + label at `lg`, icon-only at `md`, fixed bottom pill nav below `md`.

## Verification commands

```txt
bunx vitest run src/components/events/__test__/EventDetailDialog.spec.tsx
bun run test -- run
bun run lint
bun run type-check
bun run build
```

All commands passed locally. `bun run lint` reports one pre-existing warning in `src/components/ui/data-table.tsx` (`Unused 'use no memo' directive`) and exits 0.
