// ============================================================================
// Paddock Atlas — domain types
// Species/plant shapes mirror data/species.json, which is GENERATED from the
// paleo.gg scrape by scripts/ingest.mjs. Do not hand-edit the dataset.
//
// Not in the paleo.gg source (so absent here): canon film eras, in-game model
// variants, precise mya ranges, and a "lived alongside" graph. The reality
// layer therefore runs on geologic Period + dig-site Formation.
// ============================================================================

export type Lifestyle = "land" | "marine" | "aviary";

/** How a need is satisfied: by flora, by a feeder, or by terrain/water. */
export type NeedKind = "plant" | "food" | "terrain";

export interface EnvNeed {
  /** e.g. "Tall Nut", "Cover", "Wetland" */
  need: string;
  /** required area in m² for the base population */
  area: number;
  /** share of enclosure area, when the source gives one */
  pct?: number;
  kind: NeedKind;
}

export interface Species {
  id: string;
  name: string;
  family: string;
  genus?: string;
  bioGroup?: string;
  lifestyle: Lifestyle;
  /** geologic era, e.g. "Late Cretaceous" */
  period: string;
  /** genetically engineered hybrid — no fossil record to be accurate against */
  isHybrid?: boolean;

  appeal: number;
  appealPerHectare?: number;
  dominance?: number;
  /** fence tier driver; enclosure tier = max(security) across the roster */
  security: number;

  /** feeder-facing diet tokens, e.g. ["Tall Paleobotany"], ["Carnivore","Live Prey"] */
  diet: string[];
  size?: string;
  heightM?: number;
  lengthM?: number;
  weightKg?: number;

  comfort?: string;
  envNeeds: EnvNeed[];
  /** % the area requirement grows per additional animal */
  areaNeedGrowth: number;

  socialGroupMin?: number;
  socialGroupMax?: number;
  minPopulation: number;
  maxMales?: number;
  maxFemales?: number;
  maxJuveniles?: number;

  /** speciesIds; a clash (both liked and disliked) is resolved to dislike at ingest */
  likes: string[];
  dislikes: string[];

  nestSize?: string;
  nestLocation?: string;

  /** real dig-site formations this species is excavated from */
  formations: string[];
  continents: string[];

  releaseVersion?: string;
  imageUrl?: string;
  description?: string;
}

/** The four brush categories JWE3's plant-painting tool groups flora/terrain into. */
export type PlantCategory =
  | "Leaf, Fiber, Fruit & Nut"
  | "Cover & Pasture"
  | "Arid & Barren"
  | "Wetland";

export interface PlantYield {
  /** env-need label this produces when painted, e.g. "Ground Leaf" */
  need: string;
  /** m² of need satisfied per m² painted — the in-game "+" tier is 2, "++" is 3 */
  rate: number;
}

export interface Plant {
  id: string;
  name: string;
  category: PlantCategory;
  /** what painting this plant produces, and at what rate; one paint area can yield several */
  provides: PlantYield[];
}

export type RulesetKind = "sandbox" | "period" | "formation" | "custom";

export interface Ruleset {
  id: string;
  kind: RulesetKind;
  label: string;
  /** for period rulesets: the geologic era matched against Species.period */
  period?: string;
  /** for formation rulesets: matched against Species.formations */
  formation?: string;
  note?: string;
}

// ---- user state (persisted) ----

export interface RosterEntry {
  speciesId: string;
  count: number;
  females: number;
  males: number;
  juveniles: number;
}

export interface Enclosure {
  id: string;
  name: string;
  parkId: string;
  roster: RosterEntry[];
  /** Effective ruleset = rulesetOverrideId ?? park.rulesetId. */
  rulesetOverrideId?: string;
  territories: number;
}

export interface Park {
  id: string;
  name: string;
  location?: string;
  rulesetId: string;
  enclosureIds: string[];
  hatchery: string[];
}

export interface DataManifest {
  asOf: string;
  source: string;
  speciesCount: number;
}

/** A single enclosure's build, portable enough to round-trip through a URL. */
export interface SharedBuild {
  name: string;
  rulesetId: string;
  territories: number;
  roster: RosterEntry[];
}
