"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { filterFragrances, sortFragrances } from "../../lib/filters";
import { FRAGRANCES, OLFACTIVE_GROUPS } from "../../lib/mock-data";
import { scrollToResults } from "../../lib/scroll-to-results";
import { useBuilderStore } from "../../store/useBuilderStore";
import type { CatalogSort } from "../../lib/house-groups";
import { FragranceWheel } from "./FragranceWheel";
import { GlobalSearchBar, HouseSelector } from "./SearchAndFilters";
import { CatalogToolbar } from "../shop/CatalogToolbar";
import {
  CatalogAdvancedFilters,
  type AdvancedFilterChip,
} from "../shop/CatalogAdvancedFilters";
import {
  CollectionFilterChips,
  type CollectionFilter,
} from "../shop/CollectionFilterChips";
import { LikeButton } from "../favorites/LikeButton";
import { AddToListButton } from "../favorites/AddToListButton";
import { likedSkuIds, listSkuIds } from "../../lib/favorites";
import { useFavoritesStore } from "../../store/useFavoritesStore";

const RESULTS_ID = "search-results";

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

export function FragranceStep() {
  const filters = useBuilderStore((s) => s.filters);
  const setGroup = useBuilderStore((s) => s.setGroup);
  const setGender = useBuilderStore((s) => s.setGender);
  const setHouse = useBuilderStore((s) => s.setHouse);
  const selectFragrance = useBuilderStore((s) => s.selectFragrance);
  const [sort, setSort] = useState<CatalogSort>("alpha-asc");
  const [collection, setCollection] = useState<CollectionFilter>(null);
  const likes = useFavoritesStore((s) => s.likes);
  const lists = useFavoritesStore((s) => s.lists);
  const pendingBottleId = useBuilderStore((s) => s.pendingBottleId);

  const goToResults = () => scrollToResults(RESULTS_ID);

  const results = useMemo(() => {
    let list = sortFragrances(filterFragrances(FRAGRANCES, filters), sort);
    if (collection === "likes") {
      const ids = likedSkuIds(likes);
      list = list.filter((f) => ids.has(f.id));
    } else if (collection === "any-list") {
      const ids = listSkuIds(lists, "any");
      list = list.filter((f) => ids.has(f.id));
    } else if (collection?.startsWith("list:")) {
      const ids = listSkuIds(lists, collection.slice(5));
      list = list.filter((f) => ids.has(f.id));
    }
    return list;
  }, [filters, sort, collection, likes, lists]);
  const groupLabel = (id: string) => OLFACTIVE_GROUPS.find((g) => g.id === id)?.label ?? id;

  const advancedChips = useMemo(() => {
    const chips: AdvancedFilterChip[] = [];
    if (filters.group) {
      chips.push({
        id: "group",
        label: groupLabel(filters.group),
        onClear: () => {
          setGroup(filters.group!);
          goToResults();
        },
      });
    }
    if (filters.house) {
      chips.push({
        id: "house",
        label: filters.house,
        onClear: () => {
          setHouse(filters.house);
          goToResults();
        },
      });
    }
    const colLabel = collectionLabel(collection, lists);
    if (colLabel) {
      chips.push({
        id: "collection",
        label: colLabel,
        onClear: () => {
          setCollection(null);
          goToResults();
        },
      });
    }
    return chips;
  }, [filters.group, filters.house, collection, lists, setGroup, setHouse]);

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl text-ink mb-2">Encuentra tu fragancia</h2>
      <p className="text-sm text-ink-60 mb-8">
        Busca por nombre o casa (sin importar mayúsculas), filtra por género y ordena la lista.
      </p>
      {pendingBottleId && (
        <p className="mb-6 rounded-sm border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-ink">
          Envase listo para tu creación. Elige una esencia y pasaremos directo a{" "}
          <strong className="text-gold-400">Personalizar</strong>.
        </p>
      )}

      <GlobalSearchBar />
      <CatalogToolbar
        gender={filters.gender}
        onGender={(g) => {
          setGender(g);
          goToResults();
        }}
        sort={sort}
        onSort={(s) => {
          setSort(s);
          goToResults();
        }}
        showUnisex
        showCollections={false}
      />

      <CatalogAdvancedFilters chips={advancedChips} label="Familia y casa">
        <CollectionFilterChips
          value={collection}
          onChange={(c) => {
            setCollection(c);
            goToResults();
          }}
          label="Me gusta y listas"
          className="mb-0"
        />
        <FragranceWheel
          size="md"
          selected={filters.group}
          onSelect={(g) => {
            setGroup(g);
            goToResults();
          }}
        />
        <div className="mt-2">
          <HouseSelector
            onAfterSelect={() => {
              goToResults();
            }}
          />
        </div>
      </CatalogAdvancedFilters>

      <div id={RESULTS_ID} className="scroll-mt-24">
        <p className="mb-4 text-xs text-ink-60">{results.length} fragancias</p>

        <div className="mt-4 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((f) => (
            <div
              key={f.id}
              className="flex h-full flex-col rounded-sm border border-gold-400/25 bg-white p-5"
            >
              <div className="relative mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm bg-paper-soft">
                {f.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.imageUrl} alt={f.contratipo} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-3xl text-gold-400/40">{f.contratipo.charAt(0)}</span>
                )}
                <LikeButton
                  productId={f.id}
                  productKind="essence"
                  title={f.contratipo}
                  className="absolute right-2 top-2"
                />
              </div>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-gold-400">
                {groupLabel(f.group)}
              </p>
              <h3
                className="mb-1 min-h-[3.25rem] font-display text-lg leading-snug text-ink line-clamp-2"
                title={f.contratipo}
              >
                {f.contratipo}
              </h3>
              <p className="mb-4 truncate text-xs text-ink-60" title={f.house}>
                {f.house}
              </p>
              <div className="mt-auto flex flex-col gap-2">
                <AddToListButton
                  target={{
                    type: "sku",
                    productId: f.id,
                    productKind: "essence",
                    title: f.contratipo,
                  }}
                />
                <button
                  onClick={() => selectFragrance(f)}
                  className="rounded-sm bg-gold-400 py-3 text-xs font-semibold uppercase tracking-widest text-wine-950 transition-colors hover:bg-gold-100"
                >
                  Seleccionar y continuar
                </button>
                <Link
                  href={`/tienda/insumos?cat=esencias&essence=${encodeURIComponent(f.id)}`}
                  className="py-1 text-center text-xs text-ink-60 underline hover:text-gold-400"
                >
                  ¿Solo el aceite? Ver en Insumos
                </Link>
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <p className="col-span-full text-center text-sm text-ink-60 py-10">
              Ninguna fragancia coincide con estos filtros.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
