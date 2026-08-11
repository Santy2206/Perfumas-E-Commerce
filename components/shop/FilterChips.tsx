"use client";

import {
  PRICE_BANDS,
  type PriceBand,
} from "../../lib/department-taxonomy";

export function PriceBandFilter({
  value,
  onChange,
}: {
  value: PriceBand;
  onChange: (band: PriceBand) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-gold-400">Precio</p>
      <div className="flex flex-wrap gap-2">
        {PRICE_BANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onChange(b.id)}
            className={`rounded-sm border px-3 py-1.5 text-xs ${
              value === b.id
                ? "border-gold-400 text-gold-400"
                : "border-ink/15 text-ink-60 hover:border-gold-400/40"
            }`}
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
    <div className="mb-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-gold-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-sm border px-3 py-1.5 text-xs ${
              value === o.id
                ? "border-gold-400 text-gold-400"
                : "border-ink/15 text-ink-60 hover:border-gold-400/40"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
