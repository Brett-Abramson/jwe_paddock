import type { Biome } from "@/lib/engine";

/** Role CSS var each biome bucket paints with — Terrain space plan bar,
 * legend swatches, and the species-detail "Terrain & water" rows. Defined
 * once so the panel and the detail popover stay in visual sync. */
export const BIOME_VAR: Record<Biome, string> = {
  forest: "var(--pa-biome-forest)",
  grass: "var(--pa-biome-grass)",
  sand: "var(--pa-biome-sand)",
  rock: "var(--pa-biome-rock)",
  wetland: "var(--pa-biome-wetland)",
  water: "var(--pa-biome-water)",
  crop: "var(--pa-biome-crop)",
};
