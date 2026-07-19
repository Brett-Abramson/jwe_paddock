// ============================================================================
// Plant plan — a greedy set-cover over the roster's combined paleobotany needs
// against the plant -> needs table. Minimises the number of distinct plant
// species while reporting the real m² each one has to satisfy.
//
// Needs and their areas are real (paleo.gg). The plant -> needs table is
// hand-curated: paleo.gg publishes no flora database.
// ============================================================================

import type { Plant } from "../types";

export interface NeedAmount {
  need: string;
  area: number;
}

export interface PlantPick {
  plant: Plant;
  /** required needs this plant covers */
  covers: string[];
  /** combined m² of the needs it covers */
  area: number;
}

export interface PlantPlan {
  picks: PlantPick[];
  needs: NeedAmount[];
  /** needs no available plant can satisfy */
  uncovered: string[];
  plantCount: number;
  needCount: number;
  totalArea: number;
}

/**
 * Greedy minimum set-cover. Ties are broken by the plant's order in `plants`,
 * so the data file order is the deterministic tie-break.
 */
export function optimizePlants(needs: NeedAmount[], plants: Plant[]): PlantPlan {
  const areaByNeed = new Map(needs.map((n) => [n.need, n.area]));
  const remaining = new Set(areaByNeed.keys());
  const picks: PlantPick[] = [];

  while (remaining.size > 0) {
    let best: Plant | undefined;
    let bestNew: string[] = [];
    for (const plant of plants) {
      const gained = plant.covers.filter((c) => remaining.has(c));
      if (gained.length > bestNew.length) {
        best = plant;
        bestNew = gained;
      }
    }
    if (!best || bestNew.length === 0) break;
    for (const c of bestNew) remaining.delete(c);
    picks.push({
      plant: best,
      covers: bestNew,
      area: bestNew.reduce((sum, c) => sum + (areaByNeed.get(c) ?? 0), 0),
    });
  }

  return {
    picks,
    needs,
    uncovered: [...remaining],
    plantCount: picks.length,
    needCount: areaByNeed.size,
    totalArea: needs.reduce((sum, n) => sum + n.area, 0),
  };
}
