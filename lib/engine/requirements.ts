// ============================================================================
// Build Requirements — derived live from the roster + ruleset + juvenile mode.
// Cards: accuracy report, plant plan (set-cover over real m² needs), terrain,
// fence tier, feeders, population validation. Marine/aviary rosters swap
// plants+fence for lagoon/aviary infrastructure.
//
// Area needs scale with population using the species' real `areaNeedGrowth`
// (paleo.gg "Area Need Growth"), which is what makes juvenile mode move the
// numbers — the source has no per-lifestage need rows.
// ============================================================================

import type { Species, Ruleset, Plant, Lifestyle } from "../types";
import { enclosurePeriod, sharedFormations } from "./accuracy";
import { optimizePlants, type NeedAmount, type PlantPick, type PlantPlan } from "./plants";

export interface RosterMember {
  species: Species;
  count: number;
  females: number;
  males: number;
  juveniles: number;
}

export type Tone = "ok" | "warn" | "bad";

export interface ReportLine {
  /** "hybrid" is a distinct case from "warn": synthetic/no fossil record, not out-of-place-in-time */
  tone: "ok" | "warn" | "hybrid";
  text: string;
}
export interface AccuracyReport {
  applies: boolean;
  label?: string;
  lines: ReportLine[];
  anachronismCount: number;
}

export interface PlantRow extends PlantPick {
  changed: boolean;
}
export interface TerrainRow {
  need: string;
  area: number;
  changed: boolean;
}
export interface FenceReq {
  tier: number;
  driver?: string;
}
export interface FeederRow {
  label: string;
  detail: string;
}
export interface PopulationRow {
  speciesId: string;
  name: string;
  tone: Tone;
  requirement: string;
  detail?: string;
  countLabel: string;
}
export interface MarineReq {
  kind: "marine" | "aviary";
  headline: string;
  chips: string[];
}

export interface BuildRequirements {
  lifestyle: Lifestyle;
  accuracy: AccuracyReport;
  plantPlan?: PlantPlan;
  plantRows: PlantRow[];
  terrain: TerrainRow[];
  fence?: FenceReq;
  feeders: FeederRow[];
  population: PopulationRow[];
  marine?: MarineReq;
  totalAnimals: number;
}

/** Feeding needs (Cover/Pasture/Arid/Barren/Wetland are habitat dressing, not feeders). */
export const GROUND_FEED = ["Ground Leaf", "Ground Fiber", "Ground Fruit", "Ground Nut"];
export const TALL_FEED = ["Tall Leaf", "Tall Fruit", "Tall Nut"];

// ---- population helpers ----------------------------------------------------

/** Total animals for a member (adults + juveniles). */
function population(m: RosterMember): number {
  return m.count + m.juveniles;
}

/** Area scales with population by the species' own growth rate. */
function scaledArea(base: number, growthPct: number, pop: number): number {
  return base * (1 + (growthPct / 100) * Math.max(0, pop - 1));
}

/** Aggregate the roster's needs of one kind into total m² per need. */
function aggregateNeeds(
  members: RosterMember[],
  kind: "plant" | "terrain",
): NeedAmount[] {
  const totals = new Map<string, number>();
  for (const m of members) {
    const pop = population(m);
    for (const n of m.species.envNeeds) {
      if (n.kind !== kind) continue;
      const area = scaledArea(n.area, m.species.areaNeedGrowth, pop);
      totals.set(n.need, (totals.get(n.need) ?? 0) + area);
    }
  }
  return [...totals.entries()]
    .map(([need, area]) => ({ need, area }))
    .sort((a, b) => b.area - a.area);
}

// ---- terrain space plan ----------------------------------------------------

/** Role buckets for the space plan / species-detail swatches. Not literal
 * ground types — a colour role each real env-need label maps to. "crop" is
 * the game's own "Leaf, Fiber, Fruit & Nut" brush category (feeder paleobotany
 * — ground it stands on AND what it eats, unlike Meat/Prey/Fish feeders). */
export type Biome = "forest" | "grass" | "sand" | "rock" | "wetland" | "water" | "crop";

export interface SpacePlanRow {
  /** label for this ground patch — a real need, or (for a plant pick that
   * yields several needs from one physical footprint) those needs joined,
   * matching the Plant plan card's own "Ground Fiber + Ground Fruit" style */
  need: string;
  biome: Biome;
  /** real m² this patch occupies (painted area for plant rows) */
  area: number;
  /** share of total ground, 0–100 (rounded) */
  pct: number;
}

/** Which biome colour a need paints, or null if it isn't ground cover. */
export function biomeForNeed(need: string): Biome | null {
  switch (need) {
    case "Cover":
      return "forest";
    case "Pasture":
      return "grass";
    case "Arid":
      return "sand";
    case "Barren":
      return "rock";
    case "Wetland":
      return "wetland";
    case "Water":
    case "Open Water":
    case "Deep Water":
      return "water";
    case "Ground Leaf":
    case "Tall Leaf":
    case "Ground Fiber":
    case "Tall Fiber":
    case "Ground Fruit":
    case "Tall Fruit":
    case "Ground Nut":
    case "Tall Nut":
      return "crop";
    default:
      return null;
  }
}

/**
 * Terrain space plan — the share of enclosure ground each biome must cover to
 * suit every resident, aggregated with all animals (adults + juveniles). Folds in the
 * Plant plan (this is meant to help divvy up the enclosure, so painted flora
 * has to count as ground too): each plant pick's real `paintArea` — not the
 * raw need totals — since one painted patch can satisfy several needs at
 * once and isn't painted twice. Real dug terrain (Water…) is added straight
 * from the roster's needs. Derived live; nothing here is invented.
 */
export function terrainSpacePlan(
  members: RosterMember[],
  plants: Plant[],
): SpacePlanRow[] {
  const merged = new Map<string, { biome: Biome; area: number }>();
  const add = (need: string, biome: Biome | null, area: number) => {
    if (!biome || area <= 0) return;
    const existing = merged.get(need);
    if (existing) existing.area += area;
    else merged.set(need, { biome, area });
  };

  const plantPlan = optimizePlants(aggregateNeeds(members, "plant"), plants);
  for (const pick of plantPlan.picks) {
    // one physical patch can yield >1 need (e.g. a Swamp pick also gives some
    // Cover) — colour it by whichever need it supplies the most of, so the
    // footprint is counted once, not split across two biomes.
    const dominant = [...pick.supplies].sort((a, b) => b.area - a.area)[0];
    add(pick.supplies.map((s) => s.need).join(" + "), biomeForNeed(dominant.need), pick.paintArea);
  }
  for (const n of aggregateNeeds(members, "terrain")) {
    add(n.need, biomeForNeed(n.need), n.area);
  }

  const total = [...merged.values()].reduce((sum, r) => sum + r.area, 0);
  if (total === 0) return [];
  return [...merged.entries()]
    .map(([need, r]) => ({ need, biome: r.biome, area: r.area, pct: Math.round((r.area / total) * 100) }))
    .sort((a, b) => b.area - a.area);
}

function rosterLifestyle(members: RosterMember[]): Lifestyle {
  if (members.some((m) => m.species.lifestyle === "marine")) return "marine";
  if (members.some((m) => m.species.lifestyle === "aviary")) return "aviary";
  return "land";
}

export interface RosterConflict {
  a: Species;
  b: Species;
  /** the species doing the disliking, for the plain-language reason */
  disliker: Species;
  disliked: Species;
}

/**
 * Dislike pairs *within* a roster. Only reachable by moving a species in —
 * Candidates never offer a conflicting one.
 */
export function rosterConflicts(members: RosterMember[]): RosterConflict[] {
  const out: RosterConflict[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i].species;
      const b = members[j].species;
      if (a.dislikes.includes(b.id)) out.push({ a, b, disliker: a, disliked: b });
      else if (b.dislikes.includes(a.id)) out.push({ a, b, disliker: b, disliked: a });
    }
  }
  return out;
}

export function conflictPairs(members: RosterMember[]): number {
  let n = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i].species;
      const b = members[j].species;
      if (a.dislikes.includes(b.id) || b.dislikes.includes(a.id)) n++;
    }
  }
  return n;
}

// ---- sections --------------------------------------------------------------

function buildAccuracyReport(members: RosterMember[], ruleset: Ruleset): AccuracyReport {
  if (ruleset.kind === "sandbox" || ruleset.kind === "custom" || members.length === 0) {
    return { applies: false, lines: [], anachronismCount: 0 };
  }
  const species = members.map((m) => m.species);
  const lines: ReportLine[] = [];

  if (ruleset.kind === "formation" && ruleset.formation) {
    const short = ruleset.formation.replace(/\s+Formation$/, "");
    const wrong = species.filter((s) => !s.formations.includes(ruleset.formation!));
    if (wrong.length === 0) {
      lines.push({ tone: "ok", text: `All roster species are excavated from ${short}` });
    } else {
      lines.push({
        tone: "warn",
        text: `${wrong.length} not found in ${short} — ${wrong.map((s) => s.name).join(", ")}`,
      });
    }
    const periods = [...new Set(species.map((s) => s.period))];
    lines.push(
      periods.length === 1
        ? { tone: "ok", text: `Roster: contemporary within ${periods[0]}` }
        : { tone: "warn", text: `Roster spans ${periods.length} periods — ${periods.join(", ")}` },
    );
    return { applies: true, label: short, lines, anachronismCount: wrong.length };
  }

  // period ruleset (or roster-relative)
  const hybrids = species.filter((s) => s.isHybrid);
  const real = species.filter((s) => !s.isHybrid);
  const reference = ruleset.period ?? enclosurePeriod(real.length ? real : species);
  const outliers = real.filter((s) => s.period !== reference);

  if (outliers.length === 0) {
    lines.push({ tone: "ok", text: `Roster: contemporary within ${reference}` });
  } else {
    lines.push({
      tone: "warn",
      text: `${outliers.length} species outside ${reference} — ${outliers
        .map((s) => `${s.name} (${s.period})`)
        .join(", ")}`,
    });
  }
  if (hybrids.length > 0) {
    lines.push({
      tone: "hybrid",
      text: `${hybrids.length} lab hybrid${hybrids.length > 1 ? "s" : ""} — no fossil record (${hybrids
        .map((s) => s.name)
        .join(", ")})`,
    });
  }
  const shared = sharedFormations(species);
  if (shared.length > 0) {
    lines.push({
      tone: "ok",
      text: `Shares a dig site: ${shared[0].replace(/\s+Formation$/, "")}`,
    });
  }
  return {
    applies: true,
    label: reference,
    lines,
    anachronismCount: outliers.length + hybrids.length,
  };
}

function buildPopulation(members: RosterMember[]): PopulationRow[] {
  return members.map((m) => {
    const s = m.species;
    const parts: string[] = [];
    if (s.minPopulation > 1) parts.push(`${s.minPopulation}+`);
    if (s.socialGroupMax != null) parts.push(`group ≤${s.socialGroupMax}`);
    if (s.maxFemales != null) parts.push(`max ${s.maxFemales} ♀`);
    if (s.maxMales != null) parts.push(`max ${s.maxMales} ♂`);
    if (s.maxJuveniles != null) parts.push(`max ${s.maxJuveniles} juveniles`);
    const requirement = parts.length ? parts.join(", ") : "solo ok";

    let tone: Tone = "ok";
    let detail: string | undefined;
    const total = m.count + m.juveniles;
    let countLabel = `${total} ✓`;

    if (m.count < s.minPopulation) {
      tone = "bad";
      detail = `Planned ${m.count} adults · needs at least ${s.minPopulation}.`;
      countLabel = `${m.count}`;
    } else if (s.maxFemales != null && m.females > s.maxFemales) {
      tone = "bad";
      detail = `Planned ${m.females} ♀ · you'll never breed. Reduce to ${s.maxFemales} ♀.`;
      countLabel = `${m.females} ♀`;
    } else if (s.maxMales != null && m.males > s.maxMales) {
      tone = "bad";
      detail = `Planned ${m.males} ♂ · reduce to ${s.maxMales} ♂.`;
      countLabel = `${m.males} ♂`;
    } else if (s.maxJuveniles != null && m.juveniles > s.maxJuveniles) {
      tone = "bad";
      detail = `Planned ${m.juveniles} juveniles · max is ${s.maxJuveniles}.`;
      countLabel = `${m.juveniles} juveniles`;
    } else if (s.socialGroupMax != null && total > s.socialGroupMax) {
      tone = "warn";
      detail = `Social group tops out at ${s.socialGroupMax}; ${total} may stress the herd.`;
    }
    return { speciesId: s.id, name: s.name, tone, requirement, detail, countLabel };
  });
}

function buildFeeders(members: RosterMember[]): FeederRow[] {
  const rows: FeederRow[] = [];
  const needSet = new Set(members.flatMap((m) => m.species.envNeeds.map((n) => n.need)));
  const named = (list: string[]) =>
    members
      .filter((m) => m.species.envNeeds.some((n) => list.includes(n.need)))
      .map((m) => m.species.name);

  if (GROUND_FEED.some((n) => needSet.has(n)))
    rows.push({ label: "Ground paleobotany", detail: named(GROUND_FEED).join(", ") });
  if (TALL_FEED.some((n) => needSet.has(n)))
    rows.push({ label: "Tall paleobotany", detail: named(TALL_FEED).join(", ") });
  if (needSet.has("Meat"))
    rows.push({ label: "Carnivore feeder", detail: named(["Meat"]).join(", ") });
  if (needSet.has("Prey"))
    rows.push({ label: "Live prey", detail: named(["Prey"]).join(", ") });
  if (needSet.has("Fish"))
    rows.push({ label: "Fish feeder", detail: named(["Fish"]).join(", ") });
  return rows;
}

function buildMarine(members: RosterMember[], lifestyle: "marine" | "aviary"): MarineReq {
  const anchor = [...members].sort((a, b) => b.species.appeal - a.species.appeal)[0];
  const totalArea = members.reduce((sum, m) => {
    const pop = population(m);
    return (
      sum +
      m.species.envNeeds
        .filter((n) => n.kind === "terrain")
        .reduce((s, n) => s + scaledArea(n.area, m.species.areaNeedGrowth, pop), 0)
    );
  }, 0);
  const fish = members.filter((m) => m.species.envNeeds.some((n) => n.need === "Fish")).length;

  if (lifestyle === "marine") {
    return {
      kind: "marine",
      headline: `Lagoon — ${anchor?.species.name ?? "marine"}`,
      chips: [
        `Open water ≥ ${Math.round(totalArea).toLocaleString()} m²`,
        fish ? `Fish feeder ×${Math.max(1, fish)}` : "Feeder",
        "Depth zones",
      ],
    };
  }
  return {
    kind: "aviary",
    headline: `Aviary — ${anchor?.species.name ?? "flyer"}`,
    chips: [
      `Dome ≥ ${Math.round(totalArea).toLocaleString()} m²`,
      fish ? `Fish feeder ×${Math.max(1, fish)}` : "Feeder",
      "High perches",
    ],
  };
}

// ---- main ------------------------------------------------------------------

export function buildRequirements(
  members: RosterMember[],
  ruleset: Ruleset,
  plants: Plant[],
): BuildRequirements {
  const lifestyle = members.length ? rosterLifestyle(members) : "land";
  const accuracy = buildAccuracyReport(members, ruleset);
  const population_ = buildPopulation(members);
  const totalAnimals = members.reduce((n, m) => n + population(m), 0);

  const plantNeeds = aggregateNeeds(members, "plant");
  const terrainNeeds = aggregateNeeds(members, "terrain");

  let plantPlan: PlantPlan | undefined;
  let plantRows: PlantRow[] = [];
  let terrain: TerrainRow[] = [];

  if (lifestyle === "land") {
    plantPlan = optimizePlants(plantNeeds, plants);
    plantRows = plantPlan.picks.map((p) => ({
      ...p,
      changed: false,
    }));

    terrain = terrainNeeds.map((n) => ({
      need: n.need,
      area: n.area,
      changed: false,
    }));
  }

  const feeders = buildFeeders(members);

  let fence: FenceReq | undefined;
  if (lifestyle === "land" && members.length) {
    let tier = -1;
    let driver: string | undefined;
    for (const m of members) {
      if (m.species.security > tier) {
        tier = m.species.security;
        driver = m.species.name;
      }
    }
    fence = { tier: Math.max(0, tier), driver };
  }

  const marine =
    lifestyle !== "land" && members.length ? buildMarine(members, lifestyle) : undefined;

  return {
    lifestyle,
    accuracy,
    plantPlan,
    plantRows,
    terrain,
    fence,
    feeders,
    population: population_,
    marine,
    totalAnimals,
  };
}

// ---- rail health strip -----------------------------------------------------

export interface EnclosureHealth {
  conflicts: number;
  fenceTier: number;
  plantCount: number;
  anachronismCount: number;
  lifestyle: Lifestyle;
}

export function enclosureHealth(
  members: RosterMember[],
  ruleset: Ruleset,
  plants: Plant[],
): EnclosureHealth {
  const req = buildRequirements(members, ruleset, plants);
  return {
    conflicts: conflictPairs(members),
    fenceTier: req.fence?.tier ?? 0,
    plantCount: req.plantPlan?.plantCount ?? 0,
    anachronismCount: req.accuracy.anachronismCount,
    lifestyle: req.lifestyle,
  };
}
