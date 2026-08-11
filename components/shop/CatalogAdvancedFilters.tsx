"use client";

import { useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export type AdvancedFilterChip = {
  id: string;
  label: string;
  onClear: () => void;
};

type Props = {
  chips: AdvancedFilterChip[];
  children: ReactNode;
  className?: string;
  /** Default collapsed so product grids stay above the fold */
  defaultOpen?: boolean;
  label?: string;
};

/**
 * Collapsible advanced filters (wheel, houses, collections).
 * Keeps a gold Filtros control + removable summary chips when active.
 */
export function CatalogAdvancedFilters({
  chips,
  children,
  className,
  defaultOpen = false,
  label = "Filtros",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const count = chips.length;

  return (
    <div className={cn("mb-5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "inline-flex items-center gap-2 rounded-sm border-2 border-gold-400 bg-gold-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-gold-100 hover:border-gold-100",
            open && "bg-gold-100 border-gold-100"
          )}
        >
          <span>{label}</span>
          {count > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-ink px-1.5 text-[10px] font-bold text-bone">
              {count}
            </span>
          ) : null}
          <span aria-hidden className="text-[10px]">
            {open ? "▲" : "▼"}
          </span>
        </button>

        {!open &&
          chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onClear}
              className="inline-flex items-center gap-1 rounded-sm border border-ink/20 bg-white px-2 py-1 text-[11px] font-medium text-ink hover:border-gold-400"
              title="Quitar filtro"
            >
              <span>{chip.label}</span>
              <span aria-hidden className="text-ink-60">
                ×
              </span>
            </button>
          ))}
      </div>

      {open ? (
        <div className="mt-3 overflow-hidden rounded-sm border-2 border-gold-400/50 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-gold-400/30 bg-ink px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">
              Afinar búsqueda
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] uppercase tracking-widest text-bone-60 hover:text-gold-400"
            >
              Cerrar
            </button>
          </div>
          <div className="space-y-3 p-3">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
