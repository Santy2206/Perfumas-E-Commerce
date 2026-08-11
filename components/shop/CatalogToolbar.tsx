"use client";

import {
  CATALOG_SORT_OPTIONS,
  type CatalogSort,
} from "../../lib/house-groups";
import type { Gender } from "../../lib/types";
import {
  CollectionFilterChips,
  type CollectionFilter,
} from "./CollectionFilterChips";

const GENDERS: { id: Gender | null; label: string }[] = [
  { id: null, label: "Todos" },
  { id: "dama", label: "Dama" },
  { id: "caballero", label: "Caballero" },
];

export function CatalogToolbar({
  gender,
  onGender,
  sort,
  onSort,
  showGender = true,
  showUnisex = false,
  collection,
  onCollection,
  showCollections = true,
}: {
  gender: Gender | null;
  onGender: (g: Gender | null) => void;
  sort: CatalogSort;
  onSort: (s: CatalogSort) => void;
  showGender?: boolean;
  showUnisex?: boolean;
  collection?: CollectionFilter;
  onCollection?: (c: CollectionFilter) => void;
  showCollections?: boolean;
}) {
  const genders = showUnisex
    ? [...GENDERS, { id: "unisex" as const, label: "Unisex" }]
    : GENDERS;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {showGender ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Género">
            {genders.map((g) => (
              <button
                key={String(g.id)}
                type="button"
                onClick={() => onGender(g.id)}
                className={`rounded-sm border-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  gender === g.id
                    ? "border-gold-400 bg-gold-400 text-ink"
                    : "border-ink/25 bg-white text-ink hover:border-gold-400 hover:text-gold-400"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink">
          <span>Ordenar</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as CatalogSort)}
            className="rounded-sm border-2 border-ink/25 bg-white px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-gold-400"
          >
            {CATALOG_SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {showCollections && onCollection ? (
        <CollectionFilterChips
          value={collection ?? null}
          onChange={onCollection}
          className="mb-0"
        />
      ) : null}
    </div>
  );
}
