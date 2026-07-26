"use client";

import { availableHouses } from "../../lib/filters";
import { FRAGRANCES } from "../../lib/mock-data";
import { useBuilderStore } from "../../store/useBuilderStore";
import type { Gender } from "../../lib/types";

const GENDERS: { id: Gender; label: string }[] = [
  { id: "dama", label: "Dama" },
  { id: "caballero", label: "Caballero" },
  { id: "unisex", label: "Unisex" },
];

export function GlobalSearchBar() {
  const search = useBuilderStore((s) => s.filters.search);
  const setSearch = useBuilderStore((s) => s.setSearch);

  return (
    <div className="relative max-w-xl mx-auto mb-8">
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o casa inspiradora..."
        aria-label="Buscar fragancias"
        className="w-full bg-white/5 border border-gold-400/30 rounded-sm pl-11 pr-4 py-3 text-sm text-bone placeholder:text-bone-60 focus:outline-none focus:ring-2 focus:ring-gold-400"
      />
    </div>
  );
}

export function GenderSelector() {
  const gender = useBuilderStore((s) => s.filters.gender);
  const setGender = useBuilderStore((s) => s.setGender);

  return (
    <div className="flex justify-center gap-2 mb-8" role="group" aria-label="Filtrar por género">
      {GENDERS.map((g) => (
        <button
          key={g.id}
          onClick={() => setGender(gender === g.id ? null : g.id)}
          data-active={gender === g.id}
          className="text-xs uppercase tracking-widest px-5 py-2.5 rounded-full border border-gold-400/30 text-bone-60 transition-colors data-[active=true]:bg-gold-400 data-[active=true]:text-wine-950 data-[active=true]:border-gold-400 hover:border-gold-400"
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

export function HouseSelector() {
  const filters = useBuilderStore((s) => s.filters);
  const setHouse = useBuilderStore((s) => s.setHouse);
  const houses = availableHouses(FRAGRANCES, { gender: filters.gender, group: filters.group, search: filters.search });

  if (houses.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8" role="group" aria-label="Filtrar por casa inspiradora">
      {houses.map((h) => (
        <button
          key={h}
          onClick={() => setHouse(h)}
          data-active={filters.house === h}
          className="text-xs px-4 py-2 rounded-full border border-gold-400/20 text-bone-60 transition-colors data-[active=true]:bg-gold-400 data-[active=true]:text-wine-950 data-[active=true]:border-gold-400 hover:border-gold-400"
        >
          {h}
        </button>
      ))}
    </div>
  );
}
