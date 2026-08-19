"use client";

import { useMemo, useState } from "react";
import type { CatalogProduct } from "../../lib/catalog-types";
import type { Gender } from "../../lib/types";
import {
  normalizeText,
  sortByTitleAndPrice,
  textIncludes,
  type CatalogSort,
} from "../../lib/house-groups";
import { scrollToResults } from "../../lib/scroll-to-results";
import { CatalogToolbar } from "./CatalogToolbar";
import {
  CatalogAdvancedFilters,
  type AdvancedFilterChip,
} from "./CatalogAdvancedFilters";
import {
  CollectionFilterChips,
  type CollectionFilter,
} from "./CollectionFilterChips";
import { FreeShippingNotice } from "./FreeShippingNotice";
import { PaginatedProductGrid } from "./PaginatedProductGrid";
import { matchesCollectionFilter } from "../../lib/collection-filter";
import { buildSearchSuggestions } from "../../lib/search-suggestions";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import { SearchSuggestInput } from "../ui/SearchSuggestInput";

const REPLICA_RESULTS_ID = "search-results";

function genderOf(p: CatalogProduct): string {
  return typeof p.metadata?.gender === "string" ? p.metadata.gender : "";
}

function collectionLabel(
  collection: CollectionFilter,
  lists: { id: string; name: string }[]
): string | null {
  if (!collection) return null;
  if (collection === "likes") return "Me gusta";
  if (collection === "any-list") return "En mis listas";
  if (collection.startsWith("list:")) {
    const id = collection.slice(5);
    return lists.find((l) => l.id === id)?.name ?? "Lista";
  }
  return null;
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
}: {
  replicas: CatalogProduct[];
  essences: CatalogProduct[];
  sourceLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [sortReplicas, setSortReplicas] = useState<CatalogSort>("alpha-asc");
  const [collection, setCollection] = useState<CollectionFilter>(null);
  const likes = useFavoritesStore((s) => s.likes);
  const lists = useFavoritesStore((s) => s.lists);

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

  const searchSuggestions = useMemo(() => {
    const items = replicas.filter(isBrandedPreparedReplica).map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: "Réplica" as string | undefined,
    }));
    return buildSearchSuggestions(search, items);
  }, [search, replicas]);

  const goToReplicaResults = () => scrollToResults(REPLICA_RESULTS_ID);

  const replicaCollectionChip = useMemo(() => {
    const label = collectionLabel(collection, lists);
    if (!label) return [] as AdvancedFilterChip[];
    return [
      {
        id: "collection",
        label,
        onClear: () => {
          setCollection(null);
          goToReplicaResults();
        },
      },
    ];
  }, [collection, lists]);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2">Preparadas</h1>
      <p className="text-sm text-ink-60 mb-2">
        Réplicas preparadas listas para llevar.
      </p>
      <FreeShippingNotice variant="eligible" className="mb-4" />

      <SearchSuggestInput
        className="mb-6 w-full max-w-2xl"
        value={search}
        onChange={setSearch}
        suggestions={searchSuggestions}
        placeholder="Buscar por nombre o casa…"
        aria-label="Buscar en preparadas"
        withIcon
        resultsAnchorId={REPLICA_RESULTS_ID}
      />

      <CatalogToolbar
        gender={gender}
        onGender={(g) => {
          setGender(g);
          goToReplicaResults();
        }}
        sort={sortReplicas}
        onSort={(s) => {
          setSortReplicas(s);
          goToReplicaResults();
        }}
        showUnisex
        showCollections={false}
      />

      <CatalogAdvancedFilters
        chips={replicaCollectionChip}
        label="Colecciones"
      >
        <CollectionFilterChips
          value={collection}
          onChange={(c) => {
            setCollection(c);
            goToReplicaResults();
          }}
          className="mb-0"
        />
      </CatalogAdvancedFilters>

      <section id={REPLICA_RESULTS_ID} className="scroll-mt-24">
        <div className="mb-6">
          <h2 className="font-display text-2xl text-ink">Réplicas preparadas</h2>
          <p className="text-sm text-ink-60">
            Perfume listo en envase de fragancia (sin genéricos ni plásticos) —{" "}
            {filteredReplicas.length} resultados
          </p>
        </div>
        <PaginatedProductGrid products={filteredReplicas} intent="buy" />
      </section>
    </div>
  );
}
