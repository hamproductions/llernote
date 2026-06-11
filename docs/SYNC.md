# Offline-First & Future Sync

## Current state

Everything works with zero network after first load. User data is two localStorage keys:

- `llernote-attendance`: `Record<performanceId, AttendanceRecord>`
- `llernote-mypick`: `MyPick | null`

Manual portability exists today: Stats → Data Management → Export/Import JSON (`BackupData`, `version: 1`).

## Sync-ready invariants (already enforced)

Every mutation in `utils/attendance/storage.ts` maintains:

1. **`updatedAt`** — ISO timestamp bumped on every write
2. **Tombstones** — removal sets `deleted: true` instead of dropping the record, so deletions propagate
3. **Record-level granularity** — the map merges per `performanceId`, never wholesale
4. **LWW merge** — `importBackup` already implements last-write-wins by `updatedAt`; a sync engine reuses the exact same merge

## Plan when sync happens

1. Add a `dirty` flag (or `lastSyncedAt` watermark) to push only changed records
2. Backend: any KV/document store keyed by `userId` → same `AttendanceMap` shape; merge server-side with the same LWW rule
3. Pull → `importBackup`-style merge → push local-newer records; conflicts resolve deterministically because both sides run identical LWW
4. `MyPick` syncs as a single LWW document
5. Bump `BackupData.version` if record shape changes; keep import able to read v1

## Known limitations

- `updatedAt` LWW depends on device clocks; acceptable for single-user multi-device, fine to upgrade to a per-record counter later
- No service worker yet — the app shell needs network on first visit per deploy; adding `vite-plugin-pwa` is the natural next step for full offline
