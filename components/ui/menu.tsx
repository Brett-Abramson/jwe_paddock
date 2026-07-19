"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface MenuProps {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  widthClass?: string;
  triggerClass?: string;
}

/** Lightweight dropdown: closes on outside-click and Escape. */
export function Menu({
  trigger,
  children,
  align = "left",
  widthClass = "min-w-[220px]",
  triggerClass = "",
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`cursor-pointer appearance-none border-0 bg-transparent p-0 text-left ${triggerClass}`}
      >
        {trigger(open)}
      </button>
      {open && (
        <div
          className={`pa-card-shadow absolute z-50 mt-1.5 ${
            align === "right" ? "right-0" : "left-0"
          } ${widthClass} rounded-[var(--radius-panel)] border border-line bg-card p-1`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  active,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-inset text-ink" : "text-body hover:bg-inset"
      }`}
    >
      {children}
    </button>
  );
}
