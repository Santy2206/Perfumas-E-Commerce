"use client";

import { filterFragrances } from "../../lib/filters";
import { FRAGRANCES, OLFACTIVE_GROUPS } from "../../lib/mock-data";
import { useBuilderStore } from "../../store/useBuilderStore";
import { FragranceWheel } from "./FragranceWheel";
import { GenderSelector, GlobalSearchBar, HouseSelector } from "./SearchAndFilters";

const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export function FragranceStep() {
  const filters = useBuilderStore((s) => s.filters);
  const setGroup = useBuilderStore((s) => s.setGroup);
  const selectFragrance = useBuilderStore((s) => s.selectFragrance);
  const addComponentToCart = useBuilderStore((s) => s.addComponentToCart);

  const results = filterFragrances(FRAGRANCES, filters);
  const groupLabel = (id: string) => OLFACTIVE_GROUPS.find((g) => g.id === id)?.label ?? id;

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl text-bone mb-2">Encuentra tu fragancia</h2>
      <p className="text-sm text-bone-60 mb-8">Busca directamente o explora por género, rueda olfativa y casa inspiradora.</p>

      <GlobalSearchBar />
      <GenderSelector />
      <FragranceWheel selected={filters.group} onSelect={setGroup} />
      <div className="mt-6">
        <HouseSelector />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {results.map((f) => (
          <div key={f.id} className="bg-white/5 border border-gold-400/20 rounded-sm p-5">
            <div className="w-full aspect-square rounded-sm mb-4 overflow-hidden bg-wine-900 flex items-center justify-center">
              {f.imageUrl ? (
                <img src={f.imageUrl} alt={f.contratipo} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-3xl text-gold-400/40">{f.contratipo.charAt(0)}</span>
              )}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-gold-400 mb-2">{groupLabel(f.group)}</p>
            <h3 className="font-display text-lg text-bone mb-1">{f.contratipo}</h3>
            <p className="text-xs text-bone-60 mb-4">{f.house}</p>
            <p className="text-sm font-semibold text-bone mb-4">{formatCOP(f.pricePerGram)} / gramo</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => selectFragrance(f)}
                className="bg-gold-400 hover:bg-gold-100 text-wine-950 text-xs font-semibold uppercase tracking-widest rounded-sm py-3 transition-colors"
              >
                Seleccionar y continuar
              </button>
              <button
                onClick={() => addComponentToCart(`${f.contratipo} — aceite (30 g)`, f.pricePerGram * 30, f.id)}
                className="border border-white/20 text-bone/80 hover:border-gold-400 hover:text-gold-400 text-xs rounded-sm py-2.5 transition-colors"
              >
                Comprar solo este aceite (30 g)
              </button>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="col-span-full text-center text-sm text-bone-60 py-10">Ninguna fragancia coincide con estos filtros.</p>}
      </div>
    </div>
  );
}
