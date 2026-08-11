"use client";

import { useMemo, useState } from "react";
import { groupHouses, housesMatch } from "../../lib/house-groups";

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
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-gold-400">Casa inspiradora</p>
        {selected ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-bone-60 underline hover:text-gold-400"
          >
            Quitar filtro: {selected}
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {groups.map((g) => {
          const open = openId === g.id;
          const hasSelected = selected
            ? g.houses.some((h) => housesMatch(h, selected))
            : false;
          return (
            <div
              key={g.id}
              className={`rounded-sm border ${
                hasSelected ? "border-gold-400/50" : "border-black/10"
              } bg-wine-900`}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : g.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={open}
              >
                <span className="text-sm text-bone">
                  {g.label}
                  <span className="ml-2 text-xs text-bone-60">({g.houses.length})</span>
                </span>
                <span className="text-gold-400 text-xs">{open ? "▲" : "▼"}</span>
              </button>
              {open ? (
                <div className="flex flex-wrap gap-2 border-t border-black/10 px-4 py-3">
                  {g.houses.map((h) => {
                    const active = selected ? housesMatch(h, selected) : false;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => onSelect(active ? null : h)}
                        className={`rounded-sm border px-3 py-1.5 text-xs transition-colors ${
                          active
                            ? "border-gold-400 bg-gold-400/15 text-gold-400"
                            : "border-black/15 text-bone-60 hover:border-gold-400/40"
                        }`}
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
