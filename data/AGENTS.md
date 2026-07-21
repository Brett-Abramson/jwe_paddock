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
- The 9 `Holocene` entries are lab hybrids → `isHybrid: true`. They get a "🧬 Hybrid" chip, never
  an "N my out of place" number, because they have no fossil record.
- One dirty continent value (`jwe3-digsite:india`) is mapped back to `Asia`.

## Env-need vocabulary

`Species.envNeeds[]` is `{ need, area (m²), pct?, kind }`. `kind` decides which card renders it:

- `plant` → the set-cover plant plan: `Cover`, `Pasture`, `Ground Fiber/Leaf/Fruit/Nut`,
  `Tall Leaf/Fruit/Nut`, `Arid`, `Barren`, `Wetland`
- `food` → feeders: `Prey`, `Fish`, `Meat`
- `terrain` → dug/built water only: `Water`, `Open Water`, `Deep Water`

`Cover`/`Pasture`/`Arid`/`Barren`/`Wetland` are plant-coverable but are **not** feeder needs —
only the Ground*/Tall* families drive a paleobotany feeder. `Arid`/`Barren`/`Wetland` moved from
`terrain` to `plant` because JWE3 paints them with the same brush tool as flora (see
`PLANT_NEEDS` in `scripts/ingest.mjs`); real dug water did not move.

## Editing plants.json — the brush/yield model

JWE3 doesn't give you a checklist of flora, it gives you **brushes**: pick a plant, paint an
area, and that one stroke produces every need in its `provides` list at once, each at its own
rate. `Plant` (`lib/types.ts`) is `{ id, name, category, provides: [{ need, rate }] }`.

- `category` is cosmetic (matches the game's brush grouping: `Leaf, Fiber, Fruit & Nut` ·
  `Cover & Pasture` · `Arid & Barren` · `Wetland`) — the optimizer doesn't use it.
- `need` must be an exact env-need string from the list above, or the optimizer will silently
  never select that plant for it. `Tall Fiber` is a legitimate exception: it's a real JWE3 yield
  (Calamites, Cycad Grove) but no scraped species currently needs it, so it just never gets
  picked — that's expected, not a bug.
- `rate` is **m² of that need satisfied per m² painted**. JWE3 shows this as 2 or 3 up-arrows in
  the brush UI, not a number — this dataset reads that literally as a 2x/3x multiplier (`+` → 2,
  `++` → 3). If a real numeric source ever surfaces, replace these, don't guess further.
- Order matters: greedy set-cover breaks ties by array order, so the file order is the
  deterministic tie-break.

The optimizer (`lib/engine/plants.ts`) paints a plant enough to fully satisfy the largest
still-open need it targets, which over-supplies its other needs from the same stroke — that's
realistic (JWE3 painting is one area, not per-need) and reported as extra `supplies`, not waste.
Any need with no plant covering it surfaces as "No plant covers: X" in the UI — that's the
signal you've added a species need without a matching plant.
