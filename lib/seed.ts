// ============================================================================
// Seed state — the parks a fresh install starts with. Species ids are real
// paleo.gg slugs and rosters respect the real like/dislike graph and social
// group sizes (e.g. T. rex genuinely dislikes Triceratops and Ankylosaurus,
// so it stands alone in Tyrant Basin).
// ============================================================================

import type { Park, Enclosure } from "./types";

export const SEED_PARKS: Park[] = [
  {
    id: "isla-sombra",
    name: "Isla Sombra",
    location: "Isla Sombra",
    rulesetId: "period-late-cretaceous",
    enclosureIds: [
      "tyrant-basin",
      "herbivore-plains",
      "raptor-paddock",
      "jurassic-annex",
      "sombra-lagoon",
    ],
    hatchery: ["parasaurolophus", "edmontosaurus", "carnotaurus", "pteranodon"],
  },
  {
    id: "nublar-sandbox",
    name: "Nublar Sandbox",
    location: "Isla Nublar",
    rulesetId: "sandbox",
    enclosureIds: ["morrison-bluffs", "new-paddock"],
    hatchery: ["allosaurus", "diplodocus"],
  },
];

export const SEED_ENCLOSURES: Record<string, Enclosure> = {
  // Solo apex predator — everything else in the era conflicts with it.
  "tyrant-basin": {
    id: "tyrant-basin",
    name: "Tyrant Basin",
    parkId: "isla-sombra",
    territories: 1,
    juvenileMode: "adults",
    roster: [
      { speciesId: "tyrannosaurusrex", count: 1, females: 0, males: 1, juveniles: 0 },
    ],
  },
  // A harmonious Late Cretaceous herbivore mix — all mutually liked.
  "herbivore-plains": {
    id: "herbivore-plains",
    name: "Herbivore Plains",
    parkId: "isla-sombra",
    territories: 2,
    juvenileMode: "adults",
    roster: [
      { speciesId: "triceratops", count: 3, females: 2, males: 1, juveniles: 0 },
      { speciesId: "ankylosaurus", count: 2, females: 1, males: 1, juveniles: 0 },
      { speciesId: "gallimimus", count: 6, females: 3, males: 3, juveniles: 0 },
    ],
  },
  "raptor-paddock": {
    id: "raptor-paddock",
    name: "Raptor Paddock",
    parkId: "isla-sombra",
    territories: 1,
    juvenileMode: "adults",
    roster: [{ speciesId: "velociraptor", count: 3, females: 2, males: 1, juveniles: 0 }],
  },
  // Late Jurassic animals inside a Late Cretaceous park — flagged anachronistic.
  "jurassic-annex": {
    id: "jurassic-annex",
    name: "Jurassic Annex",
    parkId: "isla-sombra",
    territories: 2,
    juvenileMode: "adults",
    roster: [{ speciesId: "brachiosaurus", count: 2, females: 1, males: 1, juveniles: 0 }],
  },
  "sombra-lagoon": {
    id: "sombra-lagoon",
    name: "Sombra Lagoon",
    parkId: "isla-sombra",
    territories: 1,
    juvenileMode: "adults",
    roster: [{ speciesId: "mosasaurus", count: 1, females: 1, males: 0, juveniles: 0 }],
  },
  "morrison-bluffs": {
    id: "morrison-bluffs",
    name: "Morrison Bluffs",
    parkId: "nublar-sandbox",
    territories: 2,
    juvenileMode: "adults",
    roster: [
      { speciesId: "brachiosaurus", count: 2, females: 1, males: 1, juveniles: 0 },
      { speciesId: "stegosaurus", count: 4, females: 2, males: 2, juveniles: 0 },
    ],
  },
  "new-paddock": {
    id: "new-paddock",
    name: "New Paddock",
    parkId: "nublar-sandbox",
    territories: 1,
    juvenileMode: "adults",
    roster: [],
  },
};

export const SEED_ACTIVE_PARK = "isla-sombra";
export const SEED_ACTIVE_ENCLOSURE = "herbivore-plains";
