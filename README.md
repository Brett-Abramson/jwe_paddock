# Paddock Atlas

A park & enclosure planning tool for **Jurassic World Evolution 3**. It answers the
question players actually sit down with — _"I have a park to fill: what goes where, and
what do I have to build to make it work?"_ — and produces a saveable **build order**.

Built from the design handoff in `Paddock Atlas Design Specification-handoff.zip`
(Claude Design). This repo implements **Build 1 — the functional workspace**: the park
master-detail shell and the signature enclosure workspace, wired to a live scoring engine
over the real **107-species paleo.gg dataset**, with local persistence and both skins.

## The three compatibility layers

Every competing tool models only the first. Paddock Atlas models all three and never
collapses them:

1. **Game** — will they fight? (likes / dislikes) → the left status dot + word.
2. **Environment** — can one enclosure serve both? (env-need overlap) → the plant plan.
3. **Reality** — did they ever actually meet? (co-occurrence / mya / canon) → the right
   accuracy chip. A species can be game-**Recommended** and reality-**Wrong**.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first tokens, `@theme inline`)
- **JSON data** (illustrative sample dataset)
- Client-side state with **localStorage** persistence — no backend

## Run it

```bash
npm run dev     # dev server (Turbopack)
npm run build   # production build
npm run lint    # eslint
```

Open the dev URL. On first load the app seeds two parks (a JP-1993-canon "Isla Sombra"
and a "Nublar Sandbox"); your edits persist to `localStorage`.

## What's built (Build 1)

- **Master-detail park rail** — park switcher, enclosure list with per-enclosure **health
  strips** (conflicts · fence tier · plant count · anachronisms), Hatchery + data-freshness
  markers. Create/switch parks and enclosures.
- **Enclosure workspace** — roster chips with an inline **variant picker** (flags non-canon
  models), a quiet **Juvenile** segmented toggle, and territory/period chips.
- **Live Candidates** — every species scored on both axes, nothing hidden: **Recommended /
  Allowed / Blocked** (left dot + word + plain-language reason) and a per-row **accuracy
  chip** (right). Recommended sorts to top; Blocked sorts last with an attached **repair**
  sub-row (`↳ Try X — why` + Swap-in). Rank-by (Appeal / Easiest / Canon fit / Family) and
  Strict mode.
- **Build Requirements** — derived live: **Accuracy report**, **Plant plan** (a set-cover
  optimizer), **Fence tier** (max security + driver), **Feeders**, **Population & sex**
  validation. Marine/aviary rosters swap plants+fence for lagoon/aviary infrastructure.
  Juvenile mode rewrites the plan and **highlights changed rows**.
- **Two skins** — the Classic Jurassic Park **dark** production skin (default) and the
  **light** reference skin, behind a flash-free toggle (`data-theme` + head script).
- **Data-drift handling** — a saved roster referencing a species no longer in the dataset
  is retained, flagged "not in dataset", and excluded from scoring.

- **Ruleset inheritance → override → Custom** (Turn 3) — an enclosure shows `🔗 {ruleset}
  · inherited from park`. Picking a clashing ruleset raises an amber warning **before
  anything is applied** ("…will convert {Park} to Custom so enclosures can differ") with
  Cancel / Convert to Custom. Once Custom, the park badge becomes a dashed
  **"Custom · N rulesets"**, every rail enclosure declares its own ruleset (🔗 inherited vs
  ⚑ overridden), and any enclosure can ↺ reset to re-inherit. `isParkCustom` is **derived**
  from the enclosures, so it can never drift from reality.
- **§9 states gallery** at [`/states`](http://localhost:3000/states) — see below.

## The states gallery (`/states`)

A live reference for every state a build has to handle. Crucially it is **not a static
mock**: each card renders the *real component* driven by the *real engine* over the real
dataset, from purpose-built fixtures in `lib/gallery-fixtures.ts`. Change a scoring rule and
the gallery changes with it, so it can't rot. It runs on an **isolated, non-persisting
store** (`<StoreProvider persist={false}>`), so clicking around in there never touches your
saved parks.

Covered: empty park · empty enclosure · blocked candidate (+repair) · anachronism ·
**lab hybrid** · conflict in roster · population violation · single-species · marine ·
aviary · juvenile mode · data drift.

Two deviations from the original §9 list, both forced by the data:

- **Wrong variant for canon era** is *not built* — the paleo.gg source has no model variants
  or canon eras. The gallery states this explicitly rather than faking it.
- **Lab hybrid** is a state the original spec didn't have: the real dataset contains 9
  engineered hybrids with no fossil record, which can't be judged against a timeline.

### Deferred

Drag-and-drop between enclosures (moving a species is currently a menu action), the Hatchery
and Species library surfaces, and persisting a saved build order.

## Project structure

```
app/
  layout.tsx            root layout — IBM Plex fonts + flash-free theme script
  globals.css           design tokens (dark + light) → Tailwind @theme
  page.tsx              renders <AppRoot/>
  states/page.tsx       the §9 states gallery
components/
  ruleset-control.tsx   enclosure ruleset: inherit → override warning → Custom
  states-gallery.tsx    live §9 reference
  states/               conflict-banner, single-species, empty-park
  app-root.tsx          StoreProvider + app frame (hazard stripe, banner, rail, workspace)
  ruleset-banner.tsx    park ruleset dropdown + brand + theme toggle
  park-rail.tsx         master-detail rail + health strips
  enclosure-header.tsx  title/chips, roster chips, variant picker, juvenile toggle
  candidates.tsx        dual-axis candidate rows + repairs + rank-by/strict
  build-requirements.tsx accuracy / plants / fence / feeders / population / marine
  workspace.tsx         composes header + candidates + requirements
  theme-toggle.tsx      skin switch (useSyncExternalStore over data-theme)
  ui/                   menu, segmented, stepper primitives
lib/
  types.ts              domain types (mirrors the Data Plan)
  data.ts               typed JSON loader + display helpers
  seed.ts               initial parks/enclosures
  store.tsx             reducer + context + localStorage persistence
  selectors.ts          resolve state → engine inputs (+ data-drift split)
  engine/
    accuracy.ts         reality layer (canon / formation / contemporaneity)
    candidates.ts       game layer + reasons + repairs + rank-by
    plants.ts           greedy set-cover over paint-brush yields
    requirements.ts     derived build requirements
scripts/
  ingest.mjs            paleo.gg scrape -> app dataset (+ data-quality report)
scraper/
  jwe3_scraper.py       paleo.gg DinoDB scraper
  jwe3_dinos.json       raw scrape (source of truth)
data/
  species.json          107 species — GENERATED, do not edit
  rulesets.json         sandbox / period / formation — GENERATED
  formations.json       dig-site formations — GENERATED
  manifest.json         freshness + provenance — GENERATED
  plants.json           plant brush → yield table (hand-curated)
  periods.json          geologic era → mya ranges
```

## Data pipeline

The app runs on **real scraped data** — 107 species from the
[paleo.gg DinoDB](https://www.paleo.gg/games/jurassic-world-evolution-3/dino-db)
(Source A in the Data Plan).

```
scraper/jwe3_scraper.py   →  scraper/jwe3_dinos.json   (raw scrape, source of truth)
        node scripts/ingest.mjs
                          →  data/species.json         (app schema, generated)
                          →  data/rulesets.json        (generated)
                          →  data/formations.json      (generated)
                          →  data/manifest.json        (generated)
```

Re-run `node scripts/ingest.mjs` after any re-scrape. **Never hand-edit the generated
files.** The ingest prints a data-quality report and applies these rules:

- The `"None"` sentinel is dropped; relationship names resolve to slugs (4,728 references,
  0 unresolved).
- **24 like/dislike contradictions** (a species both liked *and* disliked, e.g.
  Apatosaurus↔Brachiosaurus) resolve to **dislike wins** — a missed conflict is the
  dangerous error; a missed "like" only costs a nudge.
- Dig sites normalize to base formations ("Hell Creek Formation A" → "Hell Creek Formation").
- The 9 `Holocene` entries are **lab hybrids** (Indominus rex, Indoraptor, Scorpios rex…)
  with no fossil record, so they're flagged `isHybrid` and get a "⚠ Hybrid" chip instead of
  a meaningless "~83 my out of place".

`data/plants.json` is the one **hand-curated** file — paleo.gg publishes no flora database, so
it's authored from JWE3's plant-painting brushes: each plant produces one or more needs at once
at a rate (2x/3x, shown in-game as up-arrows) when its area is painted. The *needs* it satisfies
(Tall Nut, Ground Fiber, Arid, Wetland…) and their m² amounts are real; see
[data/AGENTS.md](data/AGENTS.md) for the yield model.

### What this source does not carry

The scrape is Source A only. It has **no canon film eras, no in-game model variants, and no
precise mya ranges** — that's Source B (the FatherMC accuracy guide). Consequently:

- Canon-era rulesets and the variant picker are **not built**; the reality layer runs on
  real geologic `Era` + real dig-site formations instead (Period and Formation rulesets).
- "N my out of place" is computed from period midpoints, so it's era-granular, not exact.

Dropping in Source B would restore canon rulesets, variants and exact mya without changing
the engine's shape.

## Notes on design fidelity

- Colors are authored in **oklch** per the handoff, as role tokens so a value can differ
  per skin (e.g. the ruleset accent is amber-gold in dark, purple in light).
- Placeholder emoji from the mock (🗂 📚 🌊) are retained as markers; swap for an icon set
  (Lucide/Phosphor) when wiring the real design system.
- The Accuracy Report is **roster-focused** (contemporaneity, dig-site agreement, hybrids)
  rather than counting hypothetical candidates — a deliberate divergence from the mock that
  keeps the rail's "N anach." count and the report consistent.
- The mock's sample roster (T. rex + Triceratops + Ankylosaurus in one paddock) is **not
  viable on real data** — T. rex genuinely dislikes both. The seed park reflects the real
  relationship graph instead, so T. rex stands alone in Tyrant Basin.
- Juvenile mode drives the real **`Area Need Growth`** mechanic (needs scale with
  population) rather than per-lifestage need rows, which this source doesn't carry.

Not affiliated with Frontier Developments or Universal. Original, unbranded.
