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
  type PriceBand,
} from "../../lib/department-taxonomy";
import { PriceBandFilter, ChipFilter } from "../shop/FilterChips";
import { textIncludes } from "../../lib/house-groups";
import { formatCOP } from "../../lib/utils";
import { LikeButton } from "../favorites/LikeButton";
import { AddToListButton } from "../favorites/AddToListButton";
import {
  CollectionFilterChips,
  type CollectionFilter,
} from "../shop/CollectionFilterChips";
import { likedSkuIds, listSkuIds } from "../../lib/favorites";
import { useFavoritesStore } from "../../store/useFavoritesStore";

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

    return ranked.filter(({ bottle, match }) => {
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
  }, [ranked, fragrance, tier, priceBand, sizeMl, matchedOnly, search, collection, likes, lists]);

  if (!fragrance) {
    return <p className="text-sm text-bone-60">Primero elige una fragancia en el paso 1.</p>;
  }

  const otherSizeSelected =
    typeof sizeMl === "number" && sizeOptions.other.includes(sizeMl);

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl text-bone mb-2">
        Elige tu réplica preparada
      </h2>
      <p className="text-sm text-bone-60 mb-6">
        Para: <strong className="text-gold-400">{fragrance.contratipo}</strong>
        <span className="text-bone-60"> ({fragrance.house})</span>. Primero las réplicas
        asociadas o con nombre parecido (ej. One Million ↔ 1 Million).
      </p>

      {recommended ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gold-400/10 border border-gold-400/40 rounded-sm p-4 mb-6">
          <div className="flex-1">
            <p className="text-sm text-bone">
              <span className="text-gold-400">★ Recomendado:</span>{" "}
              <strong>{recommended.name}</strong>
            </p>
            <p className="text-xs text-bone-60 mt-1">
              {recommended.qualityTier} · {bottleSizeMl(recommended)} ml ·{" "}
              {formatCOP(recommended.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectBottle(recommended)}
            className="shrink-0 bg-gold-400 hover:bg-gold-100 text-wine-950 text-xs font-semibold uppercase tracking-widest rounded-sm px-4 py-3"
          >
            Usar recomendado
          </button>
        </div>
      ) : null}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar réplica…"
        className="mb-4 w-full max-w-md rounded-sm border border-gold-400/30 bg-white/5 px-4 py-2.5 text-sm text-bone placeholder:text-bone-60 focus:outline-none focus:ring-2 focus:ring-gold-400"
      />

      <CollectionFilterChips value={collection} onChange={setCollection} />
      <ChipFilter label="Calidad" options={TIER_OPTS} value={tier} onChange={setTier} />
      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-widest text-gold-400">Tamaño</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSizeMl("all")}
            className={`rounded-sm border px-3 py-1.5 text-xs ${
              sizeMl === "all"
                ? "border-gold-400 text-gold-400"
                : "border-white/15 text-bone-60 hover:border-gold-400/40"
            }`}
          >
            Todos
          </button>
          {sizeOptions.presets.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSizeMl(s)}
              className={`rounded-sm border px-3 py-1.5 text-xs ${
                sizeMl === s
                  ? "border-gold-400 text-gold-400"
                  : "border-white/15 text-bone-60 hover:border-gold-400/40"
              }`}
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
              }}
              className={`rounded-sm border bg-wine-950 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-400 ${
                otherSizeSelected
                  ? "border-gold-400 text-gold-400"
                  : "border-white/15 text-bone-60"
              }`}
            >
              <option value="">Otros tamaños…</option>
              {sizeOptions.other.map((ml) => (
                <option key={ml} value={String(ml)}>
                  {ml} ml
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
      <PriceBandFilter value={priceBand} onChange={setPriceBand} />

      <label className="mb-6 flex items-center gap-2 text-sm text-bone-60 cursor-pointer">
        <input
          type="checkbox"
          checked={matchedOnly}
          onChange={(e) => setMatchedOnly(e.target.checked)}
          className="h-4 w-4"
        />
        Solo asociadas o parecidas a esta fragancia
      </label>

      <p className="mb-4 text-xs text-bone-60">
        {filtered.length} réplicas preparadas
        {tier !== "all" ? ` · ${tier}` : ""}
        {sizeMl !== "all" ? ` · ${sizeMl} ml` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-bone-60 mb-8">
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

      <p className="text-sm text-bone-60">
        ¿Buscas envases vacíos (sin contenido)?{" "}
        <Link href="/tienda/insumos?cat=envases" className="text-gold-400 underline hover:text-bone">
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
    <div className="bg-white/5 border border-gold-400/20 rounded-sm p-5 flex flex-col">
      <div className="relative aspect-square bg-white/5 rounded-sm mb-4 flex items-center justify-center text-bone-60 text-xs">
        Réplica preparada
        <LikeButton
          productId={bottle.id}
          productKind="bottle"
          title={bottle.name}
          className="absolute right-2 top-2"
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <span className="inline-block text-[10px] uppercase tracking-widest bg-wine-950 text-gold-400 px-2 py-1 rounded-sm">
          {bottle.qualityTier}
        </span>
        {match.kind === "exact" ? (
          <span className="inline-block text-[10px] uppercase tracking-widest border border-gold-400/50 text-gold-400 px-2 py-1 rounded-sm">
            Asociada
          </span>
        ) : match.kind === "similar" ? (
          <span className="inline-block text-[10px] uppercase tracking-widest border border-white/20 text-bone-60 px-2 py-1 rounded-sm">
            {match.reason || "Parecida"}
          </span>
        ) : null}
      </div>
      <p className="text-[10px] text-bone-60 mb-2">{TIER_BLURB[bottle.qualityTier]}</p>
      <h3 className="font-display text-base text-bone mb-1">{bottle.name}</h3>
      <p className="text-xs text-bone-60 mb-1">
        {ml} ml · {bottle.closure}
      </p>
      <p className="text-sm font-semibold text-bone mb-1 mt-auto">{formatCOP(bottle.price)}</p>
      <p className="text-[10px] text-bone-60 mb-4">Precio unitario (con contenido)</p>
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
