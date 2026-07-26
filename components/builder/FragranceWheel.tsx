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

const LABEL_POS: Record<OlfactiveGroup, [number, number]> = {
  "citricas-frescas": [139, 61],
  "maderas-orientales": [139, 139],
  dulces: [61, 139],
  intermedios: [61, 61],
};

export function FragranceWheel({ selected, onSelect }: Props) {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-56 sm:h-56 mx-auto" role="group" aria-label="Filtrar por familia olfativa">
      {OLFACTIVE_GROUPS.map((g) => {
        const isSelected = selected === g.id;
        return (
          <g key={g.id}>
            <path
              d={PATHS[g.id]}
              className="cursor-pointer transition-colors duration-200 hover:fill-wine-700"
              fill={isSelected ? "#caa969" : "#5c1a1a"}
              stroke="#f5efe1"
              strokeWidth={2}
              onClick={() => onSelect(g.id)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(g.id)}
            />
            <text
              x={LABEL_POS[g.id][0]}
              y={LABEL_POS[g.id][1]}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none select-none font-sans font-semibold"
              fill={isSelected ? "#230a0b" : "#f5efe1"}
              fontSize={10.5}
            >
              {g.label}
            </text>
          </g>
        );
      })}
      <circle cx={100} cy={100} r={24} fill="#f5efe1" />
      <text x={100} y={100} textAnchor="middle" dominantBaseline="middle" fill="#3a1010" fontSize={9} fontWeight={600}>
        Rueda
      </text>
    </svg>
  );
}
