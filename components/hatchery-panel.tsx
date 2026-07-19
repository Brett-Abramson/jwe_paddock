"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { SPECIES } from "@/lib/data";
import type { Park, Species } from "@/lib/types";
import { resolveHatchery, resolveRoster, effectiveRuleset } from "@/lib/selectors";
import { scoreCandidates, enclosurePeriod, type GameStatus } from "@/lib/engine";
import { SpeciesDetailModal } from "./species-detail";

type HatcheryStatus = GameStatus | "in-roster" | "wrong-habitat";

const STATUS_LABEL: Record<Exclude<HatcheryStatus, "recommended" | "allowed">, string> = {
  blocked: "Blocked here",
  "in-roster": "Already added",
  "wrong-habitat": "Wrong habitat",
};

/** Egg tray: species staged for later, independent of any enclosure's rules. */
export function HatcheryPanel({ park, onClose }: { park: Park; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const { species, unknown } = useMemo(() => resolveHatchery(park), [park]);
  const enclosure = state.activeEnclosureId ? state.enclosures[state.activeEnclosureId] : undefined;
  const ref = useRef<HTMLDivElement>(null);
  const [detailSpecies, setDetailSpecies] = useState<Species | null>(null);

  useEffect(() => {
    // The species-detail modal owns its own close handling while open — attaching
    // these would also treat clicks inside it as "outside" and close the hatchery.
    if (detailSpecies) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [onClose, detailSpecies]);

  const statusById = useMemo(() => {
    const map = new Map<string, HatcheryStatus>();
    if (!enclosure) return map;
    const { members } = resolveRoster(enclosure);
    const rosterIds = new Set(members.map((m) => m.species.id));
    const ruleset = effectiveRuleset(state, enclosure);
    const period = enclosurePeriod(members.map((m) => m.species));
    const scored = scoreCandidates(members.map((m) => m.species), SPECIES, ruleset, { period });
    const scoredById = new Map(scored.map((c) => [c.species.id, c.status]));
    for (const s of species) {
      if (rosterIds.has(s.id)) map.set(s.id, "in-roster");
      else map.set(s.id, scoredById.get(s.id) ?? "wrong-habitat");
    }
    return map;
  }, [enclosure, species, state]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
      <div
        ref={ref}
        className="pa-card-shadow flex max-h-[75vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card"
      >
        <div className="flex items-center gap-2 border-b border-line2 px-5 py-4">
          <span aria-hidden>🥚</span>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-ink">Hatchery</span>
            <span className="text-[11px] text-muted">{park.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close hatchery"
            className="ml-auto rounded-[6px] px-2 py-1 text-[13px] text-muted hover:bg-inset hover:text-body"
          >
            ✕
          </button>
        </div>

        <div className="pa-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          {species.length === 0 && unknown.length === 0 && (
            <div className="px-2 py-6 text-center text-[12px] text-muted">
              Nothing staged yet — use the 🥚 button on any candidate to hold it here.
            </div>
          )}

          {species.map((s) => {
            const status = statusById.get(s.id);
            return (
              <div
                key={s.id}
                className="flex items-center gap-2.5 rounded-[9px] border border-line bg-inset px-3 py-2.5"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <button
                    type="button"
                    onClick={() => setDetailSpecies(s)}
                    title="Environment requirements"
                    className="truncate text-left text-[13px] font-semibold text-ink hover:underline"
                  >
                    {s.name}
                  </button>
                  <span className="pa-mono text-[11px] text-muted">
                    {s.family} · appeal {s.appeal}
                  </span>
                </div>
                {enclosure && (status === "recommended" || status === "allowed") && (
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "ADD_TO_ROSTER", enclosureId: enclosure.id, speciesId: s.id })
                    }
                    className="flex-none rounded-[7px] bg-cta px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-cta-ink"
                  >
                    Add to {enclosure.name}
                  </button>
                )}
                {enclosure && status && status !== "recommended" && status !== "allowed" && (
                  <span className="pa-mono flex-none text-[10px] whitespace-nowrap text-faint">
                    {STATUS_LABEL[status]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: "REMOVE_FROM_HATCHERY", parkId: park.id, speciesId: s.id })
                  }
                  aria-label={`Remove ${s.name} from hatchery`}
                  title="Remove from hatchery"
                  className="flex-none text-[13px] text-faint hover:text-bad-text"
                >
                  ✕
                </button>
              </div>
            );
          })}

          {unknown.map((id) => (
            <div
              key={id}
              className="flex items-center gap-2.5 rounded-[9px] border border-dashed border-dash bg-inset px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold text-muted line-through">{id}</span>
                <span className="pa-mono rounded-[5px] border border-acc-line bg-acc-tint px-1.5 py-0.5 text-[10px] text-acc-text">
                  not in dataset
                </span>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "REMOVE_FROM_HATCHERY", parkId: park.id, speciesId: id })}
                aria-label={`Remove ${id} from hatchery`}
                title="Remove from hatchery"
                className="flex-none text-[13px] text-faint hover:text-bad-text"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-line2 px-5 py-3 text-[11px] text-faint">
          Staged species aren&apos;t tied to any enclosure&apos;s rules — hold anything here, place
          it{enclosure ? ` in ${enclosure.name}` : ""} later.
        </div>
      </div>

      {detailSpecies && (
        <SpeciesDetailModal species={detailSpecies} onClose={() => setDetailSpecies(null)} />
      )}
    </div>
  );
}
