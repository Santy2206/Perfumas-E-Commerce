"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottleStep } from "../../components/builder/BottleStep";
import { FragranceStep } from "../../components/builder/FragranceStep";
import { PersonalizeStep } from "../../components/builder/PersonalizeStep";
import { PriceSummary } from "../../components/builder/PriceSummary";
import { StepIndicator } from "../../components/builder/StepIndicator";
import { Section } from "../../components/layout/Section";
import { useBuilderStore } from "../../store/useBuilderStore";
import { useCartStore } from "../../store/useCartStore";
import { BOTTLES, FRAGRANCES } from "../../lib/mock-data";
import { formatCOP } from "../../lib/utils";

export default function CrearClient() {
  const step = useBuilderStore((s) => s.step);
  const selectFragrance = useBuilderStore((s) => s.selectFragrance);
  const setPendingBottleId = useBuilderStore((s) => s.setPendingBottleId);
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fragranceId = searchParams.get("fragrance");
    const bottleId = searchParams.get("bottle");

    if (bottleId && !fragranceId) {
      setPendingBottleId(bottleId);
      useBuilderStore.getState().setStep(1);
      return;
    }

    if (!fragranceId) return;
    const f = FRAGRANCES.find((x) => x.id === fragranceId);
    if (!f) return;

    if (bottleId) {
      const bottle = BOTTLES.find((b) => b.id === bottleId);
      if (bottle) {
        useBuilderStore.setState({
          selectedFragrance: f,
          selectedBottle: bottle,
          pendingBottleId: null,
          selectedPheromoneIds: [],
          step: 4,
        });
        return;
      }
    }

    setPendingBottleId(null);
    selectFragrance(f);
  }, [searchParams, selectFragrance, setPendingBottleId]);

  return (
    <>
      <Section tone="light" className="px-4 sm:px-8 py-10 pb-28 lg:pb-10">
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
      </Section>

      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-wine-900 border-t border-gold-400/30 p-4 z-30">
        <button
          onClick={() => setMobileCartOpen((v) => !v)}
          className="w-full bg-gold-400 text-wine-950 rounded-sm py-3 px-5 flex justify-between items-center text-sm font-semibold"
        >
          <span>Carrito ({lines.length})</span>
          <span>{formatCOP(subtotal())}</span>
        </button>
        {mobileCartOpen && (
          <div className="mt-3">
            <PriceSummary />
          </div>
        )}
      </div>
    </>
  );
}
