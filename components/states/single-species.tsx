"use client";

import type { Species } from "@/lib/types";

/**
 * §9 "Single-species" — reassuring, not an unfinished plan. Common for large
 * carnivores, whose dislikes rule out nearly every companion.
 */
export function SingleSpeciesNote({
  species,
  blockedCount,
}: {
  species: Species;
  blockedCount: number;
}) {
  return (
    <div className="shrink-0 rounded-[10px] border border-line bg-inset px-4 py-3">
      <div className="flex items-center gap-2 text-[13px] text-ok-text">
        <span>✓</span>
        <span className="font-semibold">Complete as-is</span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
        {species.name} stands alone — {blockedCount > 0 ? `it dislikes ${blockedCount} of the ` : ""}
        {blockedCount > 0 ? "species it could otherwise share an enclosure with" : "large carnivores often do"}
        . Build requirements are fully derived for one species, and Candidates stay available if you
        ever want a companion.
      </p>
    </div>
  );
}
