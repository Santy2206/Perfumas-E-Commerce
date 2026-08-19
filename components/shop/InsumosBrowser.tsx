"use client";

import { useEffect, useMemo, useState } from "react";
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
import { OLFACTIVE_GROUPS } from "../../lib/mock-data";
import { scrollToResults } from "../../lib/scroll-to-results";
import { cn } from "../../lib/utils";
import { FragranceWheel } from "../builder/FragranceWheel";
import { HouseGroupAccordion } from "./HouseGroupAccordion";
import { CatalogToolbar } from "./CatalogToolbar";
import { FreeShippingNotice } from "./FreeShippingNotice";
import {
  CatalogAdvancedFilters,
  type AdvancedFilterChip,
} from "./CatalogAdvancedFilters";
import {
  CollectionFilterChips,
  type CollectionFilter,
} from "./CollectionFilterChips";
import { ChipFilter } from "./FilterChips";
import { PaginatedProductGrid } from "./PaginatedProductGrid";
import { BulkDiscountNotice } from "./BulkDiscountNotice";
import { matchesCollectionFilter } from "../../lib/collection-filter";
import { buildSearchSuggestions } from "../../lib/search-suggestions";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import { SearchSuggestInput } from "../ui/SearchSuggestInput";

const RESULTS_ID = "search-results";

const CATS: { id: InsumosCat; label: string }[] = [
  { id: "esencias", label: "Esencias" },
  { id: "envases", label: "Envases" },
  { id: "alcohol", label: "Alcohol" },
  { id: "feromonas", label: "Feromonas" },
  { id: "todos", label: "Todos" },
];

/** Default view per category — envases/alcohol/feromonas open in cuadrícula, esencias in lista. */
const DEFAULT_LAYOUT_BY_CAT: Record<InsumosCat, "grid" | "list"> = {
  esencias: "list",
  envases: "grid",
  alcohol: "grid",
  feromonas: "grid",
  todos: "list",
};

const TIERS: { id: QualityTier | "all"; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "AAA", label: "AAA" },
  { id: "AA", label: "AA" },
  { id: "Generico", label: "Genérico" },
];

/** Popular sizes first; remaining capacities under "Otros". */
const SIZE_PRESETS = [30, 50, 60, 75, 90, 100] as const;

function houseOf(p: CatalogProduct): string {
  return typeof p.metadata?.house === "string" ? p.metadata.house : "";
}

/** Prefer metadata.capacity_ml; fall back to ml in the title. */
function bottleSizeMl(p: CatalogProduct): number | null {
  const meta = p.metadata?.capacity_ml;
  if (typeof meta === "number" && Number.isFinite(meta)) return meta;
  if (typeof meta === "string" && /^\d+$/.test(meta)) return Number(meta);
  const fromTitle = p.title.match(/(\d+)\s*ml/i);
  return fromTitle ? Number(fromTitle[1]) : null;
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

export function InsumosBrowser({
  products,
  wholesale = false,
}: {
  products: CatalogProduct[];
  wholesale?: boolean;
  sourceLabel: string;
}) {
  const params = useSearchParams();
  const initial = (params.get("cat") as InsumosCat) || "esencias";
  const essenceFocus = params.get("essence");
  const initialCat = CATS.some((c) => c.id === initial) ? initial : "esencias";
  const [cat, setCat] = useState<InsumosCat>(initialCat);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [group, setGroup] = useState<OlfactiveGroup | null>(null);
  const [house, setHouse] = useState<string | null>(null);
  const [tier, setTier] = useState<QualityTier | "all">("all");
  const [sizeMl, setSizeMl] = useState<number | "all">("all");
  const [sort, setSort] = useState<CatalogSort>("alpha-asc");
  const [collection, setCollection] = useState<CollectionFilter>(null);
  const [layout, setLayout] = useState<"grid" | "list">(DEFAULT_LAYOUT_BY_CAT[initialCat]);
  const likes = useFavoritesStore((s) => s.likes);
  const lists = useFavoritesStore((s) => s.lists);

  useEffect(() => {
    if (!essenceFocus) return;
    setCat("esencias");
    const match = products.find((p) => p.id === essenceFocus);
    if (match) setSearch(match.title);
  }, [essenceFocus, products]);

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

  const sizeOptions = useMemo(() => {
    const present = new Set<number>();
    for (const p of buckets.envases) {
      const ml = bottleSizeMl(p);
      if (ml != null) present.add(ml);
    }
    const presets = SIZE_PRESETS.filter((s) => present.has(s));
    const other = [...present]
      .filter(
        (s) =>
          !(SIZE_PRESETS as readonly number[]).includes(
            s as (typeof SIZE_PRESETS)[number]
          )
      )
      .sort((a, b) => a - b);
    return { presets, other };
  }, [buckets.envases]);

  const filtered = useMemo(() => {
    const base = buckets[cat] ?? buckets.todos;
    const sizeFilter = sizeMl === "all" ? null : Number(sizeMl);

    const list = base.filter((p) => {
      if (!productMatchesInsumosCat(p, cat)) return false;

      if (cat === "esencias" || (cat === "todos" && p.metadata?.product_kind === "essence")) {
        if (gender && p.metadata?.gender !== gender) return false;
        if (group && p.metadata?.group !== group) return false;
        if (house && !housesMatch(houseOf(p), house)) return false;
      }
      if (cat === "envases") {
        if (tier !== "all" && p.metadata?.quality_tier !== tier) return false;
        if (sizeFilter != null && bottleSizeMl(p) !== sizeFilter) return false;
      }

      if (search.trim()) {
        const h = houseOf(p);
        const matchesTitle = textIncludes(p.title, search);
        const matchesHouse = h ? textIncludes(h, search) : false;
        const matchesDesc = p.description ? textIncludes(p.description, search) : false;
        if (!matchesTitle && !matchesHouse && !matchesDesc) return false;
      }
      if (!matchesCollectionFilter(p.id, collection, likes, lists)) return false;
      return true;
    });

    const sorted = sortByTitleAndPrice(list, sort);
    if (!essenceFocus) return sorted;
    const focused = sorted.filter((p) => p.id === essenceFocus);
    const rest = sorted.filter((p) => p.id !== essenceFocus);
    return [...focused, ...rest];
  }, [
    buckets,
    cat,
    search,
    gender,
    group,
    house,
    tier,
    sizeMl,
    sort,
    collection,
    likes,
    lists,
    essenceFocus,
  ]);

  const goToResults = () => scrollToResults(RESULTS_ID);

  const selectCat = (next: InsumosCat) => {
    setCat(next);
    setLayout(DEFAULT_LAYOUT_BY_CAT[next]);
    setSearch("");
    if (next !== "esencias" && next !== "todos") {
      setGender(null);
      setGroup(null);
      setHouse(null);
    }
    if (next !== "envases") {
      setTier("all");
      setSizeMl("all");
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("cat", next);
      window.history.replaceState({}, "", url.toString());
    }
    goToResults();
  };

  const showEssenceFilters = cat === "esencias" || cat === "todos";

  const searchSuggestions = useMemo(
    () =>
      buildSearchSuggestions(
        search,
        (buckets[cat] ?? buckets.todos).map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: houseOf(p) || undefined,
        })),
        { houses: showEssenceFilters ? availableHouses : [] }
      ),
    [search, buckets, cat, availableHouses, showEssenceFilters]
  );

  const advancedChips = useMemo(() => {
    const chips: AdvancedFilterChip[] = [];
    if (group) {
      const label =
        OLFACTIVE_GROUPS.find((g) => g.id === group)?.label ?? group;
      chips.push({
        id: "group",
        label,
        onClear: () => {
          setGroup(null);
          goToResults();
        },
      });
    }
    if (house) {
      chips.push({
        id: "house",
        label: house,
        onClear: () => {
          setHouse(null);
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
  }, [group, house, collection, lists]);

  const envaseChips = useMemo(() => {
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
  }, [tier, sizeMl, collection, lists]);

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
      <h1 className="font-display text-3xl text-ink mb-2">Insumos</h1>
      <p className="text-sm text-ink-60 mb-2">
        Esencias, envases, alcohol y feromonas — compra por separado o úsalos en{" "}
        <a href="/crear" className="text-gold-400 underline">
          Preparar
        </a>
        .
      </p>
      <FreeShippingNotice variant="insumos" className="mb-4" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCat(c.id)}
              className={`rounded-full border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                cat === c.id
                  ? "border-gold-400 bg-gold-400 text-wine-950 shadow-[0_2px_0_0_rgba(202,169,105,0.35)]"
                  : "border-ink/20 bg-white text-ink hover:border-gold-400 hover:text-gold-400"
              }`}
            >
              {c.label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  cat === c.id ? "bg-wine-950/15 text-wine-950" : "bg-ink/10 text-ink-60"
                }`}
              >
                {buckets[c.id].length}
              </span>
            </button>
          ))}
        </div>
        <div
          className="inline-flex items-center overflow-hidden rounded-sm border-2 border-ink/15"
          role="group"
          aria-label="Tipo de vista"
        >
          <button
            type="button"
            onClick={() => setLayout("grid")}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
              layout === "grid"
                ? "bg-gold-400 text-wine-950"
                : "bg-white text-ink-60 hover:text-gold-400"
            }`}
          >
            Cuadrícula
          </button>
          <button
            type="button"
            onClick={() => setLayout("list")}
            className={`border-l-2 border-ink/15 px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
              layout === "list"
                ? "bg-gold-400 text-wine-950"
                : "bg-white text-ink-60 hover:text-gold-400"
            }`}
          >
            Lista sin imágenes
          </button>
        </div>
      </div>

      <SearchSuggestInput
        className="mb-6 w-full max-w-2xl"
        value={search}
        onChange={setSearch}
        suggestions={searchSuggestions}
        placeholder="Buscar por nombre o casa (chanel, dior…)…"
        aria-label="Buscar insumos"
        withIcon
        resultsAnchorId={RESULTS_ID}
      />

      <CatalogToolbar
        gender={showEssenceFilters ? gender : null}
        onGender={(g) => {
          setGender(g);
          goToResults();
        }}
        sort={sort}
        onSort={(s) => {
          setSort(s);
          goToResults();
        }}
        showGender={showEssenceFilters}
        showUnisex={showEssenceFilters}
        showCollections={false}
      />

      {showEssenceFilters && (
        <CatalogAdvancedFilters
          chips={advancedChips}
          label="Familia y casa"
        >
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
            selected={group}
            onSelect={(g) => {
              setGroup((prev) => (prev === g ? null : g));
              goToResults();
            }}
          />
          <HouseGroupAccordion
            houses={availableHouses}
            selected={house}
            onSelect={(h) => {
              setHouse(h);
              goToResults();
            }}
          />
        </CatalogAdvancedFilters>
      )}

      {cat === "envases" && (
        <CatalogAdvancedFilters chips={envaseChips} label="Filtros de envase">
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
            options={TIERS}
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
        </CatalogAdvancedFilters>
      )}

      {(cat === "alcohol" || cat === "feromonas") && (
        <CollectionFilterChips
          value={collection}
          onChange={(c) => {
            setCollection(c);
            goToResults();
          }}
          label="Me gusta y listas"
        />
      )}

      {showEssenceFilters && <BulkDiscountNotice className="mb-4" />}

      <div id={RESULTS_ID} className="scroll-mt-24">
        <PaginatedProductGrid
          products={filtered}
          wholesale={wholesale}
          intent="buy"
          highlightId={essenceFocus}
          layout={layout}
          showHouseColumn={showEssenceFilters}
          showGramsColumn={showEssenceFilters}
        />
      </div>
    </div>
  );
}
