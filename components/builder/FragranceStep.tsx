"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { filterFragrances, sortFragrances } from "../../lib/filters";
import { FRAGRANCES, OLFACTIVE_GROUPS } from "../../lib/mock-data";
import { useBuilderStore } from "../../store/useBuilderStore";
import type { CatalogSort } from "../../lib/house-groups";
import { FragranceWheel } from "./FragranceWheel";
import { GlobalSearchBar, HouseSelector } from "./SearchAndFilters";
import { CatalogToolbar } from "../shop/CatalogToolbar";
import { LikeButton } from "../favorites/LikeButton";
import { AddToListButton } from "../favorites/AddToListButton";
import { likedSkuIds, listSkuIds } from "../../lib/favorites";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import type { CollectionFilter } from "../shop/CollectionFilterChips";

export function FragranceStep() {
  const filters = useBuilderStore((s) => s.filters);
  const setGroup = useBuilderStore((s) => s.setGroup);
  const setGender = useBuilderStore((s) => s.setGender);
  const selectFragrance = useBuilderStore((s) => s.selectFragrance);
  const [sort, setSort] = useState<CatalogSort>("alpha-asc");
  const [collection, setCollection] = useState<CollectionFilter>(null);
  const likes = useFavoritesStore((s) => s.likes);
  const lists = useFavoritesStore((s) => s.lists);
  const pendingBottleId = useBuilderStore((s) => s.pendingBottleId);

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

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl text-bone mb-2">Encuentra tu fragancia</h2>
      <p className="text-sm text-bone-60 mb-8">
        Busca por nombre o casa (sin importar mayúsculas), filtra por género y ordena la lista.
      </p>
      {pendingBottleId && (
        <p className="mb-6 rounded-sm border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-bone">
          Envase listo para tu creación. Elige una esencia y pasaremos directo a{" "}
          <strong className="text-gold-400">Personalizar</strong>.
        </p>
      )}

      <GlobalSearchBar />
      <CatalogToolbar
        gender={filters.gender}
        onGender={setGender}
        sort={sort}
        onSort={setSort}
        showUnisex
        collection={collection}
        onCollection={setCollection}
      />
      <FragranceWheel selected={filters.group} onSelect={setGroup} />
      <div className="mt-6">
        <HouseSelector />
      </div>

      <p className="mb-4 text-xs text-bone-60">{results.length} fragancias</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {results.map((f) => (
          <div key={f.id} className="bg-white/5 border border-gold-400/20 rounded-sm p-5">
            <div className="relative w-full aspect-square rounded-sm mb-4 overflow-hidden bg-wine-900 flex items-center justify-center">
              {f.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.imageUrl} alt={f.contratipo} className="w-full h-full object-cover" />
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
            <p className="text-[10px] uppercase tracking-widest text-gold-400 mb-2">{groupLabel(f.group)}</p>
            <h3 className="font-display text-lg text-bone mb-1">{f.contratipo}</h3>
            <p className="text-xs text-bone-60 mb-4">{f.house}</p>
            <div className="flex flex-col gap-2">
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
                className="bg-gold-400 hover:bg-gold-100 text-wine-950 text-xs font-semibold uppercase tracking-widest rounded-sm py-3 transition-colors"
              >
                Seleccionar y continuar
              </button>
              <Link
                href="/tienda/insumos?cat=esencias"
                className="text-center text-xs text-bone-60 hover:text-gold-400 underline py-1"
              >
                ¿Solo el aceite? Ver en Insumos
              </Link>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <p className="col-span-full text-center text-sm text-bone-60 py-10">
            Ninguna fragancia coincide con estos filtros.
          </p>
        )}
      </div>
    </div>
  );
}
