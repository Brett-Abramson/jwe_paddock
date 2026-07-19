"use client";

import { StoreProvider } from "@/lib/store";
import { RulesetBanner } from "./ruleset-banner";
import { ParkRail } from "./park-rail";
import { Workspace } from "./workspace";

export function AppRoot() {
  return (
    <StoreProvider>
      <div className="flex h-screen min-w-[960px] flex-col bg-app text-body">
        {/* hazard stripe */}
        <div className="pa-hazard h-1.5 flex-none" />
        <RulesetBanner />
        <div className="grid min-h-0 flex-1 grid-cols-[288px_1fr]">
          <ParkRail />
          <Workspace />
        </div>
      </div>
    </StoreProvider>
  );
}
