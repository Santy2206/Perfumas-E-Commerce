"use client";

import { useMemo } from "react";
import { availableHouses } from "../../lib/filters";
import { FRAGRANCES } from "../../lib/mock-data";
import { buildSearchSuggestions } from "../../lib/search-suggestions";
import { useBuilderStore } from "../../store/useBuilderStore";
import type { Gender } from "../../lib/types";
import { HouseGroupAccordion } from "../shop/HouseGroupAccordion";
import { SearchSuggestInput } from "../ui/SearchSuggestInput";

const GENDERS: { id: Gender; label: string }[] = [
  { id: "dama", label: "Dama" },
  { id: "caballero", label: "Caballero" },
  { id: "unisex", label: "Unisex" },
];

export function GlobalSearchBar() {
  const search = useBuilderStore((s) => s.filters.search);
  const setSearch = useBuilderStore((s) => s.setSearch);

  const suggestions = useMemo(() => {
    const houses = availableHouses(FRAGRANCES, {
      gender: null,
      group: null,
      search: "",
    });
    return buildSearchSuggestions(
      search,
      FRAGRANCES.map((f) => ({
        id: f.id,
        title: f.contratipo,
        subtitle: f.house,
      })),
      { houses }
    );
  }, [search]);

  return (
    <SearchSuggestInput
      className="mb-8 w-full max-w-2xl"
      value={search}
      onChange={setSearch}
      suggestions={suggestions}
      placeholder="Buscar por nombre o casa (sin importar mayúsculas)…"
      aria-label="Buscar fragancias"
      withIcon
      resultsAnchorId="search-results"
    />
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
          className="text-xs uppercase tracking-widest px-5 py-2.5 rounded-full border border-ink/15 text-ink-60 transition-colors data-[active=true]:bg-gold-400 data-[active=true]:text-wine-950 data-[active=true]:border-gold-400 hover:border-gold-400"
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

export function HouseSelector({
  onAfterSelect,
}: {
  onAfterSelect?: () => void;
} = {}) {
  const filters = useBuilderStore((s) => s.filters);
  const setHouse = useBuilderStore((s) => s.setHouse);
  const houses = availableHouses(FRAGRANCES, {
    gender: filters.gender,
    group: filters.group,
    search: filters.search,
  });

  return (
    <HouseGroupAccordion
      houses={houses}
      selected={filters.house}
      onSelect={(house) => {
        setHouse(house);
        onAfterSelect?.();
      }}
    />
  );
}
