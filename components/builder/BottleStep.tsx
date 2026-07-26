"use client";

import { getBottleOptionsForFragrance, getRecommendedBottle } from "../../lib/filters";
import { ALCOHOL_OPTIONS } from "../../lib/mock-data";
import { useBuilderStore } from "../../store/useBuilderStore";
import type { QualityTier } from "../../lib/types";

const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const TIER_COPY: Record<QualityTier, { label: string; blurb: string }> = {
  AAA: { label: "AAA", blurb: "Réplica de máxima fidelidad al frasco original." },
  AA: { label: "AA", blurb: "Buena réplica, calidad estándar de tienda." },
  Generico: { label: "Genérico", blurb: "Envase funcional, no replica la forma original." },
};

export function BottleStep() {
  const fragrance = useBuilderStore((s) => s.selectedFragrance);
  const selectBottle = useBuilderStore((s) => s.selectBottle);
  const setStep = useBuilderStore((s) => s.setStep);
  const addComponentToCart = useBuilderStore((s) => s.addComponentToCart);

  if (!fragrance) {
    return <p className="text-sm text-bone-60">Primero elige una fragancia en el paso 1.</p>;
  }

  const recommended = getRecommendedBottle(fragrance.id);
  const options = getBottleOptionsForFragrance(fragrance.id);

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl text-bone mb-2">Elige tu envase</h2>
      <p className="text-sm text-bone-60 mb-6">
        Para: <strong className="text-gold-400">{fragrance.contratipo}</strong>
      </p>

      {recommended ? (
        <div className="flex items-start gap-3 bg-gold-400/10 border border-gold-400/40 rounded-sm p-4 mb-8">
          <span className="text-gold-400 text-lg leading-none">★</span>
          <p className="text-sm text-bone">
            Te recomendamos el <strong>{recommended.name}</strong> — es la réplica más fiel a la forma del frasco original de {fragrance.contratipo}.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-sm p-4 mb-8">
          <p className="text-sm text-bone-60">Aún no tenemos una réplica exacta del frasco original de {fragrance.contratipo}. Elige entre las opciones disponibles abajo.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {options.map(({ tier, bottle, isFragranceSpecific }) => (
          <div key={tier} className="bg-white/5 border border-gold-400/20 rounded-sm p-5 flex flex-col">
            <div className="aspect-square bg-white/5 rounded-sm mb-4 flex items-center justify-center text-bone-60 text-xs">
              {bottle ? "Imagen del envase" : "No disponible"}
            </div>
            <span className="inline-block self-start text-[10px] uppercase tracking-widest bg-wine-950 text-gold-400 px-2 py-1 rounded-sm mb-3">
              Calidad {TIER_COPY[tier].label}
            </span>
            <p className="text-xs text-bone-60 mb-3">{TIER_COPY[tier].blurb}</p>
            {bottle ? (
              <>
                <h3 className="font-display text-base text-bone mb-1">{bottle.name}</h3>
                <p className="text-xs text-bone-60 mb-1">{bottle.capacityMl} ml · {bottle.closure}</p>
                {isFragranceSpecific && <p className="text-[10px] text-gold-400 mb-3">Forma del frasco original</p>}
                <p className="text-sm font-semibold text-bone mt-auto mb-4">{formatCOP(bottle.price)}</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => selectBottle(bottle)}
                    className="bg-gold-400 hover:bg-gold-100 text-wine-950 text-xs font-semibold uppercase tracking-widest rounded-sm py-3 transition-colors"
                  >
                    Seleccionar y continuar
                  </button>
                  <button
                    onClick={() => addComponentToCart(bottle.name, bottle.price, bottle.id)}
                    className="border border-white/20 text-bone/80 hover:border-gold-400 hover:text-gold-400 text-xs rounded-sm py-2.5 transition-colors"
                  >
                    Comprar solo este envase
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-bone-60 mt-auto">Sin opción {TIER_COPY[tier].label} para esta fragancia todavía.</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-gold-400/20 rounded-sm p-5 mb-6">
        <h4 className="font-display text-base text-bone mb-1">Bases y alcohol</h4>
        <p className="text-xs text-bone-60 mb-4">Un alcohol base se incluye automáticamente en cada fragancia que construyas. También puedes comprarlo por separado.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {ALCOHOL_OPTIONS.map((a) => (
            <div key={a.id} className="flex items-center justify-between border border-white/10 rounded-sm px-4 py-3">
              <div>
                <p className="text-sm text-bone">{a.unit}</p>
                <p className="text-xs text-bone-60">{formatCOP(a.price)}</p>
              </div>
              <button onClick={() => addComponentToCart(`${a.name} ${a.unit}`, a.price, a.id)} className="text-xs text-gold-400 hover:text-bone underline">
                Agregar
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setStep(1)} className="text-sm text-bone-60 hover:text-gold-400 underline">
        ← Volver a fragancias
      </button>
    </div>
  );
}
