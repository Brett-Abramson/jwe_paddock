"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreProvider, useApp } from "@/lib/store";
import { decodeBuild, buildSharedState } from "@/lib/share";
import { activeEnclosure } from "@/lib/selectors";
import { EnclosureHeader } from "./enclosure-header";
import { ResidentsPanel } from "./residents-panel";
import { Candidates } from "./candidates";
import { BuildRequirements } from "./build-requirements";
import { ThemeToggle } from "./theme-toggle";

function SharedWorkspace({ code }: { code: string }) {
  const { state } = useApp();
  const enclosure = activeEnclosure(state);
  if (!enclosure) return null;

  return (
    <div className="flex h-screen min-w-[960px] flex-col bg-app text-body">
      <div className="pa-hazard h-1.5 flex-none" />
      <div className="flex items-center gap-4 border-b border-banner-line bg-banner px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-brand">
            <div className="h-[9px] w-[9px] rounded-[2px] bg-[color:var(--pa-brand-ink)]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-bold text-ink">Paddock Atlas</span>
            <span className="text-[10px] text-muted">
              Shared build — nothing you change here is saved
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href={`/?import=${code}`}
            className="rounded-[8px] bg-cta px-3 py-1.5 text-[12px] font-bold text-cta-ink"
            title="Copy this build into your own parks, fully editable and saved from then on"
          >
            Import into my parks
          </Link>
          <Link
            href="/"
            className="rounded-[8px] border border-line px-3 py-1.5 text-[12px] text-muted hover:text-body"
          >
            Start my own
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <EnclosureHeader enclosure={enclosure} />
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
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="flex h-screen items-center justify-center bg-app p-8 text-body">
      <div className="pa-card-shadow max-w-[420px] rounded-[var(--radius-card)] border border-line bg-card p-7 text-center">
        <h1 className="text-[18px] font-bold text-ink">This link isn&apos;t a valid build</h1>
        <p className="mt-2 text-[13px] text-muted">
          It may be corrupted, or from an older version of Paddock Atlas.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-[8px] bg-cta px-4 py-2 text-[13px] font-bold text-cta-ink"
        >
          Go to Paddock Atlas
        </Link>
      </div>
    </div>
  );
}

/**
 * Renders a shared build on an isolated, non-persisting store (same pattern
 * as the /states gallery) so opening someone else's link never touches the
 * visitor's own saved parks. The real components + real engine, exactly like
 * the sender saw them — see lib/share.ts for the encode/decode.
 */
export function SharedBuildView() {
  const params = useSearchParams();
  const code = params.get("b") ?? "";
  const build = useMemo(() => decodeBuild(code), [code]);
  const initial = useMemo(() => (build ? buildSharedState(build) : undefined), [build]);

  if (!build || !initial) return <InvalidLink />;

  return (
    <StoreProvider initialState={initial} persist={false}>
      <SharedWorkspace code={code} />
    </StoreProvider>
  );
}
