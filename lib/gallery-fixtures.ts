// ============================================================================
// Fixtures for the §9 states gallery (/states).
//
// These build an ISOLATED store (never persisted) whose enclosures each land
// the app in one documented state. Everything is real: real species ids, the
// real like/dislike graph, the real engine. The gallery is living
// documentation, not a static mock — if the engine changes, it changes here.
// ============================================================================

import type { AppState } from "./store";
import type { Enclosure, Park } from "./types";

const PARK_ID = "gallery-park";

const enclosure = (
  id: string,
  name: string,
  roster: Enclosure["roster"],
  extra: Partial<Enclosure> = {},
): Enclosure => ({
  id,
  name,
  parkId: PARK_ID,
  roster,
  juvenileMode: "adults",
  territories: 1,
  ...extra,
});

const entry = (
  speciesId: string,
  count: number,
  females: number,
  males: number,
  juveniles = 0,
) => ({ speciesId, count, females, males, juveniles });

export const GALLERY_ENCLOSURE_IDS = {
  empty: "g-empty",
  conflict: "g-conflict",
  population: "g-population",
  single: "g-single",
  marine: "g-marine",
  aviary: "g-aviary",
  juvenile: "g-juvenile",
  drift: "g-drift",
  anachronism: "g-anachronism",
} as const;

export function galleryState(): AppState {
  const enclosures: Record<string, Enclosure> = {
    // "Everything is Recommended" — where players start
    [GALLERY_ENCLOSURE_IDS.empty]: enclosure(GALLERY_ENCLOSURE_IDS.empty, "New Enclosure", []),

    // T. rex genuinely dislikes Triceratops — only reachable by moving one in
    [GALLERY_ENCLOSURE_IDS.conflict]: enclosure(GALLERY_ENCLOSURE_IDS.conflict, "Tyrant Basin", [
      entry("tyrannosaurusrex", 1, 0, 1),
      entry("triceratops", 3, 2, 1),
    ]),

    // Mosasaurus caps at 1 female — planning 2 is the silent never-breed failure
    [GALLERY_ENCLOSURE_IDS.population]: enclosure(
      GALLERY_ENCLOSURE_IDS.population,
      "Sombra Lagoon",
      [entry("mosasaurus", 2, 2, 0)],
    ),

    // Large carnivore standing alone — complete, not unfinished
    [GALLERY_ENCLOSURE_IDS.single]: enclosure(GALLERY_ENCLOSURE_IDS.single, "Spinosaur Ridge", [
      entry("spinosaurus", 1, 0, 1),
    ]),

    [GALLERY_ENCLOSURE_IDS.marine]: enclosure(GALLERY_ENCLOSURE_IDS.marine, "Deep Lagoon", [
      entry("mosasaurus", 1, 1, 0),
      entry("plesiosaurus", 2, 1, 1),
    ]),
    [GALLERY_ENCLOSURE_IDS.aviary]: enclosure(GALLERY_ENCLOSURE_IDS.aviary, "North Aviary", [
      entry("pteranodon", 2, 1, 1),
      entry("dimorphodon", 2, 1, 1),
    ]),

    // Juveniles count toward population, so every area requirement grows
    [GALLERY_ENCLOSURE_IDS.juvenile]: enclosure(
      GALLERY_ENCLOSURE_IDS.juvenile,
      "Brachiosaur Meadow",
      [entry("brachiosaurus", 2, 1, 1, 2), entry("stegosaurus", 3, 2, 1, 2)],
      { juvenileMode: "juveniles" },
    ),

    // A saved plan referencing a species no longer in the dataset
    [GALLERY_ENCLOSURE_IDS.drift]: enclosure(GALLERY_ENCLOSURE_IDS.drift, "Restored Plan", [
      entry("triceratops", 3, 2, 1),
      entry("titanosaurus-classic", 2, 1, 1),
    ]),

    // Late Jurassic animals inside a Late Cretaceous park
    [GALLERY_ENCLOSURE_IDS.anachronism]: enclosure(
      GALLERY_ENCLOSURE_IDS.anachronism,
      "Jurassic Annex",
      [entry("triceratops", 3, 2, 1)],
    ),
  };

  const park: Park = {
    id: PARK_ID,
    name: "Isla Sombra",
    location: "Isla Sombra",
    rulesetId: "period-late-cretaceous",
    enclosureIds: Object.keys(enclosures),
    hatchery: [],
  };

  // a second, deliberately empty park for the "empty park" invitation
  const emptyPark: Park = {
    id: "gallery-empty-park",
    name: "Isla Nublar",
    location: "Isla Nublar",
    rulesetId: "sandbox",
    enclosureIds: [],
    hatchery: [],
  };

  return {
    parks: [park, emptyPark],
    enclosures,
    activeParkId: PARK_ID,
    activeEnclosureId: GALLERY_ENCLOSURE_IDS.conflict,
    settings: { strict: false, rankBy: "appeal" },
  };
}
