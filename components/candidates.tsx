"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { SPECIES, MANIFEST } from "@/lib/data";
import type { Enclosure } from "@/lib/types";
import { effectiveRuleset, resolveRoster } from "@/lib/selectors";
import { scoreCandidates, enclosurePeriod, type Candidate, type RankBy } from "@/lib/engine";
import { Segmented } from "./ui/segmented";
import { Menu, MenuItem } from "./ui/menu";
import { SpeciesDetailModal } from "./species-detail";

function AccuracyChip({ candidate }: { candidate: Candidate }) {
  const { accuracy } = candidate;
  if (!accuracy.applies) return null;
  const ok = accuracy.tone === "ok";
  return (
    <span
      className={`flex flex-none items-center gap-1 rounded-[7px] border px-2 py-1 text-[11px] font-semibold whitespace-nowrap ${
        ok
          ? "border-ok-line bg-ok-tint text-ok-text"
          : "border-acc-line bg-acc-tint text-acc-text"
      }`}
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
  const anachronism = accuracy.applies && accuracy.tone === "warn";
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
              className={`text-[14px] font-semibold hover:underline ${
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
              anachronism ? "text-acc-text" : status === "blocked" ? "text-bad-text" : "text-body"
            }`}
          >
            {candidate.reason}
          </span>
        </div>
        <AccuracyChip candidate={candidate} />
        <span className="pa-mono w-[72px] flex-none text-right text-[12px] whitespace-nowrap text-muted">
          appeal {candidate.appeal}
        </span>
        <button
          type="button"
          onClick={toggleHatchery}
          title={staged ? "Remove from hatchery" : "Stage in hatchery"}
          aria-label={staged ? `Remove ${species.name} from hatchery` : `Stage ${species.name} in hatchery`}
          className={`flex-none rounded-[7px] border px-2.5 py-1.5 text-[13px] leading-none ${
            staged
              ? "border-ok-line bg-ok-tint text-ok-text"
              : "border-line text-muted hover:bg-inset hover:text-body"
          }`}
        >
          🥚
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

export function Candidates({ enclosure }: { enclosure: Enclosure }) {
  const { state, dispatch } = useApp();
  const { members } = resolveRoster(enclosure);
  const ruleset = effectiveRuleset(state, enclosure);
  const { strict, rankBy } = state.settings;
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [plantNeed, setPlantNeed] = useState<string | null>(null);
  const [terrainNeed, setTerrainNeed] = useState<string | null>(null);

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
  // Real feeder-plant labels (e.g. "Ground Leaf", "Cover") and terrain needs
  // (e.g. "Wetland") from envNeeds — the dataset has no grassland/forest
  // terrain category, so those aren't offered here.
  const plantNeeds = useMemo(
    () =>
      Array.from(
        new Set(
          candidates.flatMap((c) =>
            c.species.envNeeds.filter((n) => n.kind === "plant").map((n) => n.need),
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
            c.species.envNeeds.filter((n) => n.kind === "terrain").map((n) => n.need),
          ),
        ),
      ).sort(),
    [candidates],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (family && c.species.family !== family) return false;
      if (plantNeed && !c.species.envNeeds.some((n) => n.kind === "plant" && n.need === plantNeed))
        return false;
      if (
        terrainNeed &&
        !c.species.envNeeds.some((n) => n.kind === "terrain" && n.need === terrainNeed)
      )
        return false;
      if (!q) return true;
      return (
        c.species.name.toLowerCase().includes(q) ||
        c.species.family.toLowerCase().includes(q) ||
        (c.species.genus?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [candidates, query, family, plantNeed, terrainNeed]);

  const rosterEmpty = members.length === 0;
  const fitLabel = ruleset.kind === "formation" ? "Formation fit" : "Period fit";
  const filterDescriptors = [
    query.trim() && `“${query.trim()}”`,
    family,
    plantNeed && `eats ${plantNeed}`,
    terrainNeed && `prefers ${terrainNeed}`,
  ].filter((d): d is string => Boolean(d));
  const filtering = filterDescriptors.length > 0;

  return (
    <section className="flex min-h-0 flex-col overflow-hidden border-r border-line2">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-3 px-5 pt-3 pb-2">
        <span className="text-[14px] font-semibold text-ink2">Candidates</span>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-dot-neutral" /> Game
          </span>
          <span className="flex items-center gap-1.5">
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
          value={plantNeed}
          options={plantNeeds}
          onChange={setPlantNeed}
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
        {filtered.map((c) => (
          <CandidateRow key={c.species.id} candidate={c} enclosureId={enclosure.id} />
        ))}
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
