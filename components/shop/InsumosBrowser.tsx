"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CatalogProduct } from "../../lib/catalog-types";
import type { Gender, OlfactiveGroup, QualityTier } from "../../lib/types";
import {
  partitionInsumosProducts,
  productMatchesInsumosCat,
  type InsumosCat,
} from "../../lib/insumos-filters";
import {
  housesMatch,
  sortByTitleAndPrice,
  textIncludes,
  type CatalogSort,
} from "../../lib/house-groups";
import { ProductCard } from "./ProductCard";
import { FragranceWheel } from "../builder/FragranceWheel";
import { HouseGroupAccordion } from "./HouseGroupAccordion";
import { CatalogToolbar } from "./CatalogToolbar";

const CATS: { id: InsumosCat; label: string }[] = [
  { id: "esencias", label: "Esencias" },
  { id: "envases", label: "Envases" },
  { id: "alcohol", label: "Alcohol" },
  { id: "feromonas", label: "Feromonas" },
  { id: "todos", label: "Todos" },
];

const TIERS: { id: QualityTier | "all"; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "AAA", label: "AAA" },
  { id: "AA", label: "AA" },
  { id: "Generico", label: "Genérico" },
];

function houseOf(p: CatalogProduct): string {
  return typeof p.metadata?.house === "string" ? p.metadata.house : "";
}

export function InsumosBrowser({
  products,
  wholesale = false,
  sourceLabel,
}: {
  products: CatalogProduct[];
  wholesale?: boolean;
  sourceLabel: string;
}) {
  const params = useSearchParams();
  const initial = (params.get("cat") as InsumosCat) || "esencias";
  const [cat, setCat] = useState<InsumosCat>(
    CATS.some((c) => c.id === initial) ? initial : "esencias"
  );
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [group, setGroup] = useState<OlfactiveGroup | null>(null);
  const [house, setHouse] = useState<string | null>(null);
  const [tier, setTier] = useState<QualityTier | "all">("all");
  const [sort, setSort] = useState<CatalogSort>("alpha-asc");

  const buckets = useMemo(() => partitionInsumosProducts(products), [products]);

  const availableHouses = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of buckets.esencias) {
      if (gender && p.metadata?.gender !== gender) continue;
      if (group && p.metadata?.group !== group) continue;
      const h = houseOf(p);
      if (!h) continue;
      const key = h.toLowerCase();
      if (!map.has(key)) map.set(key, h);
    }
    return Array.from(map.values());
  }, [buckets.esencias, gender, group]);

  const filtered = useMemo(() => {
    const base = buckets[cat] ?? buckets.todos;

    const list = base.filter((p) => {
      if (!productMatchesInsumosCat(p, cat)) return false;

      if (cat === "esencias" || (cat === "todos" && p.metadata?.product_kind === "essence")) {
        if (gender && p.metadata?.gender !== gender) return false;
        if (group && p.metadata?.group !== group) return false;
        if (house && !housesMatch(houseOf(p), house)) return false;
      }
      if (cat === "envases" && tier !== "all") {
        if (p.metadata?.quality_tier !== tier) return false;
      }

      if (search.trim()) {
        const h = houseOf(p);
        const matchesTitle = textIncludes(p.title, search);
        const matchesHouse = h ? textIncludes(h, search) : false;
        const matchesDesc = p.description ? textIncludes(p.description, search) : false;
        if (!matchesTitle && !matchesHouse && !matchesDesc) return false;
      }
      return true;
    });

    return sortByTitleAndPrice(list, sort);
  }, [buckets, cat, search, gender, group, house, tier, sort]);

  const selectCat = (next: InsumosCat) => {
    setCat(next);
    setSearch("");
    if (next !== "esencias" && next !== "todos") {
      setGender(null);
      setGroup(null);
      setHouse(null);
    }
    if (next !== "envases") setTier("all");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("cat", next);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const showEssenceFilters = cat === "esencias" || cat === "todos";

  return (
    <div>
      <h1 className="font-display text-3xl text-bone mb-2">Insumos</h1>
      <p className="text-sm text-bone-60 mb-2">
        Esencias, envases, alcohol y feromonas — compra por separado o úsalos en{" "}
        <a href="/crear" className="text-gold-400 underline">
          Crear
        </a>
        .
      </p>
      <p className="mb-6 text-xs uppercase tracking-widest text-bone-60">{sourceLabel}</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => selectCat(c.id)}
            className={`rounded-sm px-3 py-2 text-xs uppercase tracking-widest border transition-colors ${
              cat === c.id
                ? "border-gold-400 bg-gold-400/10 text-gold-400"
                : "border-white/15 text-bone-60 hover:border-gold-400/40"
            }`}
          >
            {c.label}
            <span className="ml-1 opacity-60">({buckets[c.id].length})</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o casa (chanel, dior…)…"
        className="mb-6 w-full max-w-md rounded-sm border border-gold-400/30 bg-white/5 px-4 py-2.5 text-sm text-bone placeholder:text-bone-60 focus:outline-none focus:ring-2 focus:ring-gold-400"
      />

      <CatalogToolbar
        gender={showEssenceFilters ? gender : null}
        onGender={setGender}
        sort={sort}
        onSort={setSort}
        showGender={showEssenceFilters}
      />

      {showEssenceFilters && (
        <div className="mb-8 space-y-4">
          <FragranceWheel
            selected={group}
            onSelect={(g) => setGroup((prev) => (prev === g ? null : g))}
          />
          <HouseGroupAccordion
            houses={availableHouses}
            selected={house}
            onSelect={setHouse}
          />
        </div>
      )}

      {cat === "envases" && (
        <div className="mb-8 flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(t.id)}
              className={`rounded-sm px-3 py-1.5 text-xs border ${
                tier === t.id
                  ? "border-gold-400 text-gold-400"
                  : "border-white/15 text-bone-60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-bone-60">No hay productos con estos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard
              key={`${cat}-${p.id}`}
              product={p}
              wholesale={wholesale}
              intent="buy"
            />
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-bone-60">
        {filtered.length} productos
        {cat !== "todos" ? ` en ${cat}` : ""}
      </p>
    </div>
  );
}
