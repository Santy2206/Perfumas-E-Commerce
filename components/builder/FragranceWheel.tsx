"use client";

import { OLFACTIVE_GROUPS } from "../../lib/mock-data";
import type { OlfactiveGroup } from "../../lib/types";
import { cn } from "../../lib/utils";

interface Props {
  selected: OlfactiveGroup | null;
  onSelect: (group: OlfactiveGroup) => void;
  /** md = default; sm = slightly smaller in tight panels */
  size?: "sm" | "md";
}

/** Mid size: readable labels without dominating the filter panel. */
const SIZE_CLASS = {
  sm: "w-full max-w-[180px] sm:max-w-[200px]",
  md: "w-full max-w-[200px] sm:max-w-[220px]",
} as const;

const PATHS: Record<OlfactiveGroup, string> = {
  "citricas-frescas": "M100,100 L100,10 A90,90 0 0,1 190,100 Z",
  "maderas-orientales": "M100,100 L190,100 A90,90 0 0,1 100,190 Z",
  dulces: "M100,100 L100,190 A90,90 0 0,1 10,100 Z",
  intermedios: "M100,100 L10,100 A90,90 0 0,1 100,10 Z",
};

const LABEL_POS: Record<OlfactiveGroup, [number, number]> = {
  "citricas-frescas": [140, 58],
  "maderas-orientales": [140, 145],
  dulces: [60, 128],
  intermedios: [60, 64],
};

const LINE_HEIGHT = 11.5;

export function FragranceWheel({ selected, onSelect, size = "md" }: Props) {
  const groupLabel = (id: OlfactiveGroup) =>
    OLFACTIVE_GROUPS.find((g) => g.id === id)?.label ?? id;

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
        Familia olfativa
      </p>
      <div className="flex flex-col items-center">
        <div className={cn("relative mx-auto", SIZE_CLASS[size])}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-5px] rounded-full border border-gold-400/50"
          />
          <svg
            viewBox="0 0 200 200"
            className="relative aspect-square h-auto w-full"
            role="group"
            aria-label="Filtrar por familia olfativa"
          >
            <circle
              cx={100}
              cy={100}
              r={94}
              fill="none"
              stroke="#caa969"
              strokeWidth={2.5}
            />
            {OLFACTIVE_GROUPS.map((g) => {
              const isSelected = selected === g.id;
              const [x, y] = LABEL_POS[g.id];
              return (
                <g key={g.id}>
                  <path
                    d={PATHS[g.id]}
                    className={`cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:stroke-gold-100 focus-visible:[stroke-width:4] ${
                      isSelected
                        ? "fill-gold-400 hover:fill-gold-100"
                        : "fill-ink hover:fill-wine-800"
                    }`}
                    stroke="#f5efe1"
                    strokeWidth={2}
                    onClick={() => onSelect(g.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={g.label}
                    aria-pressed={isSelected}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && onSelect(g.id)
                    }
                  >
                    <title>{g.label}</title>
                  </path>
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none font-sans font-semibold"
                    fill={isSelected ? "#0a0a0a" : "#f5efe1"}
                    fontSize={11}
                  >
                    {g.wheelLines.map((line, i) => (
                      <tspan
                        key={line}
                        x={x}
                        dy={
                          i === 0
                            ? -((g.wheelLines.length - 1) * LINE_HEIGHT) / 2
                            : LINE_HEIGHT
                        }
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            <circle cx={100} cy={100} r={15} fill="#caa969" />
            <circle cx={100} cy={100} r={8} fill="#f5efe1" />
          </svg>
        </div>
        <p className="mt-2 min-h-[1.25rem] text-center text-xs font-medium text-ink">
          {selected ? (
            <>
              <span className="text-gold-400">Seleccionada · </span>
              {groupLabel(selected)}
            </>
          ) : (
            <span className="text-ink-60">Toca una familia para filtrar</span>
          )}
        </p>
      </div>
    </div>
  );
}
