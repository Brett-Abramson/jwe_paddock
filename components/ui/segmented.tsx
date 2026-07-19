"use client";

import type { ReactNode } from "react";

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  /** accent used for the selected segment */
  tone?: "cta" | "juv";
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  tone = "cta",
}: SegmentedProps<T>) {
  const pad = size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";
  const selClass =
    tone === "juv"
      ? "bg-juv-accent text-[oklch(0.16_0.02_195)]"
      : "bg-cta text-cta-ink";
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-[7px] border p-0.5 ${
        tone === "juv" ? "border-juv-line bg-inset" : "border-line bg-inset"
      }`}
    >
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`rounded-[5px] font-semibold whitespace-nowrap ${pad} ${
              sel ? selClass : "text-muted hover:text-body"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
