"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BOTTLES } from "../../lib/mock-data";
import { getRecommendedBottle } from "../../lib/filters";
import { rankBottlesForFragrance, type BottleMatch } from "../../lib/bottle-match";
import { useBuilderStore } from "../../store/useBuilderStore";
import type { Bottle, QualityTier } from "../../lib/types";
import {
  matchesPriceBand,
  PRICE_BANDS,
  type PriceBand,
} from "../../lib/department-taxonomy";
import { PriceBandFilter, ChipFilter } from "../shop/FilterChips";
import {
  CATALOG_SORT_OPTIONS,
  textIncludes,
  type CatalogSort,
} from "../../lib/house-groups";
import { buildSearchSuggestions } from "../../lib/search-suggestions";
import { scrollToResults } from "../../lib/scroll-to-results";
import { cn, formatCOP } from "../../lib/utils";
import { SearchSuggestInput } from "../ui/SearchSuggestInput";
import { LikeButton } from "../favorites/LikeButton";
import { AddToListButton } from "../favorites/AddToListButton";
import {
  CatalogAdvancedFilters,
  type AdvancedFilterChip,
} from "../shop/CatalogAdvancedFilters";
import {
  CollectionFilterChips,
  type CollectionFilter,
} from "../shop/CollectionFilterChips";
import { likedSkuIds, listSkuIds } from "../../lib/favorites";
import { useFavoritesStore } from "../../store/useFavoritesStore";

const RESULTS_ID = "search-results";

const TIER_OPTS: { id: QualityTier | "all"; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "AAA", label: "AAA" },
  { id: "AA", label: "AA" },
  { id: "Generico", label: "Genérico" },
];

const TIER_BLURB: Record<QualityTier, string> = {
  AAA: "Réplica preparada AAA",
  AA: "Réplica preparada estándar",
  Generico: "Genérico / perfumero",
};

/** Popular sizes first; remaining capacities collapsed under "Otros". */
const SIZE_PRESETS = [30, 50, 60, 75, 90, 100] as const;

const BOTTLE_SORT_OPTIONS = [
  { id: "relevance" as const, label: "Relevancia" },
  ...CATALOG_SORT_OPTIONS,
];

/** Prefer ml parsed from the product name when present (source of truth in Excel titles). */
function bottleSizeMl(bottle: Bottle): number {
  const fromName = bottle.name.match(/(\d+)\s*ml/i);
  if (fromName) return Number(fromName[1]);
  return Number(bottle.capacityMl);
}

export function BottleStep() {
  const fragrance = useBuilderStore((s) => s.selectedFragrance);
  const selectBottle = useBuilderStore((s) => s.selectBottle);
  const [tier, setTier] = useState<QualityTier | "all">("all");
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [sizeMl, setSizeMl] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [matchedOnly, setMatchedOnly] = useState(false);
  const [collection, setCollection] = useState<CollectionFilter>(null);
  const [sort, setSort] = useState<CatalogSort | "relevance">("relevance");
  const likes = useFavoritesStore((s) => s.likes);
  const lists = useFavoritesStore((s) => s.lists);

  const recommended = fragrance
    ? getRecommendedBottle(fragrance.id, BOTTLES, fragrance)
    : null;

  const sizeOptions = useMemo(() => {
    const present = new Set(BOTTLES.map((b) => bottleSizeMl(b)));
    const presets = SIZE_PRESETS.filter((s) => present.has(s));
    const other = [...present]
      .filter((s) => !(SIZE_PRESETS as readonly number[]).includes(s as (typeof SIZE_PRESETS)[number]))
      .sort((a, b) => a - b);
    return { presets, other };
  }, []);

  const ranked = useMemo(() => {
    if (!fragrance) return [] as { bottle: Bottle; match: BottleMatch }[];
    return rankBottlesForFragrance(BOTTLES, fragrance);
  }, [fragrance]);

  const filtered = useMemo(() => {
    if (!fragrance) return [] as { bottle: Bottle; match: BottleMatch }[];

    const sizeFilter = sizeMl === "all" ? null : Number(sizeMl);

    const list = ranked.filter(({ bottle, match }) => {
      if (tier !== "all" && bottle.qualityTier !== tier) return false;
      if (!matchesPriceBand(bottle.price, priceBand)) return false;
      if (sizeFilter != null && bottleSizeMl(bottle) !== sizeFilter) return false;
      if (matchedOnly && match.score < 55) return false;
      if (search.trim() && !textIncludes(bottle.name, search)) return false;
      if (collection === "likes") {
        if (!likedSkuIds(likes).has(bottle.id)) return false;
      } else if (collection === "any-list") {
        if (!listSkuIds(lists, "any").has(bottle.id)) return false;
      } else if (collection?.startsWith("list:")) {
        if (!listSkuIds(lists, collection.slice(5)).has(bottle.id)) return false;
      }
      return true;
    });

    if (sort === "relevance") return list;

    const copy = [...list];
    copy.sort((a, b) => {
      switch (sort) {
        case "alpha-desc":
          return b.bottle.name.localeCompare(a.bottle.name, "es", {
            sensitivity: "base",
          });
        case "price-asc":
          return (
            a.bottle.price - b.bottle.price ||
            a.bottle.name.localeCompare(b.bottle.name, "es")
          );
        case "price-desc":
          return (
            b.bottle.price - a.bottle.price ||
            a.bottle.name.localeCompare(b.bottle.name, "es")
          );
        case "alpha-asc":
        default:
          return a.bottle.name.localeCompare(b.bottle.name, "es", {
            sensitivity: "base",
          });
      }
    });
    return copy;
  }, [
    ranked,
    fragrance,
    tier,
    priceBand,
    sizeMl,
    matchedOnly,
    search,
    collection,
    likes,
    lists,
    sort,
  ]);

  const searchSuggestions = useMemo(
    () =>
      buildSearchSuggestions(
        search,
        BOTTLES.map((b) => ({
          id: b.id,
          title: b.name,
          subtitle: b.qualityTier,
        }))
      ),
    [search]
  );

  const goToResults = () => scrollToResults(RESULTS_ID);

  const advancedChips = useMemo(() => {
    const chips: AdvancedFilterChip[] = [];
    if (tier !== "all") {
      chips.push({
        id: "tier",
        label: tier,
        onClear: () => {
          setTier("all");
          goToResults();
        },
      });
    }
    if (sizeMl !== "all") {
      chips.push({
        id: "size",
        label: `${sizeMl} ml`,
        onClear: () => {
          setSizeMl("all");
          goToResults();
        },
      });
    }
    if (priceBand !== "all") {
      const label =
        PRICE_BANDS.find((b) => b.id === priceBand)?.label ?? priceBand;
      chips.push({
        id: "price",
        label,
        onClear: () => {
          setPriceBand("all");
          goToResults();
        },
      });
    }
    if (collection === "likes") {
      chips.push({
        id: "collection",
        label: "Me gusta",
        onClear: () => {
          setCollection(null);
          goToResults();
        },
      });
    } else if (collection === "any-list") {
      chips.push({
        id: "collection",
        label: "En mis listas",
        onClear: () => {
          setCollection(null);
          goToResults();
        },
      });
    } else if (collection?.startsWith("list:")) {
      const id = collection.slice(5);
      chips.push({
        id: "collection",
        label: lists.find((l) => l.id === id)?.name ?? "Lista",
        onClear: () => {
          setCollection(null);
          goToResults();
        },
      });
    }
    if (matchedOnly) {
      chips.push({
        id: "matched",
        label: "Solo asociadas",
        onClear: () => {
          setMatchedOnly(false);
          goToResults();
        },
      });
    }
    return chips;
  }, [tier, sizeMl, priceBand, collection, matchedOnly, lists]);

  if (!fragrance) {
    return <p className="text-sm text-ink-60">Primero elige una fragancia en el paso 1.</p>;
  }

  const otherSizeSelected =
    typeof sizeMl === "number" && sizeOptions.other.includes(sizeMl);

  const sizeChip = (active: boolean) =>
    cn(
      "rounded-sm border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
      active
        ? "border-gold-400 bg-gold-400 text-ink"
        : "border-ink/20 bg-paper-soft text-ink hover:border-gold-400 hover:text-gold-400"
    );

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl text-ink mb-2">
        Elige tu réplica preparada
      </h2>
      <p className="text-sm text-ink-60 mb-6">
        Para: <strong className="text-gold-400">{fragrance.contratipo}</strong>
        <span className="text-ink-60"> ({fragrance.house})</span>. Primero las réplicas
        asociadas o con nombre parecido (ej. One Million ↔ 1 Million).
      </p>

      {recommended ? (
        <div className="mb-6 flex flex-col gap-3 rounded-sm border-2 border-gold-400/50 bg-gold-400/10 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm text-ink">
              <span className="text-gold-400">★ Recomendado:</span>{" "}
              <strong>{recommended.name}</strong>
            </p>
            <p className="mt-1 text-xs text-ink-60">
              {recommended.qualityTier} · {bottleSizeMl(recommended)} ml ·{" "}
              {formatCOP(recommended.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectBottle(recommended)}
            className="shrink-0 rounded-sm bg-gold-400 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-wine-950 hover:bg-gold-100"
          >
            Usar recomendado
          </button>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <SearchSuggestInput
          className="w-full max-w-2xl"
          value={search}
          onChange={setSearch}
          suggestions={searchSuggestions}
          placeholder="Buscar réplica…"
          aria-label="Buscar envase réplica"
          withIcon
          resultsAnchorId={RESULTS_ID}
        />
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink">
          <span>Ordenar</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as CatalogSort | "relevance");
              goToResults();
            }}
            className="rounded-sm border-2 border-ink/25 bg-white px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-gold-400"
          >
            {BOTTLE_SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CatalogAdvancedFilters chips={advancedChips} label="Filtros de envase">
        <CollectionFilterChips
          value={collection}
          onChange={(c) => {
            setCollection(c);
            goToResults();
          }}
          label="Me gusta y listas"
          className="mb-0"
        />
        <ChipFilter
          label="Calidad"
          options={TIER_OPTS}
          value={tier}
          onChange={(t) => {
            setTier(t);
            goToResults();
          }}
        />
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
            Tamaño
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSizeMl("all");
                goToResults();
              }}
              className={sizeChip(sizeMl === "all")}
            >
              Todos
            </button>
            {sizeOptions.presets.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSizeMl(s);
                  goToResults();
                }}
                className={sizeChip(sizeMl === s)}
              >
                {s} ml
              </button>
            ))}
            {sizeOptions.other.length > 0 ? (
              <select
                aria-label="Otros tamaños"
                value={otherSizeSelected ? String(sizeMl) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSizeMl(v ? Number(v) : "all");
                  goToResults();
                }}
                className={cn(
                  "rounded-sm border bg-white px-2.5 py-1.5 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-gold-400",
                  otherSizeSelected
                    ? "border-gold-400 bg-gold-400 text-ink"
                    : "border-ink/20 text-ink"
                )}
              >
                <option value="">Otros…</option>
                {sizeOptions.other.map((ml) => (
                  <option key={ml} value={String(ml)}>
                    {ml} ml
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
        <PriceBandFilter
          value={priceBand}
          onChange={(b) => {
            setPriceBand(b);
            goToResults();
          }}
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-ink/15 bg-paper-soft px-3 py-2 text-xs font-medium text-ink">
          <input
            type="checkbox"
            checked={matchedOnly}
            onChange={(e) => {
              setMatchedOnly(e.target.checked);
              goToResults();
            }}
            className="h-3.5 w-3.5 accent-gold-400"
          />
          Solo asociadas o parecidas a esta fragancia
        </label>
      </CatalogAdvancedFilters>

      <div id={RESULTS_ID} className="scroll-mt-24">
      <p className="mb-4 text-xs text-ink-60">
        {filtered.length} réplicas preparadas
        {tier !== "all" ? ` · ${tier}` : ""}
        {sizeMl !== "all" ? ` · ${sizeMl} ml` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-60 mb-8">
          Ninguna réplica coincide. Prueba otro tamaño, quitar calidad o desmarcar el filtro de
          asociadas.
        </p>
      ) : (
        <div
          key={`size-${sizeMl}-tier-${tier}-n-${filtered.length}`}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10"
        >
          {filtered.map(({ bottle, match }) => (
            <BottleCard
              key={`${bottle.id}-${bottleSizeMl(bottle)}-${bottle.name}`}
              bottle={bottle}
              match={match}
              onSelect={selectBottle}
            />
          ))}
        </div>
      )}
      </div>

      <p className="text-sm text-ink-60">
        ¿Buscas envases vacíos (sin contenido)?{" "}
        <Link href="/tienda/insumos?cat=envases" className="text-gold-400 underline hover:text-ink">
          Ver en Insumos
        </Link>
      </p>
    </div>
  );
}

function BottleCard({
  bottle,
  match,
  onSelect,
}: {
  bottle: Bottle;
  match: BottleMatch;
  onSelect: (b: Bottle) => void;
}) {
  const ml = bottleSizeMl(bottle);
  return (
    <div className="bg-white border border-gold-400/25 rounded-sm p-5 flex flex-col">
      <div className="relative aspect-square bg-paper-soft rounded-sm mb-4 flex items-center justify-center text-ink-60 text-xs overflow-hidden">
        {bottle.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bottle.imageUrl}
            alt={bottle.name}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          "Réplica preparada"
        )}
        <LikeButton
          productId={bottle.id}
          productKind="bottle"
          title={bottle.name}
          className="absolute right-2 top-2"
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <span className="inline-block rounded-sm border-2 border-gold-400 bg-gold-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink">
          {bottle.qualityTier}
        </span>
        {match.kind === "exact" ? (
          <span className="inline-block rounded-sm border-2 border-gold-400 bg-gold-400 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink">
            Asociada
          </span>
        ) : match.kind === "similar" ? (
          <span className="inline-block rounded-sm border-2 border-gold-400/50 bg-paper-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink">
            {match.reason || "Parecida"}
          </span>
        ) : null}
      </div>
      <p className="text-[10px] text-ink-60 mb-2">{TIER_BLURB[bottle.qualityTier]}</p>
      <h3 className="font-display text-base text-ink mb-1">{bottle.name}</h3>
      <p className="text-xs text-ink-60 mb-1">
        {ml} ml · {bottle.closure}
      </p>
      <p className="text-sm font-semibold text-ink mb-1 mt-auto">{formatCOP(bottle.price)}</p>
      <p className="text-[10px] text-ink-60 mb-4">Precio unitario (con contenido)</p>
      <div className="flex flex-col gap-2">
        <AddToListButton
          target={{
            type: "sku",
            productId: bottle.id,
            productKind: "bottle",
            title: bottle.name,
          }}
        />
        <button
          type="button"
          onClick={() => onSelect(bottle)}
          className="bg-gold-400 hover:bg-gold-100 text-wine-950 text-xs font-semibold uppercase tracking-widest rounded-sm py-3 transition-colors"
        >
          Seleccionar y continuar
        </button>
      </div>
    </div>
  );
}
