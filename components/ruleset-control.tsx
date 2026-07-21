"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { RULESETS, getRuleset } from "@/lib/data";
import type { Enclosure, Ruleset } from "@/lib/types";
import { activePark, enclosureRulesetInfo, isParkCustom } from "@/lib/selectors";
import { Menu } from "./ui/menu";

/** "Period · Late Cretaceous" -> "Late Cretaceous" */
export function shortRulesetLabel(r: Ruleset | undefined): string {
  if (!r) return "Sandbox";
  return r.label.replace(/^(Period|Formation)\s*·\s*/, "");
}

/**
 * Enclosure-level ruleset control (Turn 3).
 *   inherited  → "{ruleset} · inherited from park" with a 🔗 and a Change action
 *   override   → picking a clashing ruleset warns *before* applying, because the
 *                first clash converts the whole park to Custom
 *   custom     → each enclosure carries its own chip; reset re-inherits
 */
export function RulesetControl({ enclosure }: { enclosure: Enclosure }) {
  const { state, dispatch } = useApp();
  const park = activePark(state);
  const { ruleset, inherited } = enclosureRulesetInfo(state, enclosure);
  const parkRuleset = park ? getRuleset(park.rulesetId) : undefined;
  const parkIsCustom = isParkCustom(state, park);
  const [pending, setPending] = useState<Ruleset | null>(null);

  if (!park) return null;

  const apply = (r: Ruleset, close: () => void) => {
    if (r.id === park.rulesetId) {
      dispatch({ type: "RESET_ENCLOSURE_RULESET", enclosureId: enclosure.id });
    } else {
      dispatch({ type: "SET_ENCLOSURE_RULESET", enclosureId: enclosure.id, rulesetId: r.id });
    }
    setPending(null);
    close();
  };

  const onPick = (r: Ruleset, close: () => void) => {
    const clashes = r.id !== park.rulesetId;
    // Only the *first* clash needs the warning — once the park is Custom,
    // enclosures are already allowed to differ.
    if (clashes && !parkIsCustom) {
      setPending(r);
      return;
    }
    apply(r, close);
  };

  return (
    <Menu
      align="right"
      widthClass="min-w-[330px]"
      trigger={() => (
        <span
          className={`pa-mono flex items-center gap-1.5 rounded-[5px] border px-1.5 py-0.5 text-[10px] ${
            inherited
              ? "border-line text-muted"
              : "border-rule-line bg-rule-tint text-rule-text"
          }`}
          title={inherited ? "Ruleset inherited from park" : "Ruleset overridden for this enclosure"}
        >
          {inherited ? <span aria-hidden>🔗</span> : <span aria-hidden>⚑</span>}
          {shortRulesetLabel(ruleset)}
        </span>
      )}
    >
      {(close) => {
        const finish = () => {
          setPending(null);
          close();
        };
        // ---- phase 2: clash warning, shown before anything is applied ----
        if (pending) {
          return (
            <div className="flex flex-col">
              <div className="flex gap-2.5 rounded-[10px] border border-acc-line bg-acc-tint px-3 py-3">
                <span className="text-[15px] text-acc-text">⚠</span>
                <div className="text-[12px] leading-relaxed text-acc-text">
                  <b className="font-semibold">
                    {shortRulesetLabel(pending)} clashes with the park&apos;s{" "}
                    {shortRulesetLabel(parkRuleset)}.
                  </b>{" "}
                  Applying it will convert <b>{park.name}</b> to a <b>Custom</b> ruleset so
                  enclosures can differ.
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-line2 px-1 pt-2.5">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="rounded-[8px] border border-line px-3.5 py-1.5 text-[12px] font-medium text-body hover:bg-inset"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => apply(pending, finish)}
                  className="rounded-[8px] bg-acc-fill px-3.5 py-1.5 text-[12px] font-semibold text-acc-ink"
                >
                  Convert to Custom
                </button>
              </div>
            </div>
          );
        }

        // ---- phase 1: current state + ruleset list ----
        return (
          <div className="flex flex-col">
            <div className="pa-eyebrow px-2 pt-1.5 pb-2">Ruleset — {enclosure.name}</div>
            <div className="mx-1 mb-2 flex items-center gap-2.5 rounded-[9px] border border-line bg-inset px-3 py-2.5">
              <span aria-hidden className="text-rule-text">
                {inherited ? "🔗" : "⚑"}
              </span>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-ink">
                  {shortRulesetLabel(ruleset)}
                </div>
                <div className="text-[11px] text-muted">
                  {inherited ? "inherited from park" : "overridden for this enclosure"}
                </div>
              </div>
              {!inherited && (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "RESET_ENCLOSURE_RULESET", enclosureId: enclosure.id });
                    close();
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-link hover:opacity-80"
                  title="Re-inherit the park default"
                >
                  <span aria-hidden>↺</span> Reset
                </button>
              )}
            </div>

            <div className="pa-scroll max-h-[300px] overflow-y-auto">
              {RULESETS.map((r) => {
                const isPark = r.id === park.rulesetId;
                const active = r.id === ruleset.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onPick(r, close)}
                    title={r.note}
                    className={`flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[12px] ${
                      active ? "bg-inset text-ink" : "text-body hover:bg-inset"
                    }`}
                  >
                    <span className="flex-1">{r.label}</span>
                    {isPark && (
                      <span className="pa-mono text-[10px] text-rule-text">park default</span>
                    )}
                    {active && !isPark && <span className="text-rule-text">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }}
    </Menu>
  );
}
