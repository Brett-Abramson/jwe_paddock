"use client";

import { useRef, useState } from "react";
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
import type { Enclosure, Park } from "@/lib/types";
import { Menu, MenuItem } from "./ui/menu";
import { shortRulesetLabel } from "./ruleset-control";
import { HatcheryPanel } from "./hatchery-panel";

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
        title="Roster conflicts — pairs of species in this enclosure that dislike each other"
        className={`flex items-center gap-1 ${h.conflicts > 0 ? "text-bad-text" : "text-ok-text"}`}
      >
        <span
          className="inline-block h-[7px] w-[7px] rounded-full"
          style={{ background: h.conflicts > 0 ? "var(--pa-bad-dot)" : "var(--pa-ok-dot)" }}
        />
        {h.conflicts}
      </span>
      {sep}
      <span className="text-body" title="Fence tier required — set by the roster's highest security rating">
        Fence {h.fenceTier}
      </span>
      {sep}
      <span
        className="text-muted"
        title="Distinct plants needed to cover this roster's habitat needs"
      >
        {h.plantCount} plants
      </span>
      {h.anachronismCount > 0 && (
        <>
          {sep}
          <span
            className="flex items-center gap-1 text-acc-text"
            title="Anachronisms + lab hybrids — species that don't fit this ruleset's period, formation, or timeline at all"
          >
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

function DeleteEnclosureConfirm({
  enclosure,
  onCancel,
  close,
}: {
  enclosure: Enclosure;
  onCancel: () => void;
  close: () => void;
}) {
  const { dispatch } = useApp();
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="text-[12px] text-body">
        Delete <span className="font-semibold text-ink">{enclosure.name}</span>? Its planned
        roster goes with it.
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[6px] border border-line px-2 py-1.5 text-[12px] text-body hover:bg-inset"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "DELETE_ENCLOSURE", enclosureId: enclosure.id });
            close();
          }}
          className="flex-1 rounded-[6px] border border-bad-line bg-bad-tint px-2 py-1.5 text-[12px] font-semibold text-bad-text hover:opacity-90"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EnclosureMenuContent({
  enclosure,
  onRename,
  close,
}: {
  enclosure: Enclosure;
  onRename: () => void;
  close: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <DeleteEnclosureConfirm
        enclosure={enclosure}
        onCancel={() => setConfirmDelete(false)}
        close={close}
      />
    );
  }

  return (
    <>
      <MenuItem onClick={onRename}>Rename</MenuItem>
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className="w-full rounded-[6px] px-3 py-2 text-left text-[13px] text-bad-text hover:bg-bad-tint"
      >
        Delete enclosure
      </button>
    </>
  );
}

function ParkRow({
  park,
  active,
  onSelect,
  close,
}: {
  park: Park;
  active: boolean;
  onSelect: () => void;
  close: () => void;
}) {
  const { dispatch } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(park.name);
  // This row lives inside a Menu popover, which closes (and unmounts this
  // input) on the same outside "mousedown" that would blur it — the blur's
  // default action runs after that, too late to commit. Rename live on every
  // keystroke instead of on blur, so there's nothing left to race.
  const originalName = useRef(park.name);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!editing) {
          onSelect();
          close();
        }
      }}
      onKeyDown={(e) => {
        if (!editing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
          close();
        }
      }}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[13px] ${
        active ? "bg-inset text-ink" : "text-body hover:bg-inset"
      }`}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => {
            const value = e.target.value;
            setDraft(value);
            const trimmed = value.trim();
            if (trimmed) dispatch({ type: "RENAME_PARK", parkId: park.id, name: trimmed });
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") setEditing(false);
            if (e.key === "Escape") {
              dispatch({ type: "RENAME_PARK", parkId: park.id, name: originalName.current });
              setDraft(originalName.current);
              setEditing(false);
            }
          }}
          onBlur={() => setEditing(false)}
          className="min-w-0 flex-1 rounded-[5px] border border-line bg-app px-1.5 py-0.5 text-[13px] font-medium text-ink focus:outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{park.name}</span>
      )}
      <span className="pa-mono flex-none text-[10px] text-muted">{park.enclosureIds.length}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          originalName.current = park.name;
          setDraft(park.name);
          setEditing(true);
        }}
        title="Rename park"
        aria-label={`Rename ${park.name}`}
        className="flex-none cursor-pointer rounded-[5px] px-1 py-0.5 text-[12px] text-muted hover:bg-app/40 hover:text-body"
      >
        ✎
      </button>
    </div>
  );
}

function EnclosureItem({ enclosure, showRuleset }: { enclosure: Enclosure; showRuleset: boolean }) {
  const { state, dispatch } = useApp();
  const selected = state.activeEnclosureId === enclosure.id;
  const headcount = enclosure.roster.reduce((n, r) => n + r.count, 0);
  const { ruleset, inherited } = enclosureRulesetInfo(state, enclosure);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(enclosure.name);

  const select = () => dispatch({ type: "SELECT_ENCLOSURE", enclosureId: enclosure.id });

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== enclosure.name) {
      dispatch({ type: "RENAME_ENCLOSURE", enclosureId: enclosure.id, name: trimmed });
    } else {
      setDraft(enclosure.name);
    }
    setEditing(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!editing) select();
      }}
      onKeyDown={(e) => {
        if (!editing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          select();
        }
      }}
      className={`flex cursor-pointer flex-col gap-1.5 rounded-[9px] px-3 py-2.5 text-left ${
        selected
          ? "border border-cta/50 bg-inset"
          : "border border-transparent hover:bg-panel"
      }`}
    >
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(enclosure.name);
                setEditing(false);
              }
            }}
            onBlur={commitRename}
            className="min-w-0 flex-1 rounded-[5px] border border-line bg-inset px-1.5 py-0.5 text-[13px] font-semibold text-ink focus:outline-none"
          />
        ) : (
          <span
            className={`min-w-0 flex-1 truncate text-[13px] ${selected ? "font-semibold text-ink" : "font-medium text-body"}`}
          >
            {enclosure.name}
          </span>
        )}
        <span className="pa-mono flex-none text-[10px] text-muted">{headcount}</span>
        {/* Menu's own toggle button lives between this stopPropagation guard and
            the trigger content, so the guard must wrap the whole Menu — putting
            it on the trigger span instead would also swallow Menu's own click. */}
        <div onClick={(e) => e.stopPropagation()} className="flex-none">
          <Menu
            align="right"
            widthClass="min-w-[170px]"
            trigger={() => (
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-muted hover:bg-app/40 hover:text-body">
                ⋯
              </span>
            )}
          >
            {(close) => (
              <EnclosureMenuContent
                enclosure={enclosure}
                onRename={() => {
                  setDraft(enclosure.name);
                  setEditing(true);
                  close();
                }}
                close={close}
              />
            )}
          </Menu>
        </div>
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
    </div>
  );
}

export function ParkRail() {
  const { state, dispatch } = useApp();
  const park = activePark(state);
  const [hatcheryOpen, setHatcheryOpen] = useState(false);
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
                <ParkRow
                  key={p.id}
                  park={p}
                  active={p.id === park.id}
                  onSelect={() => dispatch({ type: "SELECT_PARK", parkId: p.id })}
                  close={close}
                />
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
        <button
          type="button"
          onClick={() => setHatcheryOpen(true)}
          className="flex items-center gap-2 text-left hover:text-body"
        >
          <span aria-hidden>🗂</span> Hatchery — {park.hatchery.length} staged
        </button>
        <div className="flex items-center gap-2">
          <span aria-hidden>📚</span> Species library
        </div>
        <Link
          href="/states"
          className="flex items-center gap-2 text-muted hover:text-body"
          title="A live gallery of every edge-case state a build has to handle — empty, conflicted, hybrid, marine, and more"
        >
          <span aria-hidden>◳</span> §9 states reference
        </Link>
        <div className="pa-mono pt-1 text-[10px] text-faint">
          data as of · {MANIFEST.asOf} · {MANIFEST.speciesCount} species
        </div>
      </div>

      {hatcheryOpen && <HatcheryPanel park={park} onClose={() => setHatcheryOpen(false)} />}
    </aside>
  );
}
