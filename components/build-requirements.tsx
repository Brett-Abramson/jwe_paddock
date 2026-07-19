"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { PLANTS, formatArea } from "@/lib/data";
import type { Enclosure } from "@/lib/types";
import { effectiveRuleset, resolveRoster } from "@/lib/selectors";
import {
  buildRequirements,
  type BuildRequirements as Reqs,
  type PopulationRow,
} from "@/lib/engine";
import { SingleSpeciesNote } from "./states/single-species";

function AccuracyCard({ req }: { req: Reqs }) {
  if (!req.accuracy.applies) return null;
  return (
    <div className="shrink-0 overflow-hidden rounded-[10px] border border-acc-line bg-inset">
      <div className="flex items-center justify-between border-b border-acc-line bg-acc-tint px-3.5 py-2.5">
        <span className="text-[13px] font-semibold text-acc-text">Accuracy report</span>
        <span className="pa-mono text-[10px] text-acc-text">{req.accuracy.label}</span>
      </div>
      <div className="flex flex-col gap-1.5 px-3.5 py-3 text-[12px]">
        {req.accuracy.lines.map((l, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${l.tone === "ok" ? "text-body" : "text-acc-text"}`}
          >
            <span className={l.tone === "ok" ? "text-ok-dot" : ""}>
              {l.tone === "ok" ? "✓" : "⚠"}
            </span>
            <span>{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlantCard({ req }: { req: Reqs }) {
  if (!req.plantPlan) return null;
  const { plantPlan } = req;
  if (plantPlan.needCount === 0) {
    return (
      <div className="rounded-[10px] border border-line bg-inset px-3.5 py-3 text-[12px] text-muted">
        No paleobotany needs — this roster feeds from meat, prey or fish.
      </div>
    );
  }
  return (
    <div className="shrink-0 overflow-hidden rounded-[10px] border border-ok-line bg-inset">
      <div className="flex items-center justify-between border-b border-ok-line bg-ok-tint px-3.5 py-2.5">
        <span className="text-[13px] font-semibold text-ok-text">Plant plan — optimized</span>
        <span className="pa-mono text-[10px] text-ok-text">
          {plantPlan.plantCount} → {plantPlan.needCount} needs
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3.5 py-3 text-[12px]">
        {req.plantRows.map((p) => (
          <div
            key={p.plant.id}
            className={`flex items-center gap-2.5 ${
              p.changed ? "-mx-1.5 rounded-[7px] border border-juv-line bg-inset px-1.5 py-1" : ""
            }`}
          >
            <span
              className="h-2 w-2 flex-none rounded-[2px]"
              style={{ background: p.changed ? "var(--pa-juv-accent)" : "var(--pa-ok-dot)" }}
            />
            <span className="font-semibold text-ink">{p.plant.name}</span>
            <span className="pa-mono text-[10px] text-muted">{p.covers.join(" + ")}</span>
            <span className="pa-mono ml-auto text-[10px] text-body">{formatArea(p.area)}</span>
          </div>
        ))}
        {plantPlan.uncovered.length > 0 && (
          <div className="flex items-center gap-2 text-acc-text">
            <span>⚠</span> No plant covers: {plantPlan.uncovered.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

function TerrainCard({ req }: { req: Reqs }) {
  if (req.terrain.length === 0) return null;
  return (
    <div className="shrink-0 rounded-[10px] border border-line bg-inset px-3.5 py-3">
      <div className="pb-2 text-[13px] font-semibold text-ink">Terrain &amp; water</div>
      <div className="flex flex-col gap-1.5 text-[12px]">
        {req.terrain.map((t) => (
          <div
            key={t.need}
            className={`flex items-center gap-2.5 ${
              t.changed ? "-mx-1.5 rounded-[7px] border border-juv-line px-1.5 py-1" : ""
            }`}
          >
            <span
              className="h-2 w-2 flex-none rounded-[2px]"
              style={{ background: t.changed ? "var(--pa-juv-accent)" : "var(--pa-sea-accent)" }}
            />
            <span className="text-body">{t.need}</span>
            <span className="pa-mono ml-auto text-[11px] text-ink">{formatArea(t.area)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FenceFeeders({ req }: { req: Reqs }) {
  return (
    <>
      {req.fence && (
        <div className="flex shrink-0 gap-2.5">
          <div className="flex-1 rounded-[10px] border border-line bg-inset px-3 py-2.5">
            <div className="text-[11px] text-muted">Fence tier</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="pa-mono text-[22px] font-bold text-bad-dot">{req.fence.tier}</span>
              <span className="text-[10px] text-muted">{req.fence.driver}</span>
            </div>
          </div>
          <div className="flex-1 rounded-[10px] border border-line bg-inset px-3 py-2.5">
            <div className="text-[11px] text-muted">Animals</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="pa-mono text-[22px] font-bold text-ink">{req.totalAnimals}</span>
              <span className="text-[10px] text-muted">planned</span>
            </div>
          </div>
        </div>
      )}
      {req.feeders.length > 0 && (
        <div className="shrink-0 rounded-[10px] border border-line bg-inset px-3.5 py-3">
          <div className="pb-2 text-[13px] font-semibold text-ink">
            Feeders <span className="pa-mono text-[11px] text-muted">×{req.feeders.length}</span>
          </div>
          <div className="flex flex-col gap-1.5 text-[12px]">
            {req.feeders.map((f) => (
              <div key={f.label} className="flex items-baseline gap-2">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-cta" />
                <span className="text-body">{f.label}</span>
                <span className="pa-mono ml-auto truncate text-[10px] text-muted">{f.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function MarineCard({ req }: { req: Reqs }) {
  if (!req.marine) return null;
  return (
    <div className="shrink-0 overflow-hidden rounded-[10px] border border-sea-line bg-inset">
      <div className="flex items-center gap-2 border-b border-sea-line bg-sea-header px-3.5 py-2.5">
        <span aria-hidden>{req.marine.kind === "marine" ? "🌊" : "🦅"}</span>
        <span className="text-[13px] font-bold text-sea-text">{req.marine.headline}</span>
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        <div className="flex items-center gap-2 text-[12px] text-sea-text">
          <span className="h-[7px] w-[7px] rounded-full bg-sea-accent" />
          No fence tier — {req.marine.kind === "marine" ? "lagoon" : "aviary"} requirement instead
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {req.marine.chips.map((c) => (
            <span
              key={c}
              className="rounded-[6px] border border-sea-line bg-sea-header px-2 py-1 text-sea-text"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PopulationCard({ rows }: { rows: PopulationRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="shrink-0 rounded-[10px] border border-line bg-inset px-3.5 py-3">
      <div className="pb-2 text-[14px] font-bold text-ink">Population &amp; sex</div>
      <div className="flex flex-col gap-2">
        {rows.map((r) =>
          r.tone === "bad" ? (
            <div
              key={r.speciesId}
              className="flex items-start gap-2.5 rounded-[9px] border border-bad-line bg-bad-tint px-3 py-2.5 text-[12px] text-bad-text"
            >
              <span>✕</span>
              <div className="flex-1">
                <b>
                  {r.name} — {r.requirement}.
                </b>
                {r.detail && <div className="mt-0.5">{r.detail}</div>}
              </div>
              <span className="pa-mono text-[11px]">{r.countLabel}</span>
            </div>
          ) : (
            <div key={r.speciesId} className="flex items-start gap-2.5 text-[12px] text-body">
              <span className={r.tone === "warn" ? "text-acc-text" : "text-ok-dot"}>
                {r.tone === "warn" ? "⚠" : "✓"}
              </span>
              <span className="flex-1">
                {r.name} <span className="text-muted">— {r.requirement}</span>
                {r.tone === "warn" && r.detail && (
                  <span className="block text-acc-text">{r.detail}</span>
                )}
              </span>
              <span className="pa-mono text-[11px] text-muted">{r.countLabel}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function BuildRequirements({ enclosure }: { enclosure: Enclosure }) {
  const { state } = useApp();
  const { members } = resolveRoster(enclosure);
  const ruleset = effectiveRuleset(state, enclosure);

  const req = useMemo(
    () => buildRequirements(members, ruleset, PLANTS, enclosure.juvenileMode),
    [members, ruleset, enclosure.juvenileMode],
  );

  const empty = members.length === 0;

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden bg-panel">
      <div className="px-4 pt-3.5 pb-2">
        <span className="pa-eyebrow">Build requirements</span>
      </div>
      <div className="pa-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {empty ? (
          <div className="shrink-0 rounded-[10px] border border-dashed border-dash bg-inset px-4 py-6 text-center text-[12px] text-muted">
            Add species to derive the build order — plants, terrain, fence, feeders and population
            all compute live.
          </div>
        ) : (
          <>
            {members.length === 1 && (
              <SingleSpeciesNote
                species={members[0].species}
                blockedCount={members[0].species.dislikes.length}
              />
            )}
            <AccuracyCard req={req} />
            {req.lifestyle === "land" ? (
              <>
                <PlantCard req={req} />
                <TerrainCard req={req} />
                <FenceFeeders req={req} />
              </>
            ) : (
              <>
                <MarineCard req={req} />
                <FenceFeeders req={req} />
              </>
            )}
            <PopulationCard rows={req.population} />

            {req.juvenileActive && req.juvenileNotes.length > 0 && (
              <div className="shrink-0 rounded-[10px] border border-juv-line bg-inset px-3.5 py-3">
                <div className="pb-1.5 text-[12px] text-muted">
                  Build requirements changed — <span className="text-juv-text">highlighted</span>:
                </div>
                {req.juvenileNotes.map((n, i) => (
                  <div
                    key={i}
                    className="mt-1.5 flex items-start gap-2 rounded-[9px] border border-juv-line bg-inset px-2.5 py-2 text-[12px] text-juv-text"
                  >
                    <span>▲</span>
                    {n}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="mt-1 shrink-0 rounded-[9px] bg-cta py-2.5 text-[13px] font-bold text-cta-ink"
            >
              Save build order
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
