# lib/

Strict one-way layering. Never skip or reverse an arrow:

```
data/*.json → data.ts → engine/*  (pure)  → selectors.ts → store.tsx → components/
                                             ▲                 │
                                             └── reads AppState ┘
```

| File | Role |
|---|---|
| `types.ts` | domain types; mirrors generated `data/species.json` |
| `data.ts` | typed JSON loader + indexes (`getSpecies`, `getRuleset`, `periodRange`) |
| `engine/accuracy.ts` | reality layer: Period / Formation / hybrid |
| `engine/candidates.ts` | game layer: status, reason text, repairs, rank-by |
| `engine/plants.ts` | greedy set-cover over m² needs, via paint-brush yield rates |
| `engine/requirements.ts` | accuracy report, plants, terrain, fence, feeders, population |
| `selectors.ts` | `AppState` → engine inputs; splits out data drift |
| `store.tsx` | reducer + context + `localStorage` |
| `seed.ts` | first-run parks |
| `gallery-fixtures.ts` | isolated fixtures for `/states` only |

## Rules

- **`engine/*` is pure.** No React, no `window`, no store imports. It takes plain data and
  returns plain data. This is what makes it testable and what lets `/states` drive it directly.
- **Derived data is never stored.** Candidates and requirements are recomputed in `useMemo` from
  the roster; `isParkCustom` / `parkRulesetCount` are derived in `selectors.ts` from whether any
  enclosure overrides the park default. There is deliberately no `park.isCustom` field — a
  stored copy would drift the moment someone resets an override.
- **Unknown species are retained, never dropped.** `resolveRoster()` returns
  `{ members, unknown }`; `unknown` entries are speciesIds no longer in the dataset. They stay in
  the roster, render as a dashed "not in dataset" chip, and are excluded from scoring.
- **Roster entries are keyed by `speciesId`** and must be unique per enclosure.

## Invariants the engine must keep

These are behavioural contracts, not preferences — breaking one is a bug even if it compiles:

1. **Nothing is hidden.** Every lifestyle-compatible species is returned and scored. Filtering a
   species out of the candidate list is wrong; changing its status/order is right.
2. **A blocked row always offers a repair.** `suggestRepair()` prefers an accuracy-clean
   alternative, then falls back to merely conflict-free. Returning `undefined` when any viable
   option exists is a regression.
3. **Habitat is exclusive.** Once a roster exists, candidates are filtered to that lifestyle
   (`land`/`marine`/`aviary`). No mosasaurs in a land paddock.
4. **Area scales with population** via each species' real `areaNeedGrowth` %:
   `area × (1 + growth/100 × (pop − 1))`. This is what makes juvenile mode move the numbers —
   the dataset has no per-lifestage need rows, so don't invent them.
5. **Sandbox disables the whole reality axis** — no chips, no accuracy report.

## store.tsx

- Persist key `pa-state-v1`. Bump it if the `AppState` shape changes incompatibly, or returning
  users hydrate into a crash.
- Hydration pattern: server and first client render both use the seed, then a `useEffect` loads
  `localStorage`. Don't "optimise" this into a lazy initializer — that reintroduces a hydration
  mismatch.
- `<StoreProvider persist={false} initialState={...}>` is the isolated mode used by `/states`.
  Anything rendering fixtures must use it, or the gallery will overwrite the user's real parks.
