"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { StoreProvider, useApp } from "@/lib/store";
import { galleryState, GALLERY_ENCLOSURE_IDS as IDS } from "@/lib/gallery-fixtures";
import { SPECIES, PLANTS, MANIFEST } from "@/lib/data";
import { effectiveRuleset, resolveRoster } from "@/lib/selectors";
import { scoreCandidates, buildRequirements } from "@/lib/engine";
import type { Enclosure } from "@/lib/types";

import { CandidateRow } from "./candidates";
import { BuildRequirements, PopulationCard } from "./build-requirements";
import { ConflictBanner } from "./states/conflict-banner";
import { EmptyPark } from "./states/empty-park";
import { SingleSpeciesNote } from "./states/single-species";
import { EnclosureHeader } from "./enclosure-header";
import { ThemeToggle } from "./theme-toggle";

function Card({
  label,
  note,
  width = "w-[560px]",
  children,
}: {
  label: string;
  note?: string;
  width?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex ${width} max-w-full flex-col gap-2.5`}>
      <div>
        <div className="pa-mono text-[11px] tracking-[0.08em] text-muted uppercase">{label}</div>
        {note && <div className="mt-1 text-[12px] text-faint">{note}</div>}
      </div>
      <div className="pa-card-shadow flex-1 rounded-[var(--radius-card)] border border-line bg-card p-4">
        {children}
      </div>
    </section>
  );
}

/** Right-hand requirements column, rendered on its own for a state card. */
function RequirementsPreview({ enclosure }: { enclosure: Enclosure }) {
  return (
    <div className="h-[420px] overflow-hidden rounded-[10px] border border-line2">
      <BuildRequirements enclosure={enclosure} />
    </div>
  );
}

function useEnclosure(id: string): Enclosure {
  const { state } = useApp();
  return state.enclosures[id];
}

/** One candidate row picked out of a live scoring run. */
function RowFor({
  enclosureId,
  pick,
}: {
  enclosureId: string;
  pick: (c: ReturnType<typeof scoreCandidates>[number]) => boolean;
}) {
  const { state } = useApp();
  const enclosure = state.enclosures[enclosureId];
  const { members } = resolveRoster(enclosure);
  const ruleset = effectiveRuleset(state, enclosure);
  const candidate = useMemo(() => {
    const all = scoreCandidates(
      members.map((m) => m.species),
      SPECIES,
      ruleset,
      { rankBy: "appeal" },
    );
    return all.find(pick);
  }, [members, ruleset, pick]);

  if (!candidate) return <div className="text-[12px] text-muted">No matching candidate.</div>;
  return <CandidateRow candidate={candidate} enclosureId={enclosureId} />;
}

const isBlocked = (c: { status: string }) => c.status === "blocked";
const isAnachronistic = (c: { status: string; accuracy: { tone: string; hybrid?: boolean } }) =>
  c.status !== "blocked" && c.accuracy.tone === "warn" && !c.accuracy.hybrid;
const isHybrid = (c: { accuracy: { hybrid?: boolean } }) => !!c.accuracy.hybrid;

function EmptyEnclosureCard() {
  const enclosure = useEnclosure(IDS.empty);
  const { state } = useApp();
  const ruleset = effectiveRuleset(state, enclosure);
  const top = useMemo(
    () =>
      scoreCandidates([], SPECIES, ruleset, { rankBy: "appeal" })
        .slice(0, 2)
        .map((c) => c.species.name),
    [ruleset],
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 rounded-[10px] border border-dashed border-dash bg-inset px-4 py-3">
        <span className="text-[15px] text-ok-text">✓</span>
        <div>
          <div className="text-[13px] font-semibold text-ink">Everything is Recommended</div>
          <div className="text-[12px] text-muted">
            Empty roster — pick an anchor (usually the highest appeal). Everything opens up from
            there.
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2.5 rounded-[10px] border border-line px-4 py-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-dashed border-dash text-[20px] text-muted">
          ＋
        </div>
        <div className="text-[14px] font-semibold text-ink2">Pick an anchor to build around</div>
        <div className="max-w-[260px] text-[12px] text-muted">
          Highest appeal right now: {top.join(", ")}.
        </div>
        <span className="rounded-[8px] bg-cta px-4 py-2 text-[13px] font-semibold text-cta-ink">
          Choose anchor
        </span>
      </div>
    </div>
  );
}

function GalleryBody() {
  const { state } = useApp();
  const emptyPark = state.parks.find((p) => p.id === "gallery-empty-park")!;

  const conflictEnc = useEnclosure(IDS.conflict);
  const populationEnc = useEnclosure(IDS.population);
  const singleEnc = useEnclosure(IDS.single);
  const marineEnc = useEnclosure(IDS.marine);
  const aviaryEnc = useEnclosure(IDS.aviary);
  const juvenileEnc = useEnclosure(IDS.juvenile);
  const driftEnc = useEnclosure(IDS.drift);

  const singleMembers = resolveRoster(singleEnc).members;
  const juvReq = buildRequirements(
    resolveRoster(juvenileEnc).members,
    effectiveRuleset(state, juvenileEnc),
    PLANTS,
    "juveniles",
  );

  return (
    <div className="flex flex-wrap items-stretch gap-8">
      <Card
        label="Empty park — an invitation"
        note="The three jobs as doors, with an inline ruleset choice."
      >
        <EmptyPark park={emptyPark} />
      </Card>

      <Card
        label="Empty enclosure — the best state"
        width="w-[420px]"
        note="Must not read as broken. This is where players start."
      >
        <EmptyEnclosureCard />
      </Card>

      <Card
        label="Blocked candidate — highest-value component"
        note="Reason is the row's primary content, with an attached repair."
      >
        <RowFor enclosureId={IDS.conflict} pick={isBlocked} />
      </Card>

      <Card
        label="Anachronism — game-valid, reality-wrong"
        note="Only exists under a non-Sandbox ruleset. Amber chip + accuracy report entry."
      >
        <RowFor enclosureId={IDS.anachronism} pick={isAnachronistic} />
      </Card>

      <Card
        label="Lab hybrid — no fossil record"
        note="Not in the original spec: the real dataset has 9 engineered hybrids that can't be judged against a timeline."
      >
        <RowFor enclosureId={IDS.anachronism} pick={isHybrid} />
      </Card>

      <Card
        label="Conflict in roster — what wrong looks like"
        note="Only reachable by moving a species in; Candidates never offer a conflict."
      >
        <ConflictBanner enclosure={conflictEnc} />
      </Card>

      <Card
        label="Population violation"
        width="w-[420px]"
        note="Prevents the silent never-breed failure — you'd build it, synthesise wrong, and never breed."
      >
        <PopulationCard
          rows={
            buildRequirements(
              resolveRoster(populationEnc).members,
              effectiveRuleset(state, populationEnc),
              PLANTS,
              populationEnc.juvenileMode,
            ).population
          }
        />
      </Card>

      <Card
        label="Single-species — not a failure"
        width="w-[420px]"
        note="Common for large carnivores, whose dislikes rule out almost everyone."
      >
        <div className="flex flex-col gap-3">
          <EnclosureHeader enclosure={singleEnc} />
          {singleMembers[0] && (
            <SingleSpeciesNote
              species={singleMembers[0].species}
              blockedCount={singleMembers[0].species.dislikes.length}
            />
          )}
        </div>
      </Card>

      <Card
        label="Marine — different rules"
        width="w-[420px]"
        note="No fence tier; lagoon size, feeders and depth instead."
      >
        <RequirementsPreview enclosure={marineEnc} />
      </Card>

      <Card
        label="Aviary — different rules"
        width="w-[420px]"
        note="Same treatment as marine: dome size and perches replace fencing."
      >
        <RequirementsPreview enclosure={aviaryEnc} />
      </Card>

      <Card
        label="Juvenile mode active — requirements rewrite"
        width="w-[420px]"
        note={`Juveniles count toward population, so every area need grows (${juvReq.totalAnimals} animals planned). The highlight is the point.`}
      >
        <RequirementsPreview enclosure={juvenileEnc} />
      </Card>

      <Card
        label="Data drift — saved plan, unknown species"
        width="w-[560px]"
        note="Kept in place, excluded from scoring, never silently dropped."
      >
        <EnclosureHeader enclosure={driftEnc} />
      </Card>

      <Card
        label="Wrong variant for canon era — NOT BUILT"
        width="w-[420px]"
        note="Needs Source B (FatherMC): the paleo.gg dataset carries no in-game model variants or canon film eras."
      >
        <div className="rounded-[10px] border border-dashed border-dash bg-inset px-4 py-6 text-[12px] leading-relaxed text-muted">
          The variant picker and canon-era rulesets were removed when the app moved to real data.
          The reality layer runs on geologic <b className="text-body">Period</b> and dig-site{" "}
          <b className="text-body">Formation</b> instead. Dropping in a canon dataset restores this
          state without changing the engine.
        </div>
      </Card>
    </div>
  );
}

export function StatesGallery() {
  const initial = useMemo(() => galleryState(), []);
  return (
    // isolated store: the gallery must never write to the user's saved parks
    <StoreProvider initialState={initial} persist={false}>
      <div className="min-h-screen bg-app">
        <div className="pa-hazard h-1.5" />
        <div className="mx-auto flex max-w-[1500px] flex-col gap-8 px-10 py-9">
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-brand">
                <div className="h-2.5 w-2.5 rounded-[3px] bg-[color:var(--pa-brand-ink)]" />
              </div>
              <span className="pa-eyebrow">Paddock Atlas · §9 states</span>
              <div className="ml-auto flex items-center gap-3">
                <Link
                  href="/"
                  className="rounded-[6px] border border-line px-2.5 py-1 text-[11px] text-muted hover:text-body"
                >
                  ← Back to app
                </Link>
                <ThemeToggle />
              </div>
            </div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">
              The states a build has to handle
            </h1>
            <p className="max-w-[820px] text-[14px] leading-relaxed text-muted">
              Every card below is the <b className="text-body">real component</b> driven by the{" "}
              <b className="text-body">real engine</b> over the{" "}
              {MANIFEST.speciesCount}-species {MANIFEST.source} dataset — not a mock. Change the
              scoring rules and these change with them. The store here is isolated, so nothing you
              click affects your saved parks.
            </p>
          </header>
          <GalleryBody />
        </div>
      </div>
    </StoreProvider>
  );
}
