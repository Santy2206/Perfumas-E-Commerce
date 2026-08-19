"use client";

import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

type Props = {
  value: number;
  min: number;
  onChange: (next: number) => void;
  label?: string;
  className?: string;
  inputClassName?: string;
  showMinHint?: boolean;
  /** "sm" = compact spreadsheet-row sizing (list view); default = the big steppers. */
  size?: "default" | "sm";
};

function clampGrams(raw: string, min: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
}

/**
 * Essence grams control: free typing + −/+ steppers.
 * Clamps to min on blur / Enter / stepper, not on every keystroke.
 */
export function GramsQuantityInput({
  value,
  min,
  onChange,
  label = "Gramos",
  className,
  inputClassName,
  showMinHint = false,
  size = "default",
}: Props) {
  const isSm = size === "sm";
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const next = clampGrams(raw, min);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const step = (delta: number) => {
    const next = Math.max(min, Math.floor(value) + delta);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className={cn(isSm ? "space-y-0.5" : "space-y-1", className)}>
      <label className={cn("flex items-center", isSm ? "gap-1 text-[10px] text-ink-60" : "gap-2 text-xs text-ink-60")}>
        <span
          className={cn(
            "font-bold uppercase tracking-widest text-gold-400",
            isSm ? "text-[9px]" : "text-[11px]"
          )}
        >
          {label}
        </span>
        <div
          className={cn(
            "flex items-center overflow-hidden border-gold-400",
            isSm
              ? "rounded border"
              : "rounded-md border-2 shadow-[0_2px_0_0_rgba(202,169,105,0.25)]"
          )}
        >
          <button
            type="button"
            aria-label="Menos gramos"
            className={cn(
              "flex items-center justify-center bg-gold-400 font-bold text-wine-950 transition-colors hover:bg-gold-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-gold-400",
              isSm ? "h-6 w-6 text-xs" : "h-11 w-11 text-xl"
            )}
            disabled={value <= min}
            onClick={() => step(-1)}
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d]/g, "");
              setDraft(next);
            }}
            onBlur={() => commit(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(draft);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className={cn(
              "border-x-2 border-gold-400 bg-white text-center font-bold text-ink outline-none",
              isSm ? "h-6 w-10 px-1 text-[11px]" : "h-11 w-20 px-2 text-base",
              inputClassName
            )}
          />
          <button
            type="button"
            aria-label="Más gramos"
            className={cn(
              "flex items-center justify-center bg-gold-400 font-bold text-wine-950 transition-colors hover:bg-gold-100",
              isSm ? "h-6 w-6 text-xs" : "h-11 w-11 text-xl"
            )}
            onClick={() => step(1)}
          >
            +
          </button>
        </div>
      </label>
      {showMinHint && (
        <p className={isSm ? "text-[9px] text-ink-60" : "text-xs text-ink-60"}>mín. {min} g</p>
      )}
    </div>
  );
}
