/**
 * lib/filters.ts
 * Pure functions only — no React, no state. Easy to unit test and easy
 * to swap for real API calls (e.g. Medusa product search) later without
 * touching any component.
 */

import { BOTTLES } from "./mock-data";
import type { Bottle, Fragrance, FilterState, QualityTier } from "./types";

export function filterFragrances(fragrances: Fragrance[], filters: FilterState): Fragrance[] {
  const term = filters.search.trim().toLowerCase();
  return fragrances.filter((f) => {
    if (filters.gender && f.gender !== filters.gender) return false;
    if (filters.group && f.group !== filters.group) return false;
    if (filters.house && f.house !== filters.house) return false;
    if (term && !f.contratipo.toLowerCase().includes(term) && !f.house.toLowerCase().includes(term)) return false;
    return true;
  });
}

/** Houses available for the *current* gender/group selection, so the house selector narrows dynamically instead of always listing every house in the catalog. */
export function availableHouses(fragrances: Fragrance[], filters: Omit<FilterState, "house">): string[] {
  const scoped = fragrances.filter((f) => {
    if (filters.gender && f.gender !== filters.gender) return false;
    if (filters.group && f.group !== filters.group) return false;
    return true;
  });
  return Array.from(new Set(scoped.map((f) => f.house))).sort();
}

export interface BottleOption {
  tier: QualityTier;
  bottle: Bottle | null; // null = this tier genuinely has no option for this fragrance yet
  isFragranceSpecific: boolean;
}

/**
 * Builds the exact 3-tier grid (AAA / AA / Genérico) for a given
 * fragrance. AA falls back to the universal Lujo/Cilíndrico bottle
 * when no fragrance-specific replica exists. Genérico is always
 * available. AAA is only present when the catalog actually has one.
 */
export function getBottleOptionsForFragrance(fragranceId: string, bottles: Bottle[] = BOTTLES): BottleOption[] {
  const forFragrance = (tier: QualityTier) => bottles.find((b) => b.qualityTier === tier && b.matchesFragranceIds?.includes(fragranceId));

  const aaa = forFragrance("AAA");
  const aaSpecific = forFragrance("AA");
  const aaFallback = bottles.find((b) => b.qualityTier === "AA" && !b.matchesFragranceIds);
  const generico = bottles.find((b) => b.qualityTier === "Generico");

  return [
    { tier: "AAA", bottle: aaa ?? null, isFragranceSpecific: !!aaa },
    { tier: "AA", bottle: aaSpecific ?? aaFallback ?? null, isFragranceSpecific: !!aaSpecific },
    { tier: "Generico", bottle: generico ?? null, isFragranceSpecific: false },
  ];
}

/** The single "this is the original shape" recommendation shown as a banner in Step 3. Prefers AAA (closer to the real bottle) over the standard replica. */
export function getRecommendedBottle(fragranceId: string, bottles: Bottle[] = BOTTLES): Bottle | null {
  const aaa = bottles.find((b) => b.qualityTier === "AAA" && b.matchesFragranceIds?.includes(fragranceId));
  if (aaa) return aaa;
  const aa = bottles.find((b) => b.qualityTier === "AA" && b.matchesFragranceIds?.includes(fragranceId));
  return aa ?? null;
}

export function computeFragranceCost(fragrance: Fragrance, bottle: Bottle): number {
  return Math.round(fragrance.pricePerGram * bottle.capacityMl);
}
