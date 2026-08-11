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
        <span className="uppercase tracking-widest text-gold-400">{label}</span>
        <div className="flex items-center overflow-hidden rounded-sm border border-gold-400/30 bg-paper">
          <button
            type="button"
            aria-label="Menos gramos"
            className="h-9 w-8 text-ink hover:bg-paper-soft disabled:opacity-30"
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
              "h-9 w-16 border-x border-gold-400/20 bg-transparent px-2 text-center text-ink outline-none",
              inputClassName
            )}
          />
          <button
            type="button"
            aria-label="Más gramos"
            className="h-9 w-8 text-ink hover:bg-paper-soft"
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
