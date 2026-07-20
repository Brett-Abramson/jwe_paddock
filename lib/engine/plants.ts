// ============================================================================
// Plant plan — a greedy set-cover over the roster's combined paleobotany/
// terrain-paint needs against the plant -> yield table. JWE3 paints an area
// with a plant brush and that single stroke produces every need in the
// plant's `provides` list simultaneously, each at its own rate (m² of need
// satisfied per m² painted). The greedy pass picks the plant touching the
// most still-unsatisfied needs, paints enough to fully satisfy the largest
// of them (over-supplying the rest), and repeats.
//
// Needs and their areas are real (paleo.gg). The plant -> yield table is
// hand-curated from the game's brush categories: paleo.gg publishes no flora
// database, and JWE3 doesn't publish exact yield numbers either — "+"/"++"
// are read literally as a 2x/3x rate multiplier. See data/AGENTS.md.
// ============================================================================

import type { Plant } from "../types";

export interface NeedAmount {
  need: string;
  area: number;
}

export interface PlantSupply {
  need: string;
  /** m² of this need satisfied by this pick */
  area: number;
}

export interface PlantPick {
  plant: Plant;
  /** needs this pick supplies, and how much of each */
  supplies: PlantSupply[];
  /** m² of this plant to paint */
  paintArea: number;
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
 * Greedy minimum set-cover over paint area. Ties are broken by the plant's
 * order in `plants`, so the data file order is the deterministic tie-break.
 */
export function optimizePlants(needs: NeedAmount[], plants: Plant[]): PlantPlan {
  const remaining = new Map(needs.map((n) => [n.need, n.area]));
  const picks: PlantPick[] = [];

  while (remaining.size > 0) {
    let best: Plant | undefined;
    let bestTargets: { need: string; rate: number }[] = [];

    for (const plant of plants) {
      const targets = plant.provides.filter((p) => remaining.has(p.need));
      if (targets.length > bestTargets.length) {
        best = plant;
        bestTargets = targets;
      }
    }
    if (!best || bestTargets.length === 0) break;

    const paintArea = Math.max(
      ...bestTargets.map((t) => (remaining.get(t.need) ?? 0) / t.rate),
    );
    const supplies: PlantSupply[] = [];
    for (const t of bestTargets) {
      const left = remaining.get(t.need) ?? 0;
      const produced = paintArea * t.rate;
      supplies.push({ need: t.need, area: Math.min(produced, left) });
      const remainder = left - produced;
      if (remainder <= 0.001) remaining.delete(t.need);
      else remaining.set(t.need, remainder);
    }
    picks.push({ plant: best, supplies, paintArea });
  }

  return {
    picks,
    needs,
    uncovered: [...remaining.keys()],
    plantCount: picks.length,
    needCount: needs.length,
    totalArea: needs.reduce((sum, n) => sum + n.area, 0),
  };
}
