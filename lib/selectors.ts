// ============================================================================
// Selectors — resolve raw store state into typed inputs for the engine.
// Unknown speciesIds (data drift) are separated out here: retained, flagged,
// and excluded from scoring — never silently dropped.
// ============================================================================

import type { AppState } from "./store";
import type { Enclosure, Park, Ruleset, RosterEntry } from "./types";
import { getSpecies, getRuleset } from "./data";
import type { RosterMember } from "./engine";

const SANDBOX: Ruleset = { id: "sandbox", kind: "sandbox", label: "Sandbox" };

export function activePark(state: AppState): Park | undefined {
  return state.parks.find((p) => p.id === state.activeParkId);
}

export function parkEnclosures(state: AppState, park: Park | undefined): Enclosure[] {
  if (!park) return [];
  return park.enclosureIds
    .map((id) => state.enclosures[id])
    .filter((e): e is Enclosure => !!e);
}

export function activeEnclosure(state: AppState): Enclosure | undefined {
  return state.activeEnclosureId ? state.enclosures[state.activeEnclosureId] : undefined;
}

export function effectiveRuleset(state: AppState, enclosure: Enclosure | undefined): Ruleset {
  if (!enclosure) return SANDBOX;
  if (enclosure.rulesetOverrideId) return getRuleset(enclosure.rulesetOverrideId) ?? SANDBOX;
  const park = state.parks.find((p) => p.id === enclosure.parkId);
  return (park && getRuleset(park.rulesetId)) ?? SANDBOX;
}

/**
 * A park is "Custom" when any enclosure overrides the park default with a
 * different ruleset. Derived, not stored — so it can never drift from reality.
 */
export function isParkCustom(state: AppState, park: Park | undefined): boolean {
  if (!park) return false;
  return parkEnclosures(state, park).some(
    (e) => e.rulesetOverrideId && e.rulesetOverrideId !== park.rulesetId,
  );
}

/** How many distinct rulesets are actually in effect across a park. */
export function parkRulesetCount(state: AppState, park: Park | undefined): number {
  if (!park) return 0;
  const ids = parkEnclosures(state, park).map(
    (e) => e.rulesetOverrideId ?? park.rulesetId,
  );
  return new Set([park.rulesetId, ...ids]).size;
}

export interface EnclosureRulesetInfo {
  ruleset: Ruleset;
  /** true when following the park default rather than an override */
  inherited: boolean;
}

export function enclosureRulesetInfo(
  state: AppState,
  enclosure: Enclosure | undefined,
): EnclosureRulesetInfo {
  const ruleset = effectiveRuleset(state, enclosure);
  return { ruleset, inherited: !enclosure?.rulesetOverrideId };
}

export interface ResolvedRoster {
  members: RosterMember[];
  /** entries whose species is no longer in the dataset (data drift) */
  unknown: RosterEntry[];
}

export function resolveRoster(enclosure: Enclosure | undefined): ResolvedRoster {
  if (!enclosure) return { members: [], unknown: [] };
  const members: RosterMember[] = [];
  const unknown: RosterEntry[] = [];
  for (const entry of enclosure.roster) {
    const species = getSpecies(entry.speciesId);
    if (!species) {
      unknown.push(entry);
      continue;
    }
    members.push({
      species,
      count: entry.count,
      females: entry.females,
      males: entry.males,
      juveniles: entry.juveniles ?? 0,
    });
  }
  return { members, unknown };
}
