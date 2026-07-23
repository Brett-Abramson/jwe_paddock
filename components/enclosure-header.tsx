"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import type { Enclosure } from "@/lib/types";
import { resolveRoster } from "@/lib/selectors";
import { enclosurePeriod } from "@/lib/engine";
import { RulesetControl } from "./ruleset-control";

export function EnclosureHeader({ enclosure }: { enclosure: Enclosure }) {
  const { dispatch } = useApp();
  const { members } = resolveRoster(enclosure);
  const period = enclosurePeriod(members.map((m) => m.species));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(enclosure.name);

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
    <div className="border-b border-line2 px-5 py-4">
      <div className="flex items-center gap-2.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(enclosure.name);
                setEditing(false);
              }
            }}
            onBlur={commitRename}
            className="min-w-0 rounded-[6px] border border-line bg-inset px-2 py-0.5 text-[19px] font-bold tracking-[-0.01em] text-ink focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(enclosure.name);
              setEditing(true);
            }}
            title="Rename enclosure"
            className="cursor-pointer rounded-[6px] px-0.5 text-[19px] font-bold tracking-[-0.01em] text-ink hover:bg-inset"
          >
            {enclosure.name}
          </button>
        )}
        <span className="pa-mono rounded-[5px] border border-line px-1.5 py-0.5 text-[10px] text-muted">
          {enclosure.territories} {enclosure.territories === 1 ? "territory" : "territories"}
        </span>
        {period && (
          <span className="pa-mono rounded-[5px] border border-rule-line px-1.5 py-0.5 text-[10px] text-rule-text">
            Period · {period}
          </span>
        )}
        <RulesetControl enclosure={enclosure} />
      </div>
    </div>
  );
}
