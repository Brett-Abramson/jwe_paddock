# components/

All client components. They read state via `useApp()` and compute derived data with the pure
engine in `lib/engine/`. Put logic in the engine, not here.

## Design tokens — use these, never raw colors

Two skins (dark = production, light = reference) defined in `app/globals.css` as `--pa-*` CSS
variables under `:root`/`[data-theme="dark"]` and `[data-theme="light"]`, exposed to Tailwind via
`@theme inline`. Because they're `inline`, the runtime `data-theme` swap works — that's why the
indirection exists.

| Family | Utilities | Meaning |
|---|---|---|
| surfaces | `bg-app` `bg-panel` `bg-card` `bg-inset` `bg-banner` | frame → rail → card → chip |
| text | `text-ink` `text-ink2` `text-body` `text-muted` `text-faint` | strongest → weakest |
| lines | `border-line` `border-line2` `border-dash` | outer / inner / dashed |
| brand | `bg-cta` `text-cta-ink` `bg-brand` `text-link` | primary action, logo, links |
| ruleset | `rule-fill` `rule-ink` `rule-text` `rule-tint` `rule-line` | amber-gold (dark) / purple (light) |
| accuracy | `acc-*` | anachronism / hybrid amber |
| recommended | `ok-dot` `ok-text` `ok-tint` `ok-line` | green |
| blocked | `bad-*` | red — conflicts, violations, fence tier |
| marine | `sea-*` | blue — lagoon / aviary |
| juvenile | `juv-*` | teal — juvenile mode highlights |

Rules:

- **Never** `bg-red-500`, `#hex`, or inline `oklch(...)`. If you need a value that doesn't exist,
  add a role token to both skins in `globals.css` — don't inline it.
- A role may legitimately differ per skin (the ruleset accent is amber in dark, purple in light).
  That's why tokens are named by role, not colour.
- **Check both skins.** Toggle via the header control; a value hardcoded for dark usually becomes
  unreadable in light.
- Helper classes: `pa-eyebrow` (mono uppercase label), `pa-mono`, `pa-hazard` (stripe),
  `pa-card-shadow`, `pa-frame-shadow`, `pa-scroll` (thin scrollbars).

## Two layout gotchas that have bitten twice

1. **Flex children in a scrolling column need `shrink-0`.** The candidate rows and every Build
   Requirements card live in `flex flex-col overflow-y-auto` containers. Without `shrink-0` they
   compress to slivers and content silently disappears instead of scrolling.
2. **Never put an interactive element inside a `<Menu>` trigger.** `Menu` wraps its trigger in a
   `<button>`; nesting another button (as the variant picker once did) is invalid HTML and throws
   a hydration error. Render siblings inside a `<div>` chip and give the menu its own small
   trigger.

## Layout

`app-root.tsx` → hazard stripe · `ruleset-banner` · grid `[288px rail | workspace]`.
`workspace.tsx` → `enclosure-header` · optional `ConflictBanner` · grid `[1fr | 372px]`.

## Files worth knowing

- `ruleset-control.tsx` — the inherit → override-warning → Custom flow. The warning must fire
  **before** anything is applied, and only on the *first* clash (once the park is Custom,
  enclosures may already differ). Exports `shortRulesetLabel()`.
- `states/` — reusable §9 state components (`conflict-banner`, `single-species`, `empty-park`)
  used by both the live app and the gallery. Add new states here, not inline.
- `states-gallery.tsx` — `/states`. Renders **real components via the real engine** over
  `lib/gallery-fixtures.ts`, inside an isolated non-persisting store. Keep it that way: a static
  mock would rot, and a persisting store would clobber the user's parks.
- `ui/` — `menu`, `segmented`, `stepper` primitives. Reuse before writing a new one.
