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
}: Props) {
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
    <div className={cn("space-y-1", className)}>
      <label className="flex items-center gap-2 text-xs text-ink-60">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gold-400">
          {label}
        </span>
        <div className="flex items-center overflow-hidden rounded-md border-2 border-gold-400 shadow-[0_2px_0_0_rgba(202,169,105,0.25)]">
          <button
            type="button"
            aria-label="Menos gramos"
            className="flex h-11 w-11 items-center justify-center bg-gold-400 text-xl font-bold text-wine-950 transition-colors hover:bg-gold-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-gold-400"
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
              "h-11 w-20 border-x-2 border-gold-400 bg-white px-2 text-center text-base font-bold text-ink outline-none",
              inputClassName
            )}
          />
          <button
            type="button"
            aria-label="Más gramos"
            className="flex h-11 w-11 items-center justify-center bg-gold-400 text-xl font-bold text-wine-950 transition-colors hover:bg-gold-100"
            onClick={() => step(1)}
          >
            +
          </button>
        </div>
      </label>
      {showMinHint && (
        <p className="text-xs text-ink-60">mín. {min} g</p>
      )}
    </div>
  );
}
