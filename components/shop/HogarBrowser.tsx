"use client";

import { useMemo, useState } from "react";
import type { CatalogProduct } from "../../lib/catalog-types";
import {
  HOGAR_KINDS,
  classifyHogar,
  matchesPriceBand,
  type HogarKind,
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

export function HogarBrowser({
  products,
  sourceLabel,
}: {
  products: CatalogProduct[];
  sourceLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<HogarKind | "all">("all");
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [sort, setSort] = useState<CatalogSort>("alpha-asc");

  const kindOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const k = classifyHogar(p.title, p.category);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return HOGAR_KINDS.filter(
      (o) => o.id === "all" || (counts.get(o.id) ?? 0) > 0
    ).map((o) =>
      o.id === "all"
        ? { ...o, label: `${o.label} (${products.length})` }
        : { ...o, label: `${o.label} (${counts.get(o.id) || 0})` }
    );
  }, [products]);

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      const k = classifyHogar(p.title, p.category);
      if (kind !== "all" && k !== kind) return false;
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
  }, [products, kind, priceBand, search, sort]);

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
      <h1 className="font-display text-3xl text-bone mb-2">Hogar y cuidado</h1>
      <p className="text-sm text-bone-60 mb-2">
        Splash, cremas, aromatizantes, aseo y empaques.
      </p>
      <p className="mb-6 text-xs uppercase tracking-widest text-bone-60">{sourceLabel}</p>

      <SearchSuggestInput
        className="mb-6 w-full max-w-md"
        value={search}
        onChange={setSearch}
        suggestions={searchSuggestions}
        placeholder="Buscar…"
        aria-label="Buscar en hogar"
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
        options={kindOptions as { id: HogarKind | "all"; label: string }[]}
        value={kind}
        onChange={setKind}
      />
      <PriceBandFilter value={priceBand} onChange={setPriceBand} />

      <div id="search-results" className="scroll-mt-24">
        <PaginatedProductGrid products={filtered} intent="buy" />
      </div>
    </div>
  );
}
