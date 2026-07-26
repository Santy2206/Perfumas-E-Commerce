"use client";

import { useBuilderStore } from "../../store/useBuilderStore";
import type { BuilderStep } from "../../lib/types";

export function StepIndicator() {
  const step = useBuilderStore((s) => s.step);
  const setStep = useBuilderStore((s) => s.setStep);

  // Collapse the duplicate "Esencia" dot from STEPS for display, since step 1 and 2
  // both render FragranceStep (see app/crear/page.tsx).
  const display = [
    { n: 1 as BuilderStep, label: "Esencia" },
    { n: 3 as BuilderStep, label: "Envase" },
    { n: 4 as BuilderStep, label: "Personalizar" },
  ];

  return (
    <ol className="flex items-center justify-center gap-3 mb-10 flex-wrap">
      {display.map((s, idx) => {
        const isActive = step === s.n || (s.n === 1 && step === 2);
        const isDone = step > s.n && !(s.n === 1 && step === 2);
        const clickable = s.n <= step;
        return (
          <li key={s.n} className="flex items-center gap-3">
            <button type="button" disabled={!clickable} onClick={() => clickable && setStep(s.n)} className="flex items-center gap-2 disabled:cursor-not-allowed">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold font-display ${
                  isActive || isDone ? "bg-gold-400 text-wine-950" : "border border-gold-400/30 text-bone"
                }`}
              >
                {isDone ? "✓" : idx + 1}
              </span>
              <span className={`text-xs uppercase tracking-widest hidden sm:inline ${isActive ? "text-gold-400" : "text-bone-60"}`}>{s.label}</span>
            </button>
            {idx < display.length - 1 && <span className="w-6 h-px bg-gold-400/30" />}
          </li>
        );
      })}
    </ol>
  );
}
