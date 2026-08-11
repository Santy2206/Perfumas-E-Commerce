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
import { OLFACTIVE_GROUPS } from "../../lib/mock-data";
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
import { HouseGroupAccordion } from "./HouseGroupAccordion";
import { FragranceWheel } from "../builder/FragranceWheel";
import { FreeShippingNotice } from "./FreeShippingNotice";
import { PaginatedProductGrid } from "./PaginatedProductGrid";
import Link from "next/link";
import { matchesCollectionFilter } from "../../lib/collection-filter";
import { buildSearchSuggestions } from "../../lib/search-suggestions";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import { SearchSuggestInput } from "../ui/SearchSuggestInput";

const REPLICA_RESULTS_ID = "search-results";
const ESSENCE_RESULTS_ID = "essence-results";

function houseOf(p: CatalogProduct): string {
  return typeof p.metadata?.house === "string" ? p.metadata.house : "";
}

function genderOf(p: CatalogProduct): string {
  return typeof p.metadata?.gender === "string" ? p.metadata.gender : "";
}

function groupOf(p: CatalogProduct): string {
  return typeof p.metadata?.group === "string" ? p.metadata.group : "";
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

  const goToReplicaResults = () => scrollToResults(REPLICA_RESULTS_ID);
  const goToEssenceResults = () => scrollToResults(ESSENCE_RESULTS_ID);

  const essenceAdvancedChips = useMemo(() => {
    const chips: AdvancedFilterChip[] = [];
    if (olfactive) {
      const label =
        OLFACTIVE_GROUPS.find((g) => g.id === olfactive)?.label ?? olfactive;
      chips.push({
        id: "olfactive",
        label,
        onClear: () => {
          setOlfactive(null);
          goToEssenceResults();
        },
      });
    }
    if (house) {
      chips.push({
        id: "house",
        label: house,
        onClear: () => {
          setHouse(null);
          goToEssenceResults();
        },
      });
    }
    return chips;
  }, [olfactive, house]);

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
        Réplicas preparadas listas para llevar, o elige una esencia e inspira tu creación.
      </p>
      <p className="mb-4 text-xs uppercase tracking-widest text-ink-60">{sourceLabel}</p>
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

      <section id={REPLICA_RESULTS_ID} className="mb-14 scroll-mt-24">
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
          onGender={(g) => {
            setGender(g);
            goToEssenceResults();
          }}
          sort={sortEssences}
          onSort={(s) => {
            setSortEssences(s);
            goToEssenceResults();
          }}
          showUnisex
          showCollections={false}
        />

        <CatalogAdvancedFilters
          chips={essenceAdvancedChips}
          label="Familia y casa"
        >
          <FragranceWheel
            size="md"
            selected={olfactive}
            onSelect={(g) => {
              setOlfactive((prev) => (prev === g ? null : g));
              goToEssenceResults();
            }}
          />
          <HouseGroupAccordion
            houses={houses}
            selected={house}
            onSelect={(h) => {
              setHouse(h);
              goToEssenceResults();
            }}
          />
        </CatalogAdvancedFilters>

        <div id={ESSENCE_RESULTS_ID} className="scroll-mt-24">
          <PaginatedProductGrid products={filteredEssences} intent="create" />
        </div>
      </section>
    </div>
  );
}
