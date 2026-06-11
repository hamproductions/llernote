# Bundled Data

All files in `data/` are copied from [the-sorter](https://github.com/hamproductions/the-sorter), which builds them from the [LLFans](https://ll-fans.jp) GraphQL API. To refresh, re-run the-sorter's `scripts/internal/update.ts` pipeline and copy the outputs listed below.

| File | Records | Purpose |
|---|---|---|
| `performance-info.json` | 761 | Events: `{id, tourName, date, venue, seriesIds[], status, hasSetlist}` |
| `performance-setlists.json` | 737 | Keyed by performanceId: `{items[], sections[], isActual}` — items are `song`/`mc`/`vtr`/`custom` |
| `song-info.json` | 884 | Songs: `{id, name, phoneticName, seriesIds[], artists[], englishName?}` |
| `character-info.json` | 83 | Characters with casts (seiyuu), units, school, colors |
| `artists-info.json` | 232 | Groups/units/solo artists: `{id, name, characters[], seriesIds[]}` |
| `series-info.json` | 8 | Series id, Japanese name, brand color |
| `units.json` | 47 | Unit definitions |
| `series.json` / `school.json` | — | JA→EN name translations |
| `build-info.json` | — | `lastUpdated` timestamp shown in the footer |

## Key relationships

- `performance.seriesIds[]` → `series.id` (string)
- `setlist.items[].songId` → `song.id`
- `song.artists[].id` → `artist.id` → `artist.characters[]` → `character.id`
- `song.seriesIds[]` is `number[]`; `performance.seriesIds[]` is `string[]` — normalize with `String()` when crossing.

## Assets (`public/assets/`)

- `character/{id}.webp` (83), `seiyuu/{id}.webp` (103), `icons/{id}.webp` (66)
- `songs/thumbnails/{songId}.webp` (226) — used in the song tally; missing thumbnails are hidden via `onError`
- `bg.webp` — page background
- Audio files were **not** copied (300 MB, unused here)

Resolve URLs via `utils/assets.ts` (`getPicUrl(id, type)`).

## Notable data facts

- Dates span 2011-05-29 → 2027-03-22; `status` is `completed` or `upcoming` (19 future events at copy time)
- Setlist item counts: 8656 songs, 1374 MCs, 801 custom, 325 VTR; every `song` item has a `songId`
- Multi-series collab events list multiple `seriesIds` and are counted once per series in stats
