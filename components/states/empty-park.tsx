"use client";

import { useApp } from "@/lib/store";
import { RULESETS, getRuleset } from "@/lib/data";
import type { Park } from "@/lib/types";
import { Menu, MenuItem } from "./../ui/menu";
import { shortRulesetLabel } from "./../ruleset-control";

const DOORS = [
  {
    icon: "🦖",
    title: "Build around a species I love",
    body: "Start from an anchor, find what can join.",
  },
  {
    icon: "🌿",
    title: "Fill an enclosure to a theme",
    body: "A geologic period, or a single dig-site formation.",
  },
  {
    icon: "🔍",
    title: "Audit a plan I already have",
    body: "Check for conflicts and gaps.",
  },
];

/**
 * §9 "Empty park" — an invitation, not an apology. The three jobs are doors,
 * and the ruleset can be chosen inline (Sandbox by default).
 */
export function EmptyPark({ park }: { park: Park }) {
  const { dispatch } = useApp();
  const ruleset = getRuleset(park.rulesetId);

  return (
    <div className="pa-card-shadow w-full max-w-[560px] rounded-[var(--radius-card)] border border-line bg-card p-7">
      <h3 className="text-[20px] font-bold text-ink">
        {park.name} is empty. Where do you want to start?
      </h3>
      <p className="mt-1.5 mb-4 text-[13px] text-muted">
        Pick a park ruleset now, or leave it Sandbox and change it later.
      </p>

      <div className="flex flex-col gap-2.5">
        {DOORS.map((d, i) => (
          <button
            key={d.title}
            type="button"
            onClick={() => dispatch({ type: "NEW_ENCLOSURE", parkId: park.id })}
            className={`flex items-center gap-3 rounded-[10px] border border-line px-4 py-3 text-left hover:border-cta/40 ${
              i === 0 ? "bg-inset" : ""
            }`}
          >
            <span className="text-[18px]" aria-hidden>
              {d.icon}
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-semibold text-ink2">{d.title}</span>
              <span className="block text-[12px] text-muted">{d.body}</span>
            </span>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <span className="pa-eyebrow text-rule-text">Ruleset</span>
        <Menu
          widthClass="min-w-[260px]"
          trigger={() => (
            <span className="rounded-[7px] bg-rule-fill px-3 py-1 text-[12px] font-semibold text-rule-ink">
              {shortRulesetLabel(ruleset)}
            </span>
          )}
        >
          {(close) => (
            <div className="pa-scroll max-h-[280px] overflow-y-auto">
              {RULESETS.map((r) => (
                <MenuItem
                  key={r.id}
                  active={r.id === park.rulesetId}
                  onClick={() => {
                    dispatch({ type: "SET_PARK_RULESET", parkId: park.id, rulesetId: r.id });
                    close();
                  }}
                >
                  {r.label}
                </MenuItem>
              ))}
            </div>
          )}
        </Menu>
        <span className="text-[12px] font-medium text-link">Choose period / formation…</span>
      </div>
    </div>
  );
}
