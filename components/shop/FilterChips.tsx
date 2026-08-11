"use client";

import {
  PRICE_BANDS,
  type PriceBand,
} from "../../lib/department-taxonomy";
import { cn } from "../../lib/utils";

function chipClass(active: boolean) {
  return cn(
    "rounded-sm border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
    active
      ? "border-gold-400 bg-gold-400 text-ink"
      : "border-ink/20 bg-paper-soft text-ink hover:border-gold-400 hover:text-gold-400"
  );
}

export function PriceBandFilter({
  value,
  onChange,
}: {
  value: PriceBand;
  onChange: (band: PriceBand) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
        Precio
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRICE_BANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onChange(b.id)}
            className={chipClass(value === b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChipFilter<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={chipClass(value === o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
