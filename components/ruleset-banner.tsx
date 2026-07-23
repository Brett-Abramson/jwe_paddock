"use client";

import { useApp } from "@/lib/store";
import { RULESETS, getRuleset } from "@/lib/data";
import { activePark, isParkCustom, parkRulesetCount } from "@/lib/selectors";
import { Menu, MenuItem } from "./ui/menu";
import { ThemeToggle } from "./theme-toggle";

export function RulesetBanner() {
  const { state, dispatch } = useApp();
  const park = activePark(state);
  if (!park) return null;

  const ruleset = getRuleset(park.rulesetId);
  const label = ruleset?.label ?? "Sandbox";
  const custom = isParkCustom(state, park);
  const rulesetCount = parkRulesetCount(state, park);
  const note = custom
    ? "Enclosures differ — each carries its own ruleset."
    : (ruleset?.note ?? "");

  return (
    <div className="flex items-center gap-4 border-b px-5 py-3" style={{ background: "#1a1a1a", borderColor: "#333" }}>
      {/* brand mark + value prop — the only place a first-time visitor is told what this is */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-brand">
          <div className="h-[9px] w-[9px] rounded-[2px] bg-[color:var(--pa-brand-ink)]" />
        </div>
        <span className="hidden text-[13px] font-bold text-ink sm:inline">Paddock Atlas</span>
      </div>

      <div className="hidden h-6 w-px bg-banner-line sm:block" aria-hidden />

      <div className="flex items-center gap-2.5">
        <span className="pa-eyebrow text-rule-text">Park ruleset</span>

        <Menu
          align="left"
          widthClass="min-w-[260px]"
          trigger={() =>
            custom ? (
              <span className="flex items-center gap-2 rounded-[8px] border border-dashed border-rule-line bg-transparent px-3 py-1.5 text-[13px] font-bold text-rule-text">
                Custom
                <span className="pa-mono text-[10px] font-normal opacity-80">
                  {rulesetCount} rulesets
                </span>
                <span className="text-[11px] opacity-80">⌄</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 rounded-[8px] bg-rule-fill px-3 py-1.5 text-[13px] font-bold text-rule-ink">
                {label}
                <span className="text-[11px] opacity-80">⌄</span>
              </span>
            )
          }
        >
          {(close) => (
            <>
              <div className="pa-eyebrow px-3 pt-2 pb-1">Park default · {park.name}</div>
              {custom && (
                <div className="px-3 pb-2 text-[11px] text-muted">
                  This park is <b className="text-rule-text">Custom</b> — enclosures that
                  haven&apos;t overridden still follow this default.
                </div>
              )}
              {RULESETS.map((r) => (
                <MenuItem
                  key={r.id}
                  active={r.id === park.rulesetId}
                  onClick={() => {
                    dispatch({ type: "SET_PARK_RULESET", parkId: park.id, rulesetId: r.id });
                    close();
                  }}
                >
                  <span className="flex-1" title={r.note}>
                    {r.label}
                  </span>
                  {r.id === park.rulesetId && <span className="text-rule-text">✓</span>}
                </MenuItem>
              ))}
            </>
          )}
        </Menu>
      </div>

      <span className="hidden text-[12px] text-rule-text/80 md:inline">{note}</span>

      <div className="ml-auto flex items-center gap-3">
        <span className="pa-mono text-[10px] text-muted">
          {park.location ? `${park.location} / ` : ""}
          {custom ? "Custom" : label.replace(/^.*·\s*/, "")}
        </span>
        <ThemeToggle />
      </div>
    </div>
  );
}
