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

## Verification commands

```txt
bunx vitest run src/components/events/__test__/EventDetailDialog.spec.tsx
bun run test -- run
bun run lint
bun run type-check
bun run build
```

All commands passed locally. `bun run lint` reports one pre-existing warning in `src/components/ui/data-table.tsx` (`Unused 'use no memo' directive`) and exits 0.
