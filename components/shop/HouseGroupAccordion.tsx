"use client";

import { useMemo, useState } from "react";
import { groupHouses, housesMatch } from "../../lib/house-groups";
import { cn } from "../../lib/utils";

export function HouseGroupAccordion({
  houses,
  selected,
  onSelect,
}: {
  houses: string[];
  selected: string | null;
  onSelect: (house: string | null) => void;
}) {
  const groups = useMemo(() => groupHouses(houses), [houses]);
  const [openId, setOpenId] = useState<string | null>(null);

  if (groups.length === 0) return null;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
          Casa inspiradora
        </p>
        {selected ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] font-medium text-ink underline decoration-gold-400/60 hover:text-gold-400"
          >
            Quitar · {selected}
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {groups.map((g) => {
          const open = openId === g.id;
          const hasSelected = selected
            ? g.houses.some((h) => housesMatch(h, selected))
            : false;
          return (
            <div
              key={g.id}
              className={cn(
                "col-span-2 overflow-hidden rounded-sm border transition-colors sm:col-span-1",
                open && "col-span-2 sm:col-span-3",
                hasSelected
                  ? "border-gold-400 bg-gold-400/10"
                  : open
                    ? "border-ink/30 bg-paper-soft"
                    : "border-ink/15 bg-paper-soft hover:border-gold-400/60"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : g.id)}
                className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
                aria-expanded={open}
              >
                <span className="text-xs font-semibold text-ink">
                  {g.label}
                  <span className="ml-1 font-normal text-ink-60">
                    ({g.houses.length})
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[9px]",
                    open || hasSelected
                      ? "bg-gold-400 text-ink"
                      : "bg-ink text-bone"
                  )}
                >
                  {open ? "▲" : "▼"}
                </span>
              </button>
              {open ? (
                <div className="flex flex-wrap gap-1.5 border-t border-ink/10 bg-white px-2.5 py-2">
                  {g.houses.map((h) => {
                    const active = selected ? housesMatch(h, selected) : false;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => onSelect(active ? null : h)}
                        className={cn(
                          "rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors",
                          active
                            ? "border-gold-400 bg-gold-400 text-ink"
                            : "border-ink/15 text-ink hover:border-gold-400 hover:text-gold-400"
                        )}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
