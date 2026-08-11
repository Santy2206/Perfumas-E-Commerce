"use client";

import { useMemo, useState } from "react";
import type { CatalogProduct } from "../../lib/catalog-types";
import type { Gender, OlfactiveGroup } from "../../lib/types";
import {
  housesMatch,
  normalizeText,
  sortByTitleAndPrice,
  textIncludes,
  type CatalogSort,
} from "../../lib/house-groups";
import { CatalogToolbar } from "./CatalogToolbar";
import type { CollectionFilter } from "./CollectionFilterChips";
import { HouseGroupAccordion } from "./HouseGroupAccordion";
import { FragranceWheel } from "../builder/FragranceWheel";
import { PaginatedProductGrid } from "./PaginatedProductGrid";
import Link from "next/link";
import { matchesCollectionFilter } from "../../lib/collection-filter";
import { buildSearchSuggestions } from "../../lib/search-suggestions";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import { SearchSuggestInput } from "../ui/SearchSuggestInput";

function houseOf(p: CatalogProduct): string {
  return typeof p.metadata?.house === "string" ? p.metadata.house : "";
}

function genderOf(p: CatalogProduct): string {
  return typeof p.metadata?.gender === "string" ? p.metadata.gender : "";
}

function groupOf(p: CatalogProduct): string {
  return typeof p.metadata?.group === "string" ? p.metadata.group : "";
}

/** Shop-facing replicas: branded glass bottles only — no genéricos / plásticos / perfumeros. */
export function isBrandedPreparedReplica(p: CatalogProduct): boolean {
  const tier = String(p.metadata?.quality_tier ?? "");
  if (tier === "Generico") return false;

  const t = normalizeText(p.title);
  if (
    /generico|plastico|perfumero|maletin|osito|vip bala|bala agrafe|bala rosca|martillado rosca generico/.test(
      t
    )
  ) {
    return false;
  }

  // Prefer AA/AAA fragrance replicas (named bottles), not packaging SKUs.
  return tier === "AAA" || tier === "AA" || tier === "";
}

export function PerfumeriaBrowser({
  replicas,
  essences,
  sourceLabel,
}: {
  replicas: CatalogProduct[];
  essences: CatalogProduct[];
  sourceLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [house, setHouse] = useState<string | null>(null);
  const [olfactive, setOlfactive] = useState<OlfactiveGroup | null>(null);
  const [sortReplicas, setSortReplicas] = useState<CatalogSort>("alpha-asc");
  const [sortEssences, setSortEssences] = useState<CatalogSort>("alpha-asc");
  const [collection, setCollection] = useState<CollectionFilter>(null);
  const likes = useFavoritesStore((s) => s.likes);
  const lists = useFavoritesStore((s) => s.lists);

  const houses = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of essences) {
      const h = houseOf(p);
      if (!h) continue;
      if (!map.has(h.toLowerCase())) map.set(h.toLowerCase(), h);
    }
    return Array.from(map.values());
  }, [essences]);

  const filteredReplicas = useMemo(() => {
    const list = replicas.filter((p) => {
      if (!isBrandedPreparedReplica(p)) return false;
      if (
        search.trim() &&
        !textIncludes(p.title, search) &&
        !textIncludes(p.description || "", search)
      ) {
        return false;
      }
      if (gender && genderOf(p) && genderOf(p) !== gender) return false;
      if (!matchesCollectionFilter(p.id, collection, likes, lists)) return false;
      return true;
    });
    return sortByTitleAndPrice(list, sortReplicas);
  }, [replicas, search, gender, sortReplicas, collection, likes, lists]);

  const filteredEssences = useMemo(() => {
    const list = essences.filter((p) => {
      if (gender && genderOf(p) !== gender) return false;
      if (house && !housesMatch(houseOf(p), house)) return false;
      if (olfactive && groupOf(p) !== olfactive) return false;
      if (search.trim()) {
        const ok =
          textIncludes(p.title, search) ||
          textIncludes(houseOf(p), search) ||
          textIncludes(p.description || "", search);
        if (!ok) return false;
      }
      if (!matchesCollectionFilter(p.id, collection, likes, lists)) return false;
      return true;
    });
    return sortByTitleAndPrice(list, sortEssences);
  }, [essences, search, gender, house, olfactive, sortEssences, collection, likes, lists]);

  const searchSuggestions = useMemo(() => {
    const items = [
      ...replicas.filter(isBrandedPreparedReplica).map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: "Réplica" as string | undefined,
      })),
      ...essences.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: houseOf(p) || undefined,
      })),
    ];
    return buildSearchSuggestions(search, items, { houses });
  }, [search, replicas, essences, houses]);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2">Preparadas</h1>
      <p className="text-sm text-ink-60 mb-2">
        Réplicas preparadas listas para llevar, o elige una esencia e inspira tu creación.
      </p>
      <p className="mb-6 text-xs uppercase tracking-widest text-ink-60">{sourceLabel}</p>

      <SearchSuggestInput
        className="mb-6 w-full max-w-md"
        value={search}
        onChange={setSearch}
        suggestions={searchSuggestions}
        placeholder="Buscar por nombre o casa…"
        aria-label="Buscar en preparadas"
        resultsAnchorId="search-results"
      />

      <CatalogToolbar
        gender={gender}
        onGender={setGender}
        sort={sortReplicas}
        onSort={setSortReplicas}
        showUnisex
        collection={collection}
        onCollection={setCollection}
      />

      <section id="search-results" className="mb-14 scroll-mt-24">
        <div className="mb-6">
          <h2 className="font-display text-2xl text-ink">Réplicas preparadas</h2>
          <p className="text-sm text-ink-60">
            Perfume listo en envase de fragancia (sin genéricos ni plásticos) —{" "}
            {filteredReplicas.length} resultados
          </p>
        </div>
        <PaginatedProductGrid products={filteredReplicas} intent="buy" />
      </section>

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink">Prepara con una esencia</h2>
            <p className="text-sm text-ink-60">
              Filtra por género, grupo olfativo y casa.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/crear" className="text-gold-400 underline hover:text-ink">
              Ir a Preparar
            </Link>
            <Link
              href="/tienda/insumos?cat=esencias"
              className="text-ink-60 underline hover:text-gold-400"
            >
              Comprar esencias en Insumos
            </Link>
          </div>
        </div>

        <CatalogToolbar
          gender={gender}
          onGender={setGender}
          sort={sortEssences}
          onSort={setSortEssences}
          showUnisex
          collection={collection}
          onCollection={setCollection}
          showCollections={false}
        />
        <div className="mb-6">
          <FragranceWheel
            selected={olfactive}
            onSelect={(g) => setOlfactive((prev) => (prev === g ? null : g))}
          />
        </div>
        <HouseGroupAccordion houses={houses} selected={house} onSelect={setHouse} />

        <PaginatedProductGrid products={filteredEssences} intent="create" />
      </section>
    </div>
  );
}
