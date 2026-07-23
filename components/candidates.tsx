"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { SPECIES, MANIFEST } from "@/lib/data";
import type { Enclosure, NeedKind } from "@/lib/types";
import { effectiveRuleset, resolveRoster } from "@/lib/selectors";
import {
  scoreCandidates,
  enclosurePeriod,
  GROUND_FEED,
  TALL_FEED,
  type Candidate,
  type RankBy,
} from "@/lib/engine";
import { Segmented } from "./ui/segmented";
import { Menu, MenuItem } from "./ui/menu";
import { SpeciesDetailModal } from "./species-detail";

const ACCURACY_TITLE = {
  ok: "Contemporary — this species actually lived in this era/place.",
  hybrid: "Lab hybrid — genetically engineered, no fossil record to check against a timeline.",
  warn: "Anachronism — game-valid, but this species didn't actually live in this era/place.",
};

function AccuracyChip({ candidate }: { candidate: Candidate }) {
  const { accuracy } = candidate;
  if (!accuracy.applies) return null;
  const tone = accuracy.tone === "ok" ? "ok" : accuracy.hybrid ? "hybrid" : "warn";
  const toneClass = {
    ok: "border-ok-line bg-ok-tint text-ok-text",
    hybrid: "border-hyb-line bg-hyb-tint text-hyb-text",
    warn: "border-acc-line bg-acc-tint text-acc-text",
  }[tone];
  return (
    <span
      title={ACCURACY_TITLE[tone]}
      className={`flex flex-none items-center gap-1 rounded-[7px] border px-2 py-1 text-[11px] font-semibold whitespace-nowrap ${toneClass}`}
    >
      {accuracy.chip}
    </span>
  );
}

function statusWordClass(status: Candidate["status"]): string {
  if (status === "recommended") return "text-ok-text";
  if (status === "blocked") return "text-bad-text";
  return "text-muted";
}

/**
 * "Diet" vs "Terrain" filters are a player-facing split, not the same axis as
 * envNeeds' `kind` (which only decides which Build Requirements card a need
 * renders on). Diet = what it eats: real feeders (Meat/Prey/Fish) plus the
 * Ground/Tall paleobotany needs that drive one. Terrain = everything else —
 * ground cover/dressing (Cover, Pasture, Arid, Barren, Wetland) and real dug
 * terrain (Water, Open Water, Deep Water).
 */
function isDietNeed(need: string, kind: NeedKind): boolean {
  return kind === "food" || GROUND_FEED.includes(need) || TALL_FEED.includes(need);
}

/** Single-select dropdown filter chip. Opens right-aligned so the option list
 * doesn't get clipped by the scrolling panel's `overflow-hidden`. */
function FilterMenu({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Menu
      align="right"
      widthClass="min-w-[180px] max-h-[280px] overflow-y-auto pa-scroll"
      trigger={() => (
        <span
          className={`flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap ${
            value ? "border-ok-line bg-ok-tint text-ok-text" : "border-line text-muted hover:text-body"
          }`}
        >
          {value ?? label} ▾
        </span>
      )}
    >
      {(close) => (
        <>
          <MenuItem
            active={value === null}
            onClick={() => {
              onChange(null);
              close();
            }}
          >
            {allLabel}
          </MenuItem>
          {options.map((o) => (
            <MenuItem
              key={o}
              active={value === o}
              onClick={() => {
                onChange(o);
                close();
              }}
            >
              {o}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}

export function CandidateRow({
  candidate,
  enclosureId,
}: {
  candidate: Candidate;
  enclosureId: string;
}) {
  const { state, dispatch } = useApp();
  const { species, status, accuracy } = candidate;
  const hybrid = accuracy.applies && !!accuracy.hybrid;
  const anachronism = accuracy.applies && accuracy.tone === "warn" && !hybrid;
  const [detailOpen, setDetailOpen] = useState(false);

  const parkId = state.enclosures[enclosureId]?.parkId;
  const park = parkId ? state.parks.find((p) => p.id === parkId) : undefined;
  const staged = park?.hatchery.includes(species.id) ?? false;
  const toggleHatchery = () => {
    if (!parkId) return;
    dispatch(
      staged
        ? { type: "REMOVE_FROM_HATCHERY", parkId, speciesId: species.id }
        : { type: "ADD_TO_HATCHERY", parkId, speciesId: species.id },
    );
  };

  const wrapper =
    status === "blocked"
      ? "border-bad-line"
      : hybrid
        ? "border-hyb-line bg-hyb-tint"
        : anachronism
          ? "border-acc-line bg-acc-tint"
          : status === "recommended"
            ? "border-ok-line bg-ok-tint"
            : "border-line bg-card";

  const dotColor =
    status === "recommended"
      ? "var(--pa-ok-dot)"
      : status === "blocked"
        ? "var(--pa-bad-dot)"
        : "var(--pa-dot-neutral)";

  const add = () => dispatch({ type: "ADD_TO_ROSTER", enclosureId, speciesId: species.id });

  return (
    <div className={`shrink-0 overflow-hidden rounded-[10px] border ${wrapper}`}>
      <div className={`flex items-center gap-3 px-3.5 py-3 ${status === "blocked" ? "bg-bad-tint" : ""}`}>
        <span
          className="h-2.5 w-2.5 flex-none rounded-full"
          style={{
            background: dotColor,
            boxShadow: status === "recommended" ? "0 0 8px var(--pa-ok-dot)" : undefined,
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              title="Environment requirements"
              className={`cursor-pointer text-[14px] font-semibold hover:underline ${
                status === "blocked" ? "text-bad-text line-through decoration-bad-dot" : "text-ink"
              }`}
            >
              {species.name}
            </button>
            <span
              className={`pa-mono text-[10px] font-semibold tracking-[0.06em] ${statusWordClass(status)}`}
            >
              {candidate.statusWord}
            </span>
          </div>
          <span
            className={`text-[12px] ${
              hybrid
                ? "text-hyb-text"
                : anachronism
                  ? "text-acc-text"
                  : status === "blocked"
                    ? "text-bad-text"
                    : "text-body"
            }`}
          >
            {candidate.reason}
          </span>
        </div>
        <AccuracyChip candidate={candidate} />
        <span className="pa-mono w-[72px] flex-none text-right text-[12px] whitespace-nowrap text-muted">
          appeal {candidate.appeal}
        </span>
        <span className="h-6 w-px flex-none bg-line" aria-hidden />
        <button
          type="button"
          onClick={toggleHatchery}
          title={staged ? "Remove from hatchery" : "Stage in hatchery"}
          aria-label={staged ? `Remove ${species.name} from hatchery` : `Stage ${species.name} in hatchery`}
          className={`flex flex-none items-center gap-1 whitespace-nowrap rounded-[7px] border px-2.5 py-1.5 text-[11px] font-semibold leading-none ${
            staged
              ? "border-ok-line bg-ok-tint text-ok-text"
              : "border-line text-muted hover:bg-inset hover:text-body"
          }`}
        >
          <span aria-hidden>🥚</span> {staged ? "Staged" : "Stage"}
        </button>
        {status !== "blocked" && (
          <button
            type="button"
            onClick={add}
            className={`flex-none rounded-[7px] px-3 py-1.5 text-[12px] font-semibold ${
              status === "recommended"
                ? "bg-cta text-cta-ink"
                : "border border-line text-body hover:bg-inset"
            }`}
          >
            Add
          </button>
        )}
      </div>

      {status === "blocked" && candidate.repair && (
        <div className="flex items-center gap-2.5 border-t border-bad-line/60 bg-panel px-3.5 py-2.5 pl-9">
          <span className="text-[14px] text-ok-text">↳</span>
          <div className="flex-1 text-[12px] text-body">
            Try <span className="font-semibold text-ink">{candidate.repair.name}</span> —{" "}
            {candidate.repair.reason}.
          </div>
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "ADD_TO_ROSTER", enclosureId, speciesId: candidate.repair!.speciesId })
            }
            className="rounded-[7px] bg-cta px-3 py-1.5 text-[12px] font-semibold text-cta-ink"
          >
            Swap in
          </button>
        </div>
      )}

      {detailOpen && (
        <SpeciesDetailModal species={species} onClose={() => setDetailOpen(false)} />
      )}
    </div>
  );
}

/** Trust affordance: a plain-language answer to "why is this Recommended/Blocked?" */
function ScoringExplainer() {
  return (
    <Menu
      align="left"
      widthClass="min-w-[320px]"
      trigger={() => (
        <span
          className="pa-mono flex h-4 w-4 items-center justify-center rounded-full border border-line text-[10px] text-muted hover:border-line2 hover:text-body"
          title="How scoring works"
        >
          i
        </span>
      )}
    >
      {() => (
        <div className="flex flex-col gap-2.5 px-3 py-2.5 text-[12px] text-body">
          <div className="pa-eyebrow">How Game status is decided</div>
          <p>
            <b className="text-ok-text">Recommended</b> — someone in the roster likes this
            species, or it likes someone already there.
          </p>
          <p>
            <b className="text-ink2">Allowed</b> — no like, no dislike either direction. Neutral,
            not a repair.
          </p>
          <p>
            <b className="text-bad-text">Blocked</b> — a dislike exists somewhere in the roster.
            Every blocked row gets a repair: same family first, then a liked species, then the
            closest appeal.
          </p>
          <div className="mt-1 border-t border-line2 pt-2">
            <b className="text-ink2">Appeal</b>{" "}
            is the species&apos; own in-game appeal stat — the default sort. It never affects
            Game status, only ranking.
          </div>
          <div className="text-muted">
            The accuracy chip (right) is a separate axis — a species can be Recommended and still
            flagged Anachronism or Hybrid.
          </div>
        </div>
      )}
    </Menu>
  );
}

export function Candidates({ enclosure }: { enclosure: Enclosure }) {
  const { state, dispatch } = useApp();
  const { members } = resolveRoster(enclosure);
  const ruleset = effectiveRuleset(state, enclosure);
  const { strict, rankBy } = state.settings;
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [dietNeed, setDietNeed] = useState<string | null>(null);
  const [terrainNeed, setTerrainNeed] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);

  const candidates = useMemo(() => {
    const period = enclosurePeriod(members.map((m) => m.species));
    return scoreCandidates(
      members.map((m) => m.species),
      SPECIES,
      ruleset,
      { strict, rankBy, period },
    );
  }, [members, ruleset, strict, rankBy]);

  const families = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.species.family))).sort(),
    [candidates],
  );
  // "Diet" = what it eats (real feeders + the paleobotany needs that drive
  // one). "Terrain" = everything else — ground dressing and dug terrain.
  // See isDietNeed(); this is a player-facing split, not envNeeds' `kind`.
  const dietNeeds = useMemo(
    () =>
      Array.from(
        new Set(
          candidates.flatMap((c) =>
            c.species.envNeeds.filter((n) => isDietNeed(n.need, n.kind)).map((n) => n.need),
          ),
        ),
      ).sort(),
    [candidates],
  );
  const terrainNeeds = useMemo(
    () =>
      Array.from(
        new Set(
          candidates.flatMap((c) =>
            c.species.envNeeds.filter((n) => !isDietNeed(n.need, n.kind)).map((n) => n.need),
          ),
        ),
      ).sort(),
    [candidates],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (family && c.species.family !== family) return false;
      if (
        dietNeed &&
        !c.species.envNeeds.some((n) => isDietNeed(n.need, n.kind) && n.need === dietNeed)
      )
        return false;
      if (
        terrainNeed &&
        !c.species.envNeeds.some((n) => !isDietNeed(n.need, n.kind) && n.need === terrainNeed)
      )
        return false;
      if (!q) return true;
      return (
        c.species.name.toLowerCase().includes(q) ||
        c.species.family.toLowerCase().includes(q) ||
        (c.species.genus?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [candidates, query, family, dietNeed, terrainNeed]);

  const rosterEmpty = members.length === 0;
  const fitLabel = ruleset.kind === "formation" ? "Formation fit" : "Period fit";
  const filterDescriptors = [
    query.trim() && `“${query.trim()}”`,
    family,
    dietNeed && `eats ${dietNeed}`,
    terrainNeed && `prefers ${terrainNeed}`,
  ].filter((d): d is string => Boolean(d));
  const filtering = filterDescriptors.length > 0;

  // Progressive disclosure: blocked candidates are still scored and counted
  // (never dropped — see lib/AGENTS.md's "nothing is hidden" invariant),
  // just collapsed by default so a big roster doesn't bury the picks that
  // matter. Actively filtering/searching reveals everything, so search still
  // finds a blocked species without an extra click.
  const openCandidates = filtered.filter((c) => c.status !== "blocked");
  const blockedCandidates = filtered.filter((c) => c.status === "blocked");
  const revealBlocked = showBlocked || filtering;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-3 px-5 pt-3 pb-2">
        <span className="text-[14px] font-semibold text-ink2">Candidates</span>
        <ScoringExplainer />
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span
            className="flex items-center gap-1.5"
            title="Game — will they get along? Likes/dislikes decide Recommended/Allowed/Blocked (the dot, left)."
          >
            <span className="h-2 w-2 rounded-full bg-dot-neutral" /> Game
          </span>
          <span
            className="flex items-center gap-1.5"
            title="Reality — did they ever actually coexist? Independent of Game status (the chip, right)."
          >
            <span className="h-3 w-3 rounded-[3px] border border-acc-line" /> Reality
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Segmented<RankBy>
            size="sm"
            value={rankBy}
            onChange={(v) => dispatch({ type: "SET_RANKBY", rankBy: v })}
            options={[
              { value: "appeal", label: "Appeal" },
              { value: "easiest", label: "Easiest" },
              { value: "fit", label: fitLabel },
              { value: "family", label: "Family" },
            ]}
          />
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STRICT", value: !strict })}
            className={`rounded-[7px] border px-2.5 py-1.5 text-[11px] font-semibold ${
              strict ? "border-bad-line bg-bad-tint text-bad-text" : "border-line text-muted hover:text-body"
            }`}
            title="Strict mode collapses Allowed into Blocked — only mutual likes survive"
          >
            Strict
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pb-2">
        <div className="relative min-w-[160px] flex-1">
          <span className="pa-mono pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[12px] text-faint">
            ⌕
          </span>
          <input
            id="candidates-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, family, genus…"
            className="w-full rounded-[7px] border border-line bg-inset py-1.5 pr-2.5 pl-7 text-[12px] text-ink placeholder:text-faint focus:border-line2 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-[12px] text-faint hover:text-body"
            >
              ✕
            </button>
          )}
        </div>
        <FilterMenu
          label="Family"
          allLabel="All families"
          value={family}
          options={families}
          onChange={setFamily}
        />
        <FilterMenu
          label="Diet"
          allLabel="Any diet"
          value={dietNeed}
          options={dietNeeds}
          onChange={setDietNeed}
        />
        <FilterMenu
          label="Terrain"
          allLabel="Any terrain"
          value={terrainNeed}
          options={terrainNeeds}
          onChange={setTerrainNeed}
        />
        {filtering && (
          <span className="text-[11px] whitespace-nowrap text-muted">
            {filtered.length} of {candidates.length}
          </span>
        )}
      </div>

      {rosterEmpty && (
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-[10px] border border-dashed border-dash bg-inset px-4 py-3">
          <span className="text-[15px] text-ok-text">✓</span>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-ink">Everything is Recommended</div>
            <div className="text-[12px] text-muted">
              Empty roster — pick an anchor (usually the highest appeal). Everything opens up from
              there.
            </div>
          </div>
        </div>
      )}

      <div className="pa-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
        {openCandidates.map((c) => (
          <CandidateRow key={c.species.id} candidate={c} enclosureId={enclosure.id} />
        ))}
        {blockedCandidates.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowBlocked((v) => !v)}
              className="flex items-center gap-2 rounded-[8px] border border-dashed border-dash px-3 py-2 text-[12px] font-medium text-muted hover:border-line2 hover:text-body"
            >
              <span aria-hidden>{revealBlocked ? "▴" : "▾"}</span>
              {revealBlocked ? "Hide" : "Show"} {blockedCandidates.length} blocked
              {!revealBlocked && " — each has a repair"}
            </button>
            {revealBlocked &&
              blockedCandidates.map((c) => (
                <CandidateRow key={c.species.id} candidate={c} enclosureId={enclosure.id} />
              ))}
          </>
        )}
        {candidates.length === 0 && (
          <div className="px-2 py-6 text-center text-[12px] text-muted">
            No compatible candidates for this habitat.
          </div>
        )}
        {candidates.length > 0 && filtered.length === 0 && (
          <div className="px-2 py-6 text-center text-[12px] text-muted">
            No candidates match {filterDescriptors.join(" · ")}.
          </div>
        )}
        <div className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-faint">
          <span className="inline-block h-2 w-2 rounded-[2px] border border-dotted border-faint" />
          period &amp; dig-site data —{" "}
          <span className="cursor-help border-b border-dotted border-faint">
            src: {MANIFEST.source}
          </span>
        </div>
      </div>
    </section>
  );
}
