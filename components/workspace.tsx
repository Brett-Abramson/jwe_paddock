"use client";

import { useApp } from "@/lib/store";
import { activePark, activeEnclosure, resolveRoster } from "@/lib/selectors";
import { rosterConflicts } from "@/lib/engine";
import { EnclosureHeader } from "./enclosure-header";
import { ResidentsPanel } from "./residents-panel";
import { Candidates } from "./candidates";
import { BuildRequirements } from "./build-requirements";
import { ConflictBanner } from "./states/conflict-banner";
import { EmptyPark } from "./states/empty-park";

export function Workspace() {
  const { state } = useApp();
  const park = activePark(state);
  const enclosure = activeEnclosure(state);

  if (!enclosure) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        {park && <EmptyPark park={park} />}
      </div>
    );
  }

  const { members } = resolveRoster(enclosure);
  const hasConflict = rosterConflicts(members).length > 0;

  return (
    <div className="flex min-h-0 flex-col">
      <EnclosureHeader enclosure={enclosure} />
      {hasConflict && (
        <div className="px-5 pt-3">
          <ConflictBanner enclosure={enclosure} />
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_372px]">
        <div className="flex min-h-0 flex-col overflow-hidden border-r border-line2">
          <div className="shrink-0 px-5 pt-3 pb-1">
            <ResidentsPanel enclosure={enclosure} />
          </div>
          <Candidates enclosure={enclosure} />
        </div>
        <BuildRequirements enclosure={enclosure} />
      </div>
    </div>
  );
}
