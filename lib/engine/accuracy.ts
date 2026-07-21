// ============================================================================
// Reality layer — the accuracy axis, orthogonal to the game (likes/dislikes)
// axis. A species can be game-Recommended and reality-Wrong, so this never
// collapses into the game status.
//
// The paleo.gg source has no film-canon or mya data, so "reality" here means:
//   - Period ruleset    -> does the species belong to this geologic era?
//   - Formation ruleset -> is it excavated from this dig-site formation?
//   - otherwise         -> is it contemporary with the rest of the roster?
// ============================================================================

import type { Species, Ruleset } from "../types";
import { periodMidpoint } from "../data";

export type AccuracyTone = "ok" | "warn" | "none";

export interface Accuracy {
  /** false under Sandbox — no chip, no report */
  applies: boolean;
  tone: AccuracyTone;
  /** short chip label, e.g. "✓ Contemporary" / "⚠ Anachronism" / "🧬 Hybrid" */
  chip: string;
  /** shares the reference period */
  contemporary: boolean;
  /** shares the ruleset's dig-site formation */
  sharesFormation: boolean;
  /** millions of years out of place, when anachronistic and computable */
  offMy?: number;
  /** a lab hybrid — flagged, but not "out of place in time" */
  hybrid?: boolean;
}

/** Most common period across roster species — the enclosure's Period chip. */
export function enclosurePeriod(roster: Species[]): string | undefined {
  if (roster.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const s of roster) counts.set(s.period, (counts.get(s.period) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Dig-site formations shared by every roster member, if any. */
export function sharedFormations(roster: Species[]): string[] {
  if (roster.length === 0) return [];
  return roster
    .map((s) => s.formations)
    .reduce((acc, f) => acc.filter((x) => f.includes(x)));
}

function offBy(a: string, b: string): number | undefined {
  const ma = periodMidpoint(a);
  const mb = periodMidpoint(b);
  if (ma == null || mb == null) return undefined;
  return Math.round(Math.abs(ma - mb));
}

/**
 * Evaluate the accuracy axis for a species against the roster + ruleset.
 * `roster` excludes the species itself.
 */
export function evalAccuracy(
  species: Species,
  roster: Species[],
  ruleset: Ruleset,
  period?: string,
): Accuracy {
  const none: Accuracy = {
    applies: false,
    tone: "none",
    chip: "",
    contemporary: false,
    sharesFormation: false,
  };
  if (ruleset.kind === "sandbox" || ruleset.kind === "custom") return none;

  // A lab hybrid has no fossil record, so a time/formation comparison is
  // meaningless — flag it as synthetic instead of "N my out of place".
  if (species.isHybrid) {
    return {
      applies: true,
      tone: "warn",
      chip: "🧬 Hybrid",
      contemporary: false,
      sharesFormation: false,
      hybrid: true,
    };
  }

  const reference = ruleset.period ?? period ?? enclosurePeriod(roster);

  if (ruleset.kind === "formation" && ruleset.formation) {
    const shares = species.formations.includes(ruleset.formation);
    const contemporary = !!reference && species.period === reference;
    if (shares) {
      return {
        applies: true,
        tone: "ok",
        chip: "✓ Contemporary",
        contemporary,
        sharesFormation: true,
      };
    }
    return {
      applies: true,
      tone: "warn",
      chip: "⚠ Anachronism",
      contemporary,
      sharesFormation: false,
      offMy: reference ? offBy(species.period, reference) : undefined,
    };
  }

  // period ruleset (or roster-relative contemporaneity)
  if (!reference) return none;
  const contemporary = species.period === reference;
  const sharesFormation = sharedFormations(roster).some((f) =>
    species.formations.includes(f),
  );
  return contemporary
    ? {
        applies: true,
        tone: "ok",
        chip: "✓ Contemporary",
        contemporary: true,
        sharesFormation,
      }
    : {
        applies: true,
        tone: "warn",
        chip: "⚠ Anachronism",
        contemporary: false,
        sharesFormation,
        offMy: offBy(species.period, reference),
      };
}
