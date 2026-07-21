"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StoreProvider, useApp } from "@/lib/store";
import { decodeBuild } from "@/lib/share";
import { RulesetBanner } from "./ruleset-banner";
import { ParkRail } from "./park-rail";
import { Workspace } from "./workspace";

/**
 * A `/share` link's "Import into my parks" button lands here as `?import=`.
 * This is the only path from a shared build into real, persisted state —
 * the /share preview itself runs on an isolated store (see lib/share.ts).
 */
function ImportFromLink() {
  const { dispatch } = useApp();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get("import");
    if (!code) return;
    const build = decodeBuild(code);
    if (build) dispatch({ type: "IMPORT_BUILD", build });
    router.replace("/");
  }, [params, dispatch, router]);

  return null;
}

export function AppRoot() {
  return (
    <StoreProvider>
      <div className="flex h-screen min-w-[960px] flex-col bg-app text-body">
        {/* hazard stripe */}
        <div className="pa-hazard h-1.5 flex-none" />
        <Suspense fallback={null}>
          <ImportFromLink />
        </Suspense>
        <RulesetBanner />
        <div className="grid min-h-0 flex-1 grid-cols-[288px_1fr]">
          <ParkRail />
          <Workspace />
        </div>
      </div>
    </StoreProvider>
  );
}
