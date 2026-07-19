// ============================================================================
// Candidate scoring — the game layer (likes/dislikes from paleo.gg), joined
// with the reality layer (accuracy.ts). Every lifestyle-compatible species is
// scored and returned; nothing is hidden. Statuses and order change live as
// the roster changes.
// ============================================================================

import type { Species, Ruleset } from "../types";
import { evalAccuracy, enclosurePeriod, type Accuracy } from "./accuracy";

export type GameStatus = "recommended" | "allowed" | "blocked";

export interface Repair {
  speciesId: string;
  name: string;
  reason: string;
}

export interface Candidate {
  species: Species;
  status: GameStatus;
  statusWord: string;
  /** Primary, plain-language row content. */
  reason: string;
  accuracy: Accuracy;
  appeal: number;
  blockedBy?: string;
  repair?: Repair;
}

export type RankBy = "appeal" | "easiest" | "fit" | "family";

export interface ScoreOptions {
  strict?: boolean;
  rankBy?: RankBy;
  period?: string;
}

interface Conflict {
  member: Species;
  direction: "member-dislikes" | "self-dislikes";
}

function findConflict(candidate: Species, roster: Species[]): Conflict | undefined {
  for (const member of roster) {
    if (member.dislikes.includes(candidate.id))
      return { member, direction: "member-dislikes" };
    if (candidate.dislikes.includes(member.id))
      return { member, direction: "self-dislikes" };
  }
  return undefined;
}

function findLiker(candidate: Species, roster: Species[]): Species | undefined {
  return roster.find((m) => m.likes.includes(candidate.id));
}
function candidateLikesMember(candidate: Species, roster: Species[]): Species | undefined {
  return roster.find((m) => candidate.likes.includes(m.id));
}

function plantNeeds(s: Species): string[] {
  return s.envNeeds.filter((n) => n.kind === "plant").map((n) => n.need);
}

/** Reality note appended to (or replacing) the game reason. */
function accuracyNote(candidate: Species, acc: Accuracy, ruleset: Ruleset): string {
  if (!acc.applies) return "";
  if (acc.hybrid) return "Lab hybrid — no fossil record.";

  if (ruleset.kind === "formation" && ruleset.formation) {
    const short = ruleset.formation.replace(/\s+Formation$/, "");
    if (acc.tone === "ok") return `Excavated from ${short} · ${candidate.period}.`;
    const off = acc.offMy != null ? `~${acc.offMy} my out of place · ` : "";
    return `${off}Not found in ${short} — ${candidate.period}.`;
  }

  if (acc.tone === "ok") return `Contemporary — ${candidate.period}.`;
  const off = acc.offMy != null ? `~${acc.offMy} my out of place · ` : "";
  return `${off}${candidate.period}.`;
}

function gameReason(
  candidate: Species,
  roster: Species[],
  status: GameStatus,
  conflict: Conflict | undefined,
): string {
  if (status === "blocked") {
    if (conflict) {
      return conflict.direction === "member-dislikes"
        ? `${conflict.member.name} dislikes ${candidate.name}.`
        : `${candidate.name} dislikes ${conflict.member.name}.`;
    }
    return "No mutual like — hidden by Strict mode.";
  }
  if (status === "recommended") {
    if (roster.length === 0) return "Open roster — everything fits.";
    const liker = findLiker(candidate, roster);
    if (liker) return `Liked by ${liker.name}.`;
    const likes = candidateLikesMember(candidate, roster);
    if (likes) return `Pairs well with ${likes.name}.`;
    return "Recommended.";
  }
  return "No conflicts.";
}

/**
 * Best conflict-free stand-in for a species: same family first, then one the
 * roster already likes, then closest appeal. Used for both the blocked-row
 * repair and the in-roster conflict swap.
 */
export function suggestRepair(
  blocked: Species,
  roster: Species[],
  ruleset: Ruleset,
  allSpecies: Species[],
  period?: string,
): Repair | undefined {
  const rosterIds = new Set(roster.map((s) => s.id));
  const viable = allSpecies.filter((s) => {
    if (s.id === blocked.id || rosterIds.has(s.id)) return false;
    if (s.lifestyle !== blocked.lifestyle) return false;
    return !findConflict(s, roster);
  });
  // Prefer an alternative that is also accuracy-clean, but never leave a
  // blocked row without a repair — fall back to a merely conflict-free one.
  const clean = viable.filter((s) => {
    const acc = evalAccuracy(s, roster, ruleset, period);
    return !(acc.applies && acc.tone === "warn");
  });
  const pool = clean.length > 0 ? clean : viable;
  if (pool.length === 0) return undefined;

  pool.sort((a, b) => {
    const famA = a.family === blocked.family ? 0 : 1;
    const famB = b.family === blocked.family ? 0 : 1;
    if (famA !== famB) return famA - famB;
    const recA = findLiker(a, roster) || candidateLikesMember(a, roster) ? 0 : 1;
    const recB = findLiker(b, roster) || candidateLikesMember(b, roster) ? 0 : 1;
    if (recA !== recB) return recA - recB;
    return Math.abs(a.appeal - blocked.appeal) - Math.abs(b.appeal - blocked.appeal);
  });

  const pick = pool[0];
  const bits = ["no conflict"];
  if (pick.family === blocked.family) bits.push("same family");
  if (findLiker(pick, roster) || candidateLikesMember(pick, roster)) bits.push("liked here");
  if (ruleset.kind !== "sandbox") bits.push(`${pick.period}`);
  return { speciesId: pick.id, name: pick.name, reason: bits.join(", ") };
}

const STATUS_WORD: Record<GameStatus, string> = {
  recommended: "RECOMMENDED",
  allowed: "ALLOWED",
  blocked: "BLOCKED",
};
const STATUS_ORDER: Record<GameStatus, number> = { recommended: 0, allowed: 1, blocked: 2 };

export function scoreCandidates(
  roster: Species[],
  allSpecies: Species[],
  ruleset: Ruleset,
  opts: ScoreOptions = {},
): Candidate[] {
  const rosterIds = new Set(roster.map((s) => s.id));
  const period = opts.period ?? enclosurePeriod(roster);
  const rosterNeeds = new Set(roster.flatMap(plantNeeds));
  const rosterFamilies = new Set(roster.map((s) => s.family));
  // An enclosure is one habitat type; once the roster sets it, only
  // lifestyle-compatible species can join (no mosasaurs in a land paddock).
  const rosterLifestyle = roster.length ? roster[0].lifestyle : undefined;

  const candidates: Candidate[] = allSpecies
    .filter((s) => !rosterIds.has(s.id))
    .filter((s) => (rosterLifestyle ? s.lifestyle === rosterLifestyle : true))
    .map((species) => {
      const conflict = findConflict(species, roster);
      let status: GameStatus;
      if (conflict) status = "blocked";
      else if (roster.length === 0) status = "recommended";
      else if (findLiker(species, roster) || candidateLikesMember(species, roster))
        status = "recommended";
      else status = "allowed";

      if (opts.strict && status === "allowed") status = "blocked";

      const accuracy = evalAccuracy(species, roster, ruleset, period);
      const game = gameReason(species, roster, status, conflict);
      const note = accuracyNote(species, accuracy, ruleset);

      // Blocked rows lead with the conflict. For merely Allowed rows a reality
      // warning outranks the bland "No conflicts."; Recommended rows keep the
      // high-information "Liked by X" alongside it.
      let reason: string;
      if (status === "blocked") reason = game;
      else if (accuracy.applies && accuracy.tone === "warn" && status === "allowed") reason = note;
      else reason = note ? `${game} ${note}` : game;

      const candidate: Candidate = {
        species,
        status,
        statusWord: STATUS_WORD[status],
        reason,
        accuracy,
        appeal: species.appeal,
        blockedBy: conflict?.member.name,
      };
      if (status === "blocked" && conflict) {
        candidate.repair = suggestRepair(species, roster, ruleset, allSpecies, period);
      }
      return candidate;
    });

  const rankBy = opts.rankBy ?? "appeal";
  candidates.sort((a, b) => {
    const g = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (g !== 0) return g;
    switch (rankBy) {
      case "easiest": {
        const newNeeds = (s: Species) =>
          plantNeeds(s).filter((n) => !rosterNeeds.has(n)).length;
        const ea = newNeeds(a.species) + a.species.security / 10;
        const eb = newNeeds(b.species) + b.species.security / 10;
        if (ea !== eb) return ea - eb;
        return b.appeal - a.appeal;
      }
      case "fit": {
        const fa = a.accuracy.applies && a.accuracy.tone === "ok" ? 0 : 1;
        const fb = b.accuracy.applies && b.accuracy.tone === "ok" ? 0 : 1;
        if (fa !== fb) return fa - fb;
        return b.appeal - a.appeal;
      }
      case "family": {
        const na = rosterFamilies.has(a.species.family) ? 1 : 0;
        const nb = rosterFamilies.has(b.species.family) ? 1 : 0;
        if (na !== nb) return na - nb;
        if (a.species.family !== b.species.family)
          return a.species.family.localeCompare(b.species.family);
        return b.appeal - a.appeal;
      }
      case "appeal":
      default:
        return b.appeal - a.appeal;
    }
  });

  return candidates;
}
