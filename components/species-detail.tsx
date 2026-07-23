"use client";

import type { EnvNeed, NeedKind, Species } from "@/lib/types";
import { formatArea } from "@/lib/data";
import { biomeForNeed } from "@/lib/engine";
import { BIOME_VAR } from "./biome-colors";

/** Biome-mapped needs (Cover, Pasture, Water…) take their space-plan colour so
 * the detail popover stays in sync with the Terrain space plan. Everything
 * else falls back to role semantics: green flora, blue water/fish, red meat. */
function needDotColor(need: string, kind: NeedKind): string {
  const biome = biomeForNeed(need);
  if (biome) return BIOME_VAR[biome];
  if (kind === "plant") return "var(--pa-ok-dot)";
  if (kind === "food") return need === "Fish" ? "var(--pa-sea-accent)" : "var(--pa-bad-dot)";
  return "var(--pa-sea-accent)";
}

function NeedSection({ title, needs }: { title: string; needs: EnvNeed[] }) {
  if (needs.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="pa-eyebrow">{title}</div>
      <div className="flex flex-col divide-y divide-line2 rounded-[10px] border border-line bg-inset px-3">
        {needs.map((n) => (
          <div key={n.need} className="flex items-center gap-2.5 py-2 text-[12px]">
            <span
              className="h-2 w-2 flex-none rounded-[2px]"
              style={{ background: needDotColor(n.need, n.kind) }}
            />
            <span className="flex-1 text-body">{n.need}</span>
            {n.pct != null && <span className="pa-mono text-[10px] text-faint">{n.pct}%</span>}
            <span className="pa-mono text-[11px] font-semibold text-ink">{formatArea(n.area)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A species' own environment needs — distinct from Build Requirements,
 * which aggregates and set-cover-optimizes across a whole roster. */
export function SpeciesDetailModal({
  species,
  onClose,
}: {
  species: Species;
  onClose: () => void;
}) {
  const plantNeeds = species.envNeeds.filter((n) => n.kind === "plant");
  const terrainNeeds = species.envNeeds.filter((n) => n.kind === "terrain");
  const foodNeeds = species.envNeeds.filter((n) => n.kind === "food");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4"
      onClick={(e) => {
        // Stop here, not just at the inner card: this modal can be rendered
        // inside a clickable row (see residents-panel.tsx's whole-row click).
        // Without this, closing on scrim click would bubble into that row's
        // own onClick and immediately reopen it in the same event.
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pa-card-shadow flex max-h-[80vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card"
      >
        <div className="flex items-start gap-3 border-b border-line2 px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[16px] font-bold text-ink">{species.name}</span>
            <span className="pa-mono truncate text-[11px] text-muted">
              {species.family}
              {species.genus ? ` · ${species.genus}` : ""} · {species.period}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-none rounded-[6px] px-2 py-1 text-[13px] text-muted hover:bg-inset hover:text-body"
          >
            ✕
          </button>
        </div>

        <div className="pa-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <NeedSection title="Plants" needs={plantNeeds} />
          <NeedSection title="Terrain & water" needs={terrainNeeds} />
          <NeedSection title="Food" needs={foodNeeds} />
          {species.envNeeds.length === 0 && (
            <div className="text-[12px] text-muted">No environment needs recorded.</div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="pa-eyebrow">Scales with population</div>
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-line2 bg-inset px-3 py-2.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-muted">Base population (needs above)</span>
                <span className="pa-mono text-ink">{species.minPopulation}</span>
              </div>
              {species.socialGroupMax != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted">Social group</span>
                  <span className="pa-mono text-ink">
                    {species.socialGroupMin ?? 1}–{species.socialGroupMax}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted">Area growth</span>
                <span className="pa-mono text-ink">
                  +{species.areaNeedGrowth}% per additional animal
                </span>
              </div>
              {species.comfort && (
                <div className="flex items-center justify-between">
                  <span className="text-muted">Comfort</span>
                  <span className="pa-mono text-ink">{species.comfort}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
