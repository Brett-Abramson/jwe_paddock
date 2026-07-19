"use client";

export function Stepper({
  value,
  onChange,
  min = 0,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  label?: string;
}) {
  const btn =
    "flex h-6 w-6 items-center justify-center rounded-[6px] border border-line text-body leading-none hover:bg-inset hover:text-ink";
  return (
    <div className="inline-flex items-center gap-1.5">
      {label && <span className="pa-mono w-14 text-[10px] text-muted">{label}</span>}
      <button
        type="button"
        aria-label="decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={btn}
      >
        −
      </button>
      <span className="pa-mono w-6 text-center text-[13px] text-ink">{value}</span>
      <button
        type="button"
        aria-label="increase"
        onClick={() => onChange(value + 1)}
        className={btn}
      >
        +
      </button>
    </div>
  );
}
