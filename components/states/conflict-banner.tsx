"use client";

import { useApp } from "@/lib/store";
import { SPECIES } from "@/lib/data";
import type { Enclosure } from "@/lib/types";
import {
  activePark,
  parkEnclosures,
  effectiveRuleset,
  resolveRoster,
} from "@/lib/selectors";
import { rosterConflicts, suggestRepair } from "@/lib/engine";
import { Menu, MenuItem } from "./../ui/menu";

/**
 * §9 "Conflict in roster" — what wrong looks like.
 * Only reachable by moving a species in; Candidates never offer a conflict.
 */
export function ConflictBanner({ enclosure }: { enclosure: Enclosure }) {
  const { state, dispatch } = useApp();
  const { members } = resolveRoster(enclosure);
  const conflicts = rosterConflicts(members);
  if (conflicts.length === 0) return null;

  const ruleset = effectiveRuleset(state, enclosure);
  const others = parkEnclosures(state, activePark(state)).filter((e) => e.id !== enclosure.id);
  const { disliker, disliked } = conflicts[0];

  // What could stand in for the disliked animal, with it removed from the roster
  const remaining = members.map((m) => m.species).filter((s) => s.id !== disliked.id);
  const swap = suggestRepair(disliked, remaining, ruleset, SPECIES);

  return (
    <div className="shrink-0 overflow-hidden rounded-[var(--radius-card)] border border-bad-line">
      <div className="flex items-center gap-2.5 border-b border-bad-line bg-bad-tint px-4 py-2.5">
        <span className="text-[15px] text-bad-dot">✕</span>
        <span className="text-[13px] font-semibold text-bad-text">
          {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} in this roster
        </span>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const inConflict = conflicts.some(
              (c) => c.a.id === m.species.id || c.b.id === m.species.id,
            );
            return (
              <span
                key={m.species.id}
                className={`rounded-[20px] border px-3 py-1 text-[12px] ${
                  inConflict
                    ? "border-bad-line bg-bad-tint text-bad-text"
                    : "border-line bg-inset text-body"
                }`}
              >
                {m.species.name}
              </span>
            );
          })}
        </div>

        <div className="rounded-[10px] border border-bad-line bg-bad-tint px-3.5 py-3 text-[12px] leading-relaxed text-bad-text">
          <b className="font-semibold">
            {disliker.name} dislikes {disliked.name}.
          </b>{" "}
          Reachable here because both are already in the roster — Candidates would never have
          offered it.
        </div>

        <div className="flex flex-wrap gap-2">
          {others.length > 0 ? (
            <Menu
              widthClass="min-w-[210px]"
              trigger={() => (
                <span className="flex items-center gap-1.5 rounded-[8px] border border-line px-3 py-2 text-[12px] font-semibold text-body hover:bg-inset">
                  Move {disliked.name} out <span className="text-[10px] opacity-70">⌄</span>
                </span>
              )}
            >
              {(close) => (
                <>
                  <div className="pa-eyebrow px-3 pt-1.5 pb-1">Move to</div>
                  {others.map((e) => (
                    <MenuItem
                      key={e.id}
                      onClick={() => {
                        dispatch({
                          type: "MOVE_MEMBER",
                          fromEnclosureId: enclosure.id,
                          toEnclosureId: e.id,
                          speciesId: disliked.id,
                        });
                        close();
                      }}
                    >
                      {e.name}
                    </MenuItem>
                  ))}
                  <div className="my-1 h-px bg-line2" />
                  <MenuItem
                    onClick={() => {
                      dispatch({
                        type: "REMOVE_FROM_ROSTER",
                        enclosureId: enclosure.id,
                        speciesId: disliked.id,
                      });
                      close();
                    }}
                  >
                    <span className="text-bad-text">Remove from park</span>
                  </MenuItem>
                </>
              )}
            </Menu>
          ) : (
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: "REMOVE_FROM_ROSTER",
                  enclosureId: enclosure.id,
                  speciesId: disliked.id,
                })
              }
              className="rounded-[8px] border border-line px-3 py-2 text-[12px] font-semibold text-body hover:bg-inset"
            >
              Remove {disliked.name}
            </button>
          )}

          {swap && (
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: "REPLACE_MEMBER",
                  enclosureId: enclosure.id,
                  fromSpeciesId: disliked.id,
                  toSpeciesId: swap.speciesId,
                })
              }
              className="rounded-[8px] border border-ok-line px-3 py-2 text-[12px] font-semibold text-ok-text hover:bg-ok-tint"
            >
              Swap for {swap.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
