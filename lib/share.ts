// ============================================================================
// Shareable build links — no backend, so a link IS the storage: a single
// enclosure's roster + ruleset, packed into a URL-safe string. /share decodes it
// into a real Park+Enclosure rendered through the same isolated, non-persisting
// store the /states gallery uses (see lib/gallery-fixtures.ts), so opening
// someone else's link never touches your own saved parks. "Import into my parks"
// is the only way it reaches your real, persisted state — see the IMPORT_BUILD
// action in store.tsx.
// ============================================================================

import type { AppState } from "./store";
import type { Enclosure, Park, SharedBuild } from "./types";

/** Wire format: short keys, roster as tuples — keeps the URL as small as possible. */
interface Wire {
  v: 1;
  n: string;
  r: string;
  j?: string; // legacy: ignored now, kept for URL compatibility
  t: number;
  m: [string, number, number, number, number][];
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const padded = code.replace(/-/g, "+").replace(/_/g, "/");
  const withPad = padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "=");
  const binary = atob(withPad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBuild(build: SharedBuild): string {
  const wire: Wire = {
    v: 1,
    n: build.name,
    r: build.rulesetId,
    t: build.territories,
    m: build.roster.map((e) => [e.speciesId, e.count, e.females, e.males, e.juveniles]),
  };
  return toBase64Url(JSON.stringify(wire));
}

/** Returns undefined for a corrupt, foreign, or otherwise unreadable code. */
export function decodeBuild(code: string): SharedBuild | undefined {
  try {
    const wire = JSON.parse(fromBase64Url(code)) as Wire;
    if (wire.v !== 1 || !Array.isArray(wire.m) || typeof wire.r !== "string") return undefined;
    return {
      name: wire.n,
      rulesetId: wire.r,
      territories: wire.t,
      roster: wire.m.map(([speciesId, count, females, males, juveniles]) => ({
        speciesId,
        count,
        females,
        males,
        juveniles,
      })),
    };
  } catch {
    return undefined;
  }
}

const SHARED_PARK_ID = "shared-park";
const SHARED_ENCLOSURE_ID = "shared-enclosure";

/** Isolated single-enclosure state for the /share preview — never persisted. */
export function buildSharedState(build: SharedBuild): AppState {
  const park: Park = {
    id: SHARED_PARK_ID,
    name: "Shared build",
    rulesetId: build.rulesetId,
    enclosureIds: [SHARED_ENCLOSURE_ID],
    hatchery: [],
  };
  const enclosure: Enclosure = {
    id: SHARED_ENCLOSURE_ID,
    name: build.name,
    parkId: SHARED_PARK_ID,
    roster: build.roster,
    territories: build.territories,
  };
  return {
    parks: [park],
    enclosures: { [SHARED_ENCLOSURE_ID]: enclosure },
    activeParkId: SHARED_PARK_ID,
    activeEnclosureId: SHARED_ENCLOSURE_ID,
    settings: { strict: false, rankBy: "appeal" },
  };
}
