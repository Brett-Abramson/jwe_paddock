"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { MANIFEST, PLANTS } from "@/lib/data";
import {
  activePark,
  parkEnclosures,
  effectiveRuleset,
  resolveRoster,
  enclosureRulesetInfo,
  isParkCustom,
} from "@/lib/selectors";
import { enclosureHealth } from "@/lib/engine";
import type { Enclosure } from "@/lib/types";
import { Menu, MenuItem } from "./ui/menu";
import { shortRulesetLabel } from "./ruleset-control";

function HealthStrip({ enclosure }: { enclosure: Enclosure }) {
  const { state } = useApp();
  const { members } = resolveRoster(enclosure);
  const ruleset = effectiveRuleset(state, enclosure);
  const h = enclosureHealth(members, ruleset, PLANTS);
  const sep = <span className="text-faint">·</span>;

  if (h.lifestyle !== "land") {
    return (
      <div className="pa-mono flex items-center gap-1.5 text-[10px] text-sea-text">
        <span className="inline-block h-[7px] w-[7px] rounded-full bg-sea-accent" />
        {h.lifestyle === "marine" ? "Lagoon" : "Aviary"}
      </div>
    );
  }

  return (
    <div className="pa-mono flex flex-wrap items-center gap-1.5 text-[10px]">
      <span
        className={`flex items-center gap-1 ${h.conflicts > 0 ? "text-bad-text" : "text-ok-text"}`}
      >
        <span
          className="inline-block h-[7px] w-[7px] rounded-full"
          style={{ background: h.conflicts > 0 ? "var(--pa-bad-dot)" : "var(--pa-ok-dot)" }}
        />
        {h.conflicts}
      </span>
      {sep}
      <span className="text-body">Fence {h.fenceTier}</span>
      {sep}
      <span className="text-muted">{h.plantCount} plants</span>
      {h.anachronismCount > 0 && (
        <>
          {sep}
          <span className="flex items-center gap-1 text-acc-text">
            <span
              className="inline-block h-[7px] w-[7px] rounded-full"
              style={{ background: "var(--pa-acc-dot)" }}
            />
            {h.anachronismCount} anach.
          </span>
        </>
      )}
    </div>
  );
}

function EnclosureItem({ enclosure, showRuleset }: { enclosure: Enclosure; showRuleset: boolean }) {
  const { state, dispatch } = useApp();
  const selected = state.activeEnclosureId === enclosure.id;
  const headcount = enclosure.roster.reduce((n, r) => n + r.count, 0);
  const { ruleset, inherited } = enclosureRulesetInfo(state, enclosure);

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: "SELECT_ENCLOSURE", enclosureId: enclosure.id })}
      className={`flex flex-col gap-1.5 rounded-[9px] px-3 py-2.5 text-left ${
        selected
          ? "border border-cta/50 bg-inset"
          : "border border-transparent hover:bg-panel"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[13px] ${selected ? "font-semibold text-ink" : "font-medium text-body"}`}
        >
          {enclosure.name}
        </span>
        <span className="pa-mono text-[10px] text-muted">{headcount}</span>
      </div>
      <HealthStrip enclosure={enclosure} />
      {showRuleset && (
        <span
          className={`pa-mono flex w-fit items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[10px] ${
            inherited
              ? "border-line text-muted"
              : "border-rule-line bg-rule-tint text-rule-text"
          }`}
        >
          {inherited ? <span aria-hidden>🔗</span> : <span aria-hidden>⚑</span>}
          {shortRulesetLabel(ruleset)}
        </span>
      )}
    </button>
  );
}

export function ParkRail() {
  const { state, dispatch } = useApp();
  const park = activePark(state);
  if (!park) return null;
  const enclosures = parkEnclosures(state, park);
  // Once a park is Custom, every enclosure declares which ruleset it follows.
  const custom = isParkCustom(state, park);

  return (
    <aside className="flex min-h-0 flex-col border-r border-line2 bg-panel">
      {/* park switcher */}
      <div className="border-b border-line2 px-3 py-3">
        <Menu
          widthClass="min-w-[240px]"
          trigger={() => (
            <span className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 hover:bg-inset">
              <span className="flex flex-col">
                <span className="pa-eyebrow">Park</span>
                <span className="text-[15px] font-bold text-ink">{park.name}</span>
              </span>
              <span className="text-muted">⌄</span>
            </span>
          )}
        >
          {(close) => (
            <>
              {state.parks.map((p) => (
                <MenuItem
                  key={p.id}
                  active={p.id === park.id}
                  onClick={() => {
                    dispatch({ type: "SELECT_PARK", parkId: p.id });
                    close();
                  }}
                >
                  <span className="flex-1">{p.name}</span>
                  <span className="pa-mono text-[10px] text-muted">
                    {p.enclosureIds.length}
                  </span>
                </MenuItem>
              ))}
              <div className="my-1 h-px bg-line2" />
              <MenuItem
                onClick={() => {
                  dispatch({ type: "NEW_PARK" });
                  close();
                }}
              >
                <span className="text-link">+ New park</span>
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      {/* enclosure list */}
      <div className="pa-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-3">
        <div className="flex items-center justify-between px-1.5 pb-1">
          <span className="pa-eyebrow">Enclosures</span>
          <button
            type="button"
            onClick={() => dispatch({ type: "NEW_ENCLOSURE", parkId: park.id })}
            className="pa-mono text-[11px] text-link hover:opacity-80"
            title="Add enclosure"
          >
            + Add
          </button>
        </div>
        {enclosures.map((e) => (
          <EnclosureItem key={e.id} enclosure={e} showRuleset={custom} />
        ))}
        {custom && (
          <div className="flex items-start gap-1.5 px-2 pt-2 text-[11px] text-muted">
            <span className="text-link" aria-hidden>
              ↺
            </span>
            Reset an enclosure to re-inherit the park default anytime.
          </div>
        )}
        {enclosures.length === 0 && (
          <div className="px-2 py-4 text-[12px] text-muted">
            No enclosures yet. Add one to start planning.
          </div>
        )}
      </div>

      {/* footer */}
      <div className="flex flex-col gap-2 border-t border-line2 px-4 py-3 text-[12px] text-muted">
        <div className="flex items-center gap-2">
          <span aria-hidden>🗂</span> Hatchery — {park.hatchery.length} staged
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden>📚</span> Species library
        </div>
        <Link href="/states" className="flex items-center gap-2 text-muted hover:text-body">
          <span aria-hidden>◳</span> §9 states reference
        </Link>
        <div className="pa-mono pt-1 text-[10px] text-faint">
          data as of · {MANIFEST.asOf} · {MANIFEST.speciesCount} species
        </div>
      </div>
    </aside>
  );
}
