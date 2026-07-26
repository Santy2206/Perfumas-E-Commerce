"use client";

import { useState } from "react";
import { BottleStep } from "../../components/builder/BottleStep";
import { FragranceStep } from "../../components/builder/FragranceStep";
import { PersonalizeStep } from "../../components/builder/PersonalizeStep";
import { PriceSummary } from "../../components/builder/PriceSummary";
import { StepIndicator } from "../../components/builder/StepIndicator";
import { useBuilderStore } from "../../store/useBuilderStore";

const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/**
 * Route: /crear
 * This page only assembles already-built pieces — all the actual logic
 * lives in lib/, store/, and components/builder/. If you want this as
 * a Server Component shell later, split the interactive parts into a
 * client child and fetch initial catalog data here with `fetch`/RSC.
 */
export default function CrearPage() {
  const step = useBuilderStore((s) => s.step);
  const cart = useBuilderStore((s) => s.cart);
  const cartTotal = useBuilderStore((s) => s.cartTotal);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-wine-950 px-4 sm:px-8 py-10 pb-28 lg:pb-10">
      <div className="max-w-6xl mx-auto">
        <StepIndicator />

        <div className="grid lg:grid-cols-[1fr_320px] gap-10">
          <div>
            {(step === 1 || step === 2) && <FragranceStep />}
            {step === 3 && <BottleStep />}
            {step === 4 && <PersonalizeStep />}
          </div>

          <div className="hidden lg:block sticky top-8 self-start">
            <PriceSummary />
          </div>
        </div>
      </div>

      {/* Mobile cart bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-wine-900 border-t border-gold-400/30 p-4">
        <button
          onClick={() => setMobileCartOpen((v) => !v)}
          className="w-full bg-gold-400 text-wine-950 rounded-sm py-3 px-5 flex justify-between items-center text-sm font-semibold"
        >
          <span>Carrito ({cart.length})</span>
          <span>{formatCOP(cartTotal())}</span>
        </button>
        {mobileCartOpen && (
          <div className="mt-3">
            <PriceSummary />
          </div>
        )}
      </div>
    </div>
  );
}
