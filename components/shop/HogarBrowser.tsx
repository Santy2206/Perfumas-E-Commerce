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
import { ProductCard } from "./ProductCard";
import { CatalogToolbar } from "./CatalogToolbar";
import { ChipFilter, PriceBandFilter } from "./FilterChips";

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

  return (
    <div>
      <h1 className="font-display text-3xl text-bone mb-2">Hogar y cuidado</h1>
      <p className="text-sm text-bone-60 mb-2">
        Splash, cremas, aromatizantes, aseo y empaques.
      </p>
      <p className="mb-6 text-xs uppercase tracking-widest text-bone-60">{sourceLabel}</p>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar…"
        className="mb-6 w-full max-w-md rounded-sm border border-gold-400/30 bg-white/5 px-4 py-2.5 text-sm text-bone placeholder:text-bone-60 focus:outline-none focus:ring-2 focus:ring-gold-400"
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

      <p className="mb-4 text-xs text-bone-60">{filtered.length} productos</p>
      {filtered.length === 0 ? (
        <p className="text-bone-60">No hay productos con estos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} intent="buy" />
          ))}
        </div>
      )}
    </div>
  );
}
