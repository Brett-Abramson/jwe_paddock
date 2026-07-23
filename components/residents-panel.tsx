"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import type { Enclosure, RosterEntry } from "@/lib/types";
import { activePark, parkEnclosures, resolveRoster } from "@/lib/selectors";
import {
  rosterConflicts,
  terrainSpacePlan,
  type RosterMember,
  type SpacePlanRow,
} from "@/lib/engine";
import { formatArea, PLANTS } from "@/lib/data";
import { Menu } from "./ui/menu";
import { Stepper } from "./ui/stepper";
import { SpeciesDetailModal } from "./species-detail";
import { BIOME_VAR } from "./biome-colors";

/** ×count · sex split, e.g. "×3 · 2♀ 1♂" — mono, matching the design. */
function sexLabel(m: RosterMember): string {
  const parts: string[] = [];
  if (m.females > 0) parts.push(`${m.females}♀`);
  if (m.males > 0) parts.push(`${m.males}♂`);
  const split = parts.length ? ` · ${parts.join(" ")}` : "";
  return `×${m.count}${split}`;
}

/**
 * The whole row opens species detail (click anywhere). The count/sex + ⋯
 * cluster is a single Menu trigger that opens edit/move/remove instead — it
 * stops the row's own click so the two don't both fire.
 */
function ResidentRow({
  member,
  enclosureId,
  conflicted,
}: {
  member: RosterMember;
  enclosureId: string;
  conflicted: boolean;
}) {
  const { state, dispatch } = useApp();
  const { species } = member;
  const [detailOpen, setDetailOpen] = useState(false);
  // Moving a species is the only way to create a roster conflict — Candidates
  // never offer one (see the "conflict in roster" state).
  const others = parkEnclosures(state, activePark(state)).filter((e) => e.id !== enclosureId);

  return (
    <div
      onClick={() => setDetailOpen(true)}
      title="Species detail — terrain, food & how needs scale with population"
      className="flex cursor-pointer items-center gap-2.5 border-b border-line2 px-3.5 py-2.5 last:border-b-0 hover:bg-inset/50"
    >
      <span
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: conflicted ? "var(--pa-bad-dot)" : "var(--pa-ok-dot)" }}
      />
      <span className="text-[13px] font-semibold text-ink decoration-dotted decoration-muted underline-offset-2 hover:underline">
        {species.name}
      </span>
      <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
        <Menu
          align="right"
          widthClass="min-w-[230px]"
          trigger={() => (
            <span className="flex items-center gap-2 rounded-[6px] px-1.5 py-1 hover:bg-inset">
              <span className="pa-mono text-[11px] text-body">{sexLabel(member)}</span>
              {member.juveniles > 0 && (
                <span className="pa-mono rounded-[5px] bg-juv-header px-1.5 text-[10px] text-juv-text">
                  +{member.juveniles} juv
                </span>
              )}
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[15px] text-muted">
                ⋯
              </span>
            </span>
          )}
        >
          {(close) => (
            <div className="flex flex-col gap-2.5 p-2">
              <div className="text-[13px] font-semibold text-ink">{species.name}</div>
              <div className="pa-mono text-[10px] text-muted">
                {species.period} · {species.family}
              </div>
              <Stepper
                label="Total"
                value={member.count}
                min={1}
                onChange={(count) =>
                  dispatch({ type: "SET_COUNT", enclosureId, speciesId: species.id, count })
                }
              />
              <Stepper
                label="Female"
                value={member.females}
                onChange={(females) =>
                  dispatch({
                    type: "SET_SEXES",
                    enclosureId,
                    speciesId: species.id,
                    females,
                    males: member.males,
                  })
                }
              />
              <Stepper
                label="Male"
                value={member.males}
                onChange={(males) =>
                  dispatch({
                    type: "SET_SEXES",
                    enclosureId,
                    speciesId: species.id,
                    females: member.females,
                    males,
                  })
                }
              />
              <Stepper
                label="Juvenile"
                value={member.juveniles}
                onChange={(juveniles) =>
                  dispatch({ type: "SET_JUVENILES", enclosureId, speciesId: species.id, juveniles })
                }
              />
              {others.length > 0 && (
                <div className="mt-1 border-t border-line2 pt-2">
                  <div className="pa-eyebrow pb-1">Move to</div>
                  <div className="flex flex-col">
                    {others.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          dispatch({
                            type: "MOVE_MEMBER",
                            fromEnclosureId: enclosureId,
                            toEnclosureId: e.id,
                            speciesId: species.id,
                          });
                          close();
                        }}
                        className="rounded-[6px] px-2 py-1.5 text-left text-[12px] text-body hover:bg-inset"
                      >
                        {e.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "REMOVE_FROM_ROSTER", enclosureId, speciesId: species.id });
                  close();
                }}
                className="mt-1 rounded-[7px] border border-bad-line py-1.5 text-[12px] font-semibold text-bad-text hover:bg-bad-tint"
              >
                Remove from roster
              </button>
            </div>
          )}
        </Menu>
      </span>
      {detailOpen && (
        <SpeciesDetailModal species={species} onClose={() => setDetailOpen(false)} />
      )}
    </div>
  );
}

function DriftRow({ entry }: { entry: RosterEntry }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-dashed border-dash px-3.5 py-2.5 last:border-b-0">
      <span className="h-2 w-2 flex-none rounded-full border border-dash" />
      <span className="text-[13px] text-muted">
        <span className="text-faint">“</span>
        {entry.speciesId}
        <span className="text-faint">”</span>
      </span>
      <span className="pa-mono ml-auto rounded-[5px] border border-acc-line bg-acc-tint px-1.5 py-0.5 text-[10px] text-acc-text">
        not in dataset
      </span>
    </div>
  );
}

/** The pinned Terrain space plan: a stacked bar of biome shares + legend. */
function SpacePlan({ rows }: { rows: SpacePlanRow[] }) {
  const total = rows.reduce((sum, r) => sum + r.area, 0);
  if (total === 0) return null;
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] font-semibold text-ink2">Terrain space plan</span>
        <span className="text-[12px] text-body">share of enclosure ground</span>
      </div>
      <div
        className="flex h-[15px] overflow-hidden rounded-[6px] border border-line2"
        role="img"
        aria-label={`Terrain split: ${rows.map((r) => `${r.need} ${r.pct}%`).join(", ")}`}
      >
        {rows.map((r, i) => (
          <div
            key={r.need}
            className={i > 0 ? "border-l border-app" : undefined}
            style={{ width: `${(r.area / total) * 100}%`, background: BIOME_VAR[r.biome] }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 text-[13px] text-ink2">
        {rows.map((r) => (
          <span key={r.need} className="flex items-center gap-1.5" title={formatArea(r.area)}>
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: BIOME_VAR[r.biome] }}
            />
            {r.need} {r.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** "In this enclosure" — the roster editor (was a chip strip). One row per
 * species: click the row to inspect, ⋯ (or the count/sex next to it) to
 * mutate. Terrain space plan pinned below.
 *
 * No `overflow-hidden` on the outer card: a resident's ⋯ popover can run
 * taller than the card itself, and clipping it there is exactly what made it
 * unreachable before. Rows have no background of their own, so the sharp
 * corners this leaves don't show against the card's rounded border. */
export function ResidentsPanel({ enclosure }: { enclosure: Enclosure }) {
  const { members, unknown } = resolveRoster(enclosure);
  const speciesCount = members.length + unknown.length;

  if (speciesCount === 0) return null;

  const conflicted = new Set(
    rosterConflicts(members).flatMap((c) => [c.a.id, c.b.id]),
  );
  const spacePlan = terrainSpacePlan(members, PLANTS);
  const animals = members.reduce((n, m) => n + m.count + m.juveniles, 0);

  const focusCandidates = () => {
    const el = document.getElementById("candidates-search");
    el?.scrollIntoView({ block: "nearest" });
    el?.focus();
  };

  return (
    <div className="rounded-[12px] border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line2 px-3.5 py-2.5">
        <span className="pa-eyebrow">
          In this enclosure{" "}
          <span className="text-faint">
            · {speciesCount} {speciesCount === 1 ? "species" : "species"} · {animals}{" "}
            {animals === 1 ? "animal" : "animals"}
          </span>
        </span>
        <button
          type="button"
          onClick={focusCandidates}
          className="text-[11px] font-semibold text-link hover:underline"
        >
          ＋ Add dino
        </button>
      </div>
      {members.map((m) => (
        <ResidentRow
          key={m.species.id}
          member={m}
          enclosureId={enclosure.id}
          conflicted={conflicted.has(m.species.id)}
        />
      ))}
      {unknown.map((e) => (
        <DriftRow key={e.speciesId} entry={e} />
      ))}
      {spacePlan.length > 0 && (
        <div className="px-3.5 pt-1.5 pb-3.5">
          <SpacePlan rows={spacePlan} />
        </div>
      )}
    </div>
  );
}
