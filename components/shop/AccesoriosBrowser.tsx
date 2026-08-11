"use client";

import { useMemo, useState } from "react";
import type { CatalogProduct } from "../../lib/catalog-types";
import {
  ACCESORIO_KINDS,
  ACCESORIO_MATERIALS,
  classifyAccesorio,
  classifyMaterial,
  matchesPriceBand,
  type AccesorioKind,
  type AccesorioMaterial,
  type PriceBand,
} from "../../lib/department-taxonomy";
import {
  sortByTitleAndPrice,
  textIncludes,
  type CatalogSort,
} from "../../lib/house-groups";
import { buildSearchSuggestions } from "../../lib/search-suggestions";
import { CatalogToolbar } from "./CatalogToolbar";
import { ChipFilter, PriceBandFilter } from "./FilterChips";
import { PaginatedProductGrid } from "./PaginatedProductGrid";
import { SearchSuggestInput } from "../ui/SearchSuggestInput";

function categoryOf(p: CatalogProduct): string {
  return String(p.category ?? "")
    .toLowerCase()
    .trim();
}

export function AccesoriosBrowser({
  products,
  sourceLabel,
}: {
  products: CatalogProduct[];
  sourceLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<AccesorioKind | "all">("all");
  const [material, setMaterial] = useState<AccesorioMaterial | "all">("all");
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [sort, setSort] = useState<CatalogSort>("alpha-asc");

  const kindOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const k = classifyAccesorio(p.title, p.category);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return ACCESORIO_KINDS.filter(
      (o) => o.id === "all" || (counts.get(o.id) ?? 0) > 0
    ).map((o) =>
      o.id === "all"
        ? { ...o, label: `${o.label} (${products.length})` }
        : { ...o, label: `${o.label} (${counts.get(o.id) || 0})` }
    );
  }, [products]);

  const materialOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (categoryOf(p) === "marroquineria") continue;
      const m = classifyMaterial(p.title);
      counts.set(m, (counts.get(m) || 0) + 1);
    }
    return ACCESORIO_MATERIALS.filter(
      (o) => o.id === "all" || (counts.get(o.id) ?? 0) > 0
    ).map((o) =>
      o.id === "all"
        ? o
        : { ...o, label: `${o.label} (${counts.get(o.id) || 0})` }
    );
  }, [products]);

  const onKindChange = (next: AccesorioKind | "all") => {
    setKind(next);
    // Material chips are for jewelry; reset when switching to bags/belts.
    if (next === "marroquineria") setMaterial("all");
  };

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      const cat = categoryOf(p);
      const k = classifyAccesorio(p.title, p.category);
      const m = classifyMaterial(p.title);

      if (kind === "marroquineria") {
        // Sheet category is authoritative — never mix in bisutería.
        if (cat !== "marroquineria" && k !== "marroquineria") return false;
        if (cat === "bisuteria") return false;
      } else if (kind !== "all") {
        if (cat === "marroquineria" || k === "marroquineria") return false;
        if (k !== kind) return false;
      }

      if (kind === "marroquineria") {
        // no material filter for marroquinería
      } else if (material !== "all" && m !== material) {
        return false;
      }

      if (!matchesPriceBand(p.price, priceBand)) return false;
      if (
        search.trim() &&
        !textIncludes(p.title, search) &&
        !textIncludes(p.description || "", search)
      ) {
        return false;
      }
      return true;
    });
    return sortByTitleAndPrice(list, sort);
  }, [products, kind, material, priceBand, search, sort]);

  const searchSuggestions = useMemo(
    () =>
      buildSearchSuggestions(
        search,
        products.map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: p.category || undefined,
        }))
      ),
    [search, products]
  );

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2">Accesorios</h1>
      <p className="text-sm text-ink-60 mb-2">
        Bisutería y marroquinería — filtra por tipo, material y precio.
      </p>
      <p className="mb-6 text-xs uppercase tracking-widest text-ink-60">{sourceLabel}</p>

      <SearchSuggestInput
        className="mb-6 w-full max-w-md"
        value={search}
        onChange={setSearch}
        suggestions={searchSuggestions}
        placeholder="Buscar…"
        aria-label="Buscar accesorios"
        resultsAnchorId="search-results"
      />

      <CatalogToolbar
        gender={null}
        onGender={() => {}}
        sort={sort}
        onSort={setSort}
        showGender={false}
      />
      <ChipFilter
        label="Tipo"
        options={kindOptions as { id: AccesorioKind | "all"; label: string }[]}
        value={kind}
        onChange={onKindChange}
      />
      {kind !== "marroquineria" ? (
        <ChipFilter
          label="Material (bisutería)"
          options={materialOptions as { id: AccesorioMaterial | "all"; label: string }[]}
          value={material}
          onChange={setMaterial}
        />
      ) : null}
      <PriceBandFilter value={priceBand} onChange={setPriceBand} />

      <div id="search-results" className="scroll-mt-24">
        <PaginatedProductGrid products={filtered} intent="buy" />
      </div>
    </div>
  );
}
