"use client";

import { computeFragranceCost } from "../../lib/filters";
import { CROSS_SELL_PRODUCTS, DEFAULT_BUILD_ALCOHOL, GIFT_WRAP_FEE } from "../../lib/mock-data";
import { PHEROMONES } from "../../lib/catalog";
import { useBuilderStore } from "../../store/useBuilderStore";
import type { CrossSellCategory } from "../../lib/types";
import { formatCOP } from "../../lib/utils";
import { useState } from "react";

const CATEGORY_LABEL: Record<CrossSellCategory, string> = {
  bisuteria: "Bisutería",
  accesorios: "Accesorios",
  ambientales: "Ambientales",
};

export function PersonalizeStep() {
  const fragrance = useBuilderStore((s) => s.selectedFragrance);
  const bottle = useBuilderStore((s) => s.selectedBottle);
  const labelText = useBuilderStore((s) => s.labelText);
  const giftWrap = useBuilderStore((s) => s.giftWrap);
  const selectedPheromoneIds = useBuilderStore((s) => s.selectedPheromoneIds);
  const setLabelText = useBuilderStore((s) => s.setLabelText);
  const toggleGiftWrap = useBuilderStore((s) => s.toggleGiftWrap);
  const togglePheromone = useBuilderStore((s) => s.togglePheromone);
  const currentBuildTotal = useBuilderStore((s) => s.currentBuildTotal);
  const addBuildToCart = useBuilderStore((s) => s.addBuildToCart);
  const addComponentToCart = useBuilderStore((s) => s.addComponentToCart);
  const setStep = useBuilderStore((s) => s.setStep);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!fragrance || !bottle) {
    return <p className="text-sm text-bone-60">Completa los pasos 1 y 2 primero.</p>;
  }

  const fragranceCost = computeFragranceCost(fragrance, bottle);
  const selectedPheromones = PHEROMONES.filter((p) => selectedPheromoneIds.includes(p.id));

  const onAdd = async () => {
    setAdding(true);
    setError(null);
    const result = await addBuildToCart();
    if (!result.ok) setError(result.error);
    setAdding(false);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-10">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl text-bone mb-2">Personaliza tu fragancia</h2>
        <p className="text-sm text-bone-60 mb-8">Los últimos detalles antes de agregarla al carrito.</p>

        <label className="block text-xs uppercase tracking-widest text-gold-400 mb-2">
          Texto para la etiqueta (opcional)
        </label>
        <input
          type="text"
          maxLength={40}
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          placeholder='Ej: "Para Ana ♥"'
          className="w-full bg-white/5 border border-gold-400/30 rounded-sm px-4 py-3 text-sm text-bone placeholder:text-bone-60 mb-6 focus:outline-none focus:ring-2 focus:ring-gold-400"
        />

        <p className="block text-xs uppercase tracking-widest text-gold-400 mb-3">Feromonas (opcional)</p>
        <div className="space-y-2 mb-8">
          {PHEROMONES.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedPheromoneIds.includes(p.id)}
                  onChange={() => togglePheromone(p.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-bone">{p.title}</span>
              </span>
              <span className="text-xs text-bone-60">+{formatCOP(p.price)}</span>
            </label>
          ))}
        </div>

        <label className="flex items-center gap-3 mb-10 cursor-pointer">
          <input type="checkbox" checked={giftWrap} onChange={toggleGiftWrap} className="w-4 h-4" />
          <span className="text-sm text-bone">Envolver para regalo (+{formatCOP(GIFT_WRAP_FEE)})</span>
        </label>

        <h3 className="font-display text-xl text-bone mb-4">Complementa tu ritual</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {CROSS_SELL_PRODUCTS.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-sm px-4 py-3"
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold-400 mb-1">
                  {CATEGORY_LABEL[p.category]}
                </p>
                <p className="text-sm text-bone">{p.name}</p>
                <p className="text-xs text-bone-60">{formatCOP(p.price)}</p>
              </div>
              <button
                onClick={() => addComponentToCart(p.name, p.price, p.id)}
                className="text-xs text-gold-400 hover:text-bone underline shrink-0 ml-3"
              >
                Agregar
              </button>
            </div>
          ))}
        </div>

        <button onClick={() => setStep(2)} className="text-sm text-bone-60 hover:text-gold-400 underline mt-8">
          ← Volver a envases
        </button>
      </div>

      <div className="bg-white/5 border border-gold-400/20 rounded-sm p-6 h-fit sticky top-8">
        <h4 className="font-display text-lg text-bone mb-4">Resumen</h4>
        <dl className="text-sm space-y-2 text-bone/80">
          <div className="flex justify-between">
            <dt>
              {fragrance.contratipo} ({bottle.capacityMl} g)
            </dt>
            <dd>{formatCOP(fragranceCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{bottle.name}</dt>
            <dd>{formatCOP(bottle.price)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>
              {DEFAULT_BUILD_ALCOHOL.name} ({DEFAULT_BUILD_ALCOHOL.unit})
            </dt>
            <dd>{formatCOP(DEFAULT_BUILD_ALCOHOL.price)}</dd>
          </div>
          {selectedPheromones.map((p) => (
            <div key={p.id} className="flex justify-between">
              <dt>{p.title}</dt>
              <dd>{formatCOP(p.price)}</dd>
            </div>
          ))}
          {giftWrap && (
            <div className="flex justify-between">
              <dt>Envoltura de regalo</dt>
              <dd>{formatCOP(GIFT_WRAP_FEE)}</dd>
            </div>
          )}
        </dl>
        <div className="flex justify-between pt-4 mt-4 border-t border-gold-400/30">
          <span className="font-display text-lg text-gold-400">Total</span>
          <span className="font-display text-lg text-gold-400">{formatCOP(currentBuildTotal())}</span>
        </div>
        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        <button
          onClick={onAdd}
          disabled={adding}
          className="w-full mt-6 bg-gold-400 hover:bg-gold-100 disabled:opacity-40 text-wine-950 text-sm font-semibold uppercase tracking-widest rounded-sm py-3 transition-colors"
        >
          {adding ? "Validando…" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}
