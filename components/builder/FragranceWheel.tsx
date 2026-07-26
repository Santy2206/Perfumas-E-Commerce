"use client";

import { OLFACTIVE_GROUPS } from "../../lib/mock-data";
import type { OlfactiveGroup } from "../../lib/types";

interface Props {
  selected: OlfactiveGroup | null;
  onSelect: (group: OlfactiveGroup) => void;
}

// Pie-slice paths for a circle centered at (100,100) r=90, split into
// 4 quadrants starting at 12 o'clock, clockwise. One quadrant per real
// "Grupo Olfativo" — see the note in lib/mock-data.ts about why these
// four specific labels (not the classic Floral/Oriental/Woody/Fresh set).
const PATHS: Record<OlfactiveGroup, string> = {
  "citricas-frescas": "M100,100 L100,10 A90,90 0 0,1 190,100 Z",
  "maderas-orientales": "M100,100 L190,100 A90,90 0 0,1 100,190 Z",
  dulces: "M100,100 L100,190 A90,90 0 0,1 10,100 Z",
  intermedios: "M100,100 L10,100 A90,90 0 0,1 100,10 Z",
};

// Centroid-ish points, pulled in a bit from the true centroid so two-line
// labels have room to grow without crossing the quadrant dividers.
const LABEL_POS: Record<OlfactiveGroup, [number, number]> = {
  "citricas-frescas": [140, 60],
  "maderas-orientales": [140, 130],
  dulces: [60, 127],
  intermedios: [60, 65],
};

const LINE_HEIGHT = 12;

export function FragranceWheel({ selected, onSelect }: Props) {
  const groupLabel = (id: OlfactiveGroup) =>
    OLFACTIVE_GROUPS.find((g) => g.id === id)?.label ?? id;

  return (
    <div>
      <svg
        viewBox="0 0 200 200"
        className="w-64 h-64 sm:w-72 sm:h-72 mx-auto"
        role="group"
        aria-label="Filtrar por familia olfativa"
      >
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
                    : "fill-wine-800 hover:fill-wine-700"
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
                fill={isSelected ? "#230a0b" : "#f5efe1"}
                fontSize={10.5}
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
        <circle cx={100} cy={100} r={16} fill="#f5efe1" />
      </svg>
      <p className="text-center text-xs text-bone-60 mt-3 min-h-[1.5rem]">
        {selected
          ? groupLabel(selected)
          : "Toca una familia olfativa para filtrar"}
      </p>
    </div>
  );
}
