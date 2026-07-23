"use client";

// ============================================================================
// App store — source-of-truth user state (parks, enclosures, hatchery,
// settings) in a reducer, with localStorage persistence. All derived data
// (candidates, requirements) is computed from this via the engine, never
// stored. Data-drift is handled at read time (see selectors), so unknown
// speciesIds are retained here untouched.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Enclosure, Park, RosterEntry, SharedBuild } from "./types";
import type { RankBy } from "./engine";
import { getSpecies } from "./data";
import {
  SEED_PARKS,
  SEED_ENCLOSURES,
  SEED_ACTIVE_PARK,
  SEED_ACTIVE_ENCLOSURE,
} from "./seed";

const STORAGE_KEY = "pa-state-v1";

export interface Settings {
  strict: boolean;
  rankBy: RankBy;
}

export interface AppState {
  parks: Park[];
  enclosures: Record<string, Enclosure>;
  activeParkId: string;
  activeEnclosureId: string | null;
  settings: Settings;
}

export type Action =
  | { type: "HYDRATE"; state: AppState }
  | { type: "SELECT_PARK"; parkId: string }
  | { type: "SELECT_ENCLOSURE"; enclosureId: string }
  | { type: "SET_PARK_RULESET"; parkId: string; rulesetId: string }
  | { type: "ADD_TO_ROSTER"; enclosureId: string; speciesId: string }
  | { type: "REMOVE_FROM_ROSTER"; enclosureId: string; speciesId: string }
  | { type: "REPLACE_MEMBER"; enclosureId: string; fromSpeciesId: string; toSpeciesId: string }
  | { type: "SET_COUNT"; enclosureId: string; speciesId: string; count: number }
  | { type: "SET_SEXES"; enclosureId: string; speciesId: string; females: number; males: number }
  | { type: "SET_JUVENILES"; enclosureId: string; speciesId: string; juveniles: number }
  | { type: "SET_ENCLOSURE_RULESET"; enclosureId: string; rulesetId: string }
  | { type: "RESET_ENCLOSURE_RULESET"; enclosureId: string }
  | { type: "MOVE_MEMBER"; fromEnclosureId: string; toEnclosureId: string; speciesId: string }
  | { type: "SET_STRICT"; value: boolean }
  | { type: "SET_RANKBY"; rankBy: RankBy }
  | { type: "NEW_ENCLOSURE"; parkId: string }
  | { type: "RENAME_ENCLOSURE"; enclosureId: string; name: string }
  | { type: "DELETE_ENCLOSURE"; enclosureId: string }
  | { type: "NEW_PARK" }
  | { type: "RENAME_PARK"; parkId: string; name: string }
  | { type: "ADD_TO_HATCHERY"; parkId: string; speciesId: string }
  | { type: "REMOVE_FROM_HATCHERY"; parkId: string; speciesId: string }
  | { type: "IMPORT_BUILD"; build: SharedBuild };

function seedState(): AppState {
  return {
    parks: structuredClone(SEED_PARKS),
    enclosures: structuredClone(SEED_ENCLOSURES),
    activeParkId: SEED_ACTIVE_PARK,
    activeEnclosureId: SEED_ACTIVE_ENCLOSURE,
    settings: { strict: false, rankBy: "appeal" },
  };
}

function splitSexes(count: number): { females: number; males: number } {
  const females = Math.floor(count / 2);
  return { females, males: count - females };
}

function defaultEntry(speciesId: string): RosterEntry {
  const species = getSpecies(speciesId);
  const count = Math.max(1, species?.minPopulation ?? 1);
  const { females, males } = splitSexes(count);
  return { speciesId, count, females, males, juveniles: 0 };
}

function updateEnclosure(
  state: AppState,
  id: string,
  fn: (e: Enclosure) => Enclosure,
): AppState {
  const existing = state.enclosures[id];
  if (!existing) return state;
  return { ...state, enclosures: { ...state.enclosures, [id]: fn(existing) } };
}

function mapRoster(
  e: Enclosure,
  speciesId: string,
  fn: (entry: RosterEntry) => RosterEntry,
): Enclosure {
  return { ...e, roster: e.roster.map((r) => (r.speciesId === speciesId ? fn(r) : r)) };
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "SELECT_PARK": {
      const park = state.parks.find((p) => p.id === action.parkId);
      return {
        ...state,
        activeParkId: action.parkId,
        activeEnclosureId: park?.enclosureIds[0] ?? null,
      };
    }

    case "SELECT_ENCLOSURE":
      return { ...state, activeEnclosureId: action.enclosureId };

    case "SET_PARK_RULESET":
      return {
        ...state,
        parks: state.parks.map((p) =>
          p.id === action.parkId ? { ...p, rulesetId: action.rulesetId } : p,
        ),
      };

    case "ADD_TO_ROSTER": {
      return updateEnclosure(state, action.enclosureId, (e) => {
        if (e.roster.some((r) => r.speciesId === action.speciesId)) return e;
        return { ...e, roster: [...e.roster, defaultEntry(action.speciesId)] };
      });
    }

    case "REMOVE_FROM_ROSTER":
      return updateEnclosure(state, action.enclosureId, (e) => ({
        ...e,
        roster: e.roster.filter((r) => r.speciesId !== action.speciesId),
      }));

    case "REPLACE_MEMBER":
      return updateEnclosure(state, action.enclosureId, (e) => ({
        ...e,
        roster: e.roster
          .filter((r) => r.speciesId !== action.toSpeciesId)
          .map((r) =>
            r.speciesId === action.fromSpeciesId ? defaultEntry(action.toSpeciesId) : r,
          ),
      }));

    case "SET_JUVENILES":
      return updateEnclosure(state, action.enclosureId, (e) =>
        mapRoster(e, action.speciesId, (r) => ({
          ...r,
          juveniles: Math.max(0, action.juveniles),
        })),
      );

    case "SET_COUNT": {
      const count = Math.max(1, action.count);
      return updateEnclosure(state, action.enclosureId, (e) =>
        mapRoster(e, action.speciesId, (r) => {
          const { females, males } = splitSexes(count);
          return { ...r, count, females, males };
        }),
      );
    }

    case "SET_SEXES": {
      const females = Math.max(0, action.females);
      const males = Math.max(0, action.males);
      const count = Math.max(1, females + males);
      return updateEnclosure(state, action.enclosureId, (e) =>
        mapRoster(e, action.speciesId, (r) => ({ ...r, females, males, count })),
      );
    }

    case "SET_ENCLOSURE_RULESET":
      return updateEnclosure(state, action.enclosureId, (e) => ({
        ...e,
        rulesetOverrideId: action.rulesetId,
      }));

    case "RESET_ENCLOSURE_RULESET":
      return updateEnclosure(state, action.enclosureId, (e) => {
        const { rulesetOverrideId: _drop, ...rest } = e;
        void _drop;
        return rest;
      });

    case "MOVE_MEMBER": {
      const from = state.enclosures[action.fromEnclosureId];
      const to = state.enclosures[action.toEnclosureId];
      if (!from || !to || from.id === to.id) return state;
      const entry = from.roster.find((r) => r.speciesId === action.speciesId);
      if (!entry) return state;
      return {
        ...state,
        enclosures: {
          ...state.enclosures,
          [from.id]: {
            ...from,
            roster: from.roster.filter((r) => r.speciesId !== action.speciesId),
          },
          [to.id]: {
            ...to,
            roster: to.roster.some((r) => r.speciesId === action.speciesId)
              ? to.roster
              : [...to.roster, entry],
          },
        },
      };
    }

    case "SET_STRICT":
      return { ...state, settings: { ...state.settings, strict: action.value } };

    case "SET_RANKBY":
      return { ...state, settings: { ...state.settings, rankBy: action.rankBy } };

    case "NEW_ENCLOSURE": {
      const id = uid("enc");
      const park = state.parks.find((p) => p.id === action.parkId);
      if (!park) return state;
      const enclosure: Enclosure = {
        id,
        name: `New Enclosure ${park.enclosureIds.length + 1}`,
        parkId: park.id,
        roster: [],
        territories: 1,
      };
      return {
        ...state,
        enclosures: { ...state.enclosures, [id]: enclosure },
        parks: state.parks.map((p) =>
          p.id === park.id ? { ...p, enclosureIds: [...p.enclosureIds, id] } : p,
        ),
        activeEnclosureId: id,
      };
    }

    case "RENAME_ENCLOSURE":
      return updateEnclosure(state, action.enclosureId, (e) => ({ ...e, name: action.name }));

    case "DELETE_ENCLOSURE": {
      const enc = state.enclosures[action.enclosureId];
      if (!enc) return state;
      const rest = { ...state.enclosures };
      delete rest[action.enclosureId];
      const parks = state.parks.map((p) =>
        p.id === enc.parkId
          ? { ...p, enclosureIds: p.enclosureIds.filter((x) => x !== action.enclosureId) }
          : p,
      );
      const activeEnclosureId =
        state.activeEnclosureId === action.enclosureId
          ? parks.find((p) => p.id === enc.parkId)?.enclosureIds[0] ?? null
          : state.activeEnclosureId;
      return { ...state, enclosures: rest, parks, activeEnclosureId };
    }

    case "NEW_PARK": {
      const id = uid("park");
      const park: Park = {
        id,
        name: `New Park ${state.parks.length + 1}`,
        rulesetId: "sandbox",
        enclosureIds: [],
        hatchery: [],
      };
      return { ...state, parks: [...state.parks, park], activeParkId: id, activeEnclosureId: null };
    }

    case "RENAME_PARK":
      return {
        ...state,
        parks: state.parks.map((p) => (p.id === action.parkId ? { ...p, name: action.name } : p)),
      };

    case "ADD_TO_HATCHERY":
      return {
        ...state,
        parks: state.parks.map((p) =>
          p.id === action.parkId && !p.hatchery.includes(action.speciesId)
            ? { ...p, hatchery: [...p.hatchery, action.speciesId] }
            : p,
        ),
      };

    case "REMOVE_FROM_HATCHERY":
      return {
        ...state,
        parks: state.parks.map((p) =>
          p.id === action.parkId
            ? { ...p, hatchery: p.hatchery.filter((id) => id !== action.speciesId) }
            : p,
        ),
      };

    case "IMPORT_BUILD": {
      const parkId = uid("park");
      const enclosureId = uid("enc");
      const park: Park = {
        id: parkId,
        name: `${action.build.name} (imported)`,
        rulesetId: action.build.rulesetId,
        enclosureIds: [enclosureId],
        hatchery: [],
      };
      const enclosure: Enclosure = {
        id: enclosureId,
        name: action.build.name,
        parkId,
        roster: action.build.roster,
        territories: action.build.territories,
      };
      return {
        ...state,
        parks: [...state.parks, park],
        enclosures: { ...state.enclosures, [enclosureId]: enclosure },
        activeParkId: parkId,
        activeEnclosureId: enclosureId,
      };
    }

    default:
      return state;
  }
}

// ---- context ----

interface Store {
  state: AppState;
  dispatch: Dispatch<Action>;
}
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({
  children,
  initialState,
  persist = true,
}: {
  children: ReactNode;
  /** seed the store with fixed state (used by the states gallery) */
  initialState?: AppState;
  /** set false for an isolated store that never touches localStorage */
  persist?: boolean;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState ?? seedState());

  // hydrate from localStorage after mount (server + first client render use seed
  // -> identical DOM -> no hydration mismatch)
  useEffect(() => {
    if (!persist) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed && parsed.parks && parsed.enclosures) {
          dispatch({ type: "HYDRATE", state: parsed });
        }
      }
    } catch {
      /* ignore corrupt/unavailable storage */
    }
  }, [persist]);

  // persist on change
  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, persist]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useApp(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useApp must be used within StoreProvider");
  return ctx;
}
