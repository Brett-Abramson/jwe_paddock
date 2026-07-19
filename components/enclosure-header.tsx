"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import type { Enclosure, RosterEntry, Species } from "@/lib/types";
import { activePark, parkEnclosures, resolveRoster } from "@/lib/selectors";
import { enclosurePeriod, type RosterMember } from "@/lib/engine";
import { Menu } from "./ui/menu";
import { Segmented } from "./ui/segmented";
import { Stepper } from "./ui/stepper";
import { RulesetControl } from "./ruleset-control";
import { SpeciesDetailModal } from "./species-detail";

function dietDot(species: Species): string {
  const d = species.diet.join(" ").toLowerCase();
  if (/piscivore|shoal|shark/.test(d)) return "var(--pa-sea-accent)";
  if (/carnivore|live prey/.test(d)) return "var(--pa-bad-dot)";
  return "var(--pa-ok-dot)";
}

function RosterChip({
  member,
  enclosureId,
  showJuveniles,
}: {
  member: RosterMember;
  enclosureId: string;
  showJuveniles: boolean;
}) {
  const { state, dispatch } = useApp();
  const { species } = member;
  // Moving a species is the only way to create a roster conflict — Candidates
  // never offer one (see the "conflict in roster" state).
  const others = parkEnclosures(state, activePark(state)).filter((e) => e.id !== enclosureId);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-[20px] border border-line bg-inset py-1 pr-1.5 pl-2.5 text-[12px] text-ink2">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dietDot(species) }}
      />
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        title="Environment requirements"
        className="cursor-pointer hover:underline"
      >
        {species.name}
      </button>
      <span className="pa-mono text-[11px] text-muted">×{member.count}</span>
      {showJuveniles && member.juveniles > 0 && (
        <span className="pa-mono rounded-[9px] bg-juv-header px-1.5 text-[10px] text-juv-text">
          +{member.juveniles} juv
        </span>
      )}
      <Menu
        align="right"
        widthClass="min-w-[230px]"
        trigger={() => (
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-app/40 hover:text-body">
            ⋯
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
      {detailOpen && (
        <SpeciesDetailModal species={species} onClose={() => setDetailOpen(false)} />
      )}
    </div>
  );
}

function DriftChip({ entry }: { entry: RosterEntry }) {
  return (
    <span className="flex items-center gap-2 rounded-[20px] border border-dashed border-dash bg-inset px-3 py-1 text-[12px] text-muted">
      <span className="text-faint">?</span>
      &ldquo;{entry.speciesId}&rdquo;
      <span className="pa-mono rounded-[5px] border border-acc-line bg-acc-tint px-1.5 py-0.5 text-[10px] text-acc-text">
        not in dataset
      </span>
    </span>
  );
}

export function EnclosureHeader({ enclosure }: { enclosure: Enclosure }) {
  const { dispatch } = useApp();
  const { members, unknown } = resolveRoster(enclosure);
  const period = enclosurePeriod(members.map((m) => m.species));
  const juvenileActive = enclosure.juvenileMode === "juveniles";

  return (
    <div className="flex flex-col gap-3 border-b border-line2 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink">{enclosure.name}</h2>
        <span className="pa-mono rounded-[5px] border border-line px-1.5 py-0.5 text-[10px] text-muted">
          {enclosure.territories} {enclosure.territories === 1 ? "territory" : "territories"}
        </span>
        {period && (
          <span className="pa-mono rounded-[5px] border border-rule-line px-1.5 py-0.5 text-[10px] text-rule-text">
            Period · {period}
          </span>
        )}
        <RulesetControl enclosure={enclosure} />
        {juvenileActive && (
          <span className="pa-mono rounded-[5px] border border-juv-line bg-inset px-1.5 py-0.5 text-[10px] text-juv-text">
            Juveniles
          </span>
        )}
        <div className="ml-auto">
          <Segmented
            size="sm"
            tone="juv"
            value={enclosure.juvenileMode}
            onChange={(mode) =>
              dispatch({ type: "SET_JUVENILE_MODE", enclosureId: enclosure.id, mode })
            }
            options={[
              { value: "adults", label: "Adults" },
              { value: "pair", label: "Pair" },
              { value: "juveniles", label: "+ Juveniles" },
            ]}
          />
        </div>
      </div>

      {(members.length > 0 || unknown.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {members.map((m) => (
            <RosterChip
              key={m.species.id}
              member={m}
              enclosureId={enclosure.id}
              showJuveniles={juvenileActive}
            />
          ))}
          {unknown.map((e) => (
            <DriftChip key={e.speciesId} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
