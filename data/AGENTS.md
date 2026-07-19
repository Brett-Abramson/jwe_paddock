# data/

Most of this directory is **generated**. Check this table before editing anything here.

| File | Origin | Editable by hand? |
|---|---|---|
| `species.json` | `scripts/ingest.mjs` | **No** — 107 species, overwritten on every run |
| `rulesets.json` | `scripts/ingest.mjs` | **No** — sandbox + 6 Period + 15 Formation |
| `formations.json` | `scripts/ingest.mjs` | **No** — dig-site formations with ≥2 species |
| `manifest.json` | `scripts/ingest.mjs` | **No** — freshness + provenance |
| `plants.json` | hand-authored | **Yes** — paleo.gg has no flora DB |
| `periods.json` | hand-authored | **Yes** — geologic era → `[older, younger]` mya |

Regenerate:

```bash
node scripts/ingest.mjs   # prints a data-quality report; expect "unresolved names: 0"
```

Types for every shape here live in `lib/types.ts`. Change a shape there and in `ingest.mjs`
together, or the cast in `lib/data.ts` will lie to you at runtime.

## Rules the ingest applies (don't re-implement these in the app)

- The `"None"` sentinel is dropped; relationship names resolve to slugs.
- **Dislike wins** when a species is both liked and disliked (24 such clashes in the source). A
  missed conflict is the dangerous error; a missed "like" only costs a nudge.
- Dig sites normalize to base formations: `"Hell Creek Formation A"` → `"Hell Creek Formation"`.
- The 9 `Holocene` entries are lab hybrids → `isHybrid: true`. They get a "⚠ Hybrid" chip, never
  an "N my out of place" number, because they have no fossil record.
- One dirty continent value (`jwe3-digsite:india`) is mapped back to `Asia`.

## Env-need vocabulary

`Species.envNeeds[]` is `{ need, area (m²), pct?, kind }`. `kind` decides which card renders it:

- `plant` → the set-cover plant plan: `Cover`, `Pasture`, `Ground Fiber/Leaf/Fruit/Nut`,
  `Tall Leaf/Fruit/Nut`
- `food` → feeders: `Prey`, `Fish`, `Meat`
- `terrain` → terrain & water: `Water`, `Wetland`, `Arid`, `Barren`, `Open Water`, `Deep Water`

`Cover` and `Pasture` are plant-coverable but are **not** feeder needs — only the
Ground*/Tall* families drive a paleobotany feeder.

## Editing plants.json

Every `covers` entry must be an exact env-need string from the list above, or the set-cover
optimizer will silently never select that plant. Order matters: greedy set-cover breaks ties by
array order, so the file order is the deterministic tie-break.

Any need with no plant covering it surfaces as "No plant covers: X" in the UI — that's the
signal you've added a species need without a matching plant.
