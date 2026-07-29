/**
 * lib/filters.ts
 * Pure functions only — no React, no state. Easy to unit test and easy
 * to swap for real API calls (e.g. Medusa product search) later without
 * touching any component.
 */

import { BOTTLES } from "./mock-data";
import { housesMatch, normalizeText, textIncludes } from "./house-groups";
import { rankBottlesForFragrance } from "./bottle-match";
import type { Bottle, Fragrance, FilterState, QualityTier } from "./types";
import type { CatalogSort } from "./house-groups";

export function filterFragrances(fragrances: Fragrance[], filters: FilterState): Fragrance[] {
  const term = filters.search.trim();
  return fragrances.filter((f) => {
    if (filters.gender && f.gender !== filters.gender) return false;
    if (filters.group && f.group !== filters.group) return false;
    if (filters.house && !housesMatch(f.house, filters.house)) return false;
    if (
      term &&
      !textIncludes(f.contratipo, term) &&
      !textIncludes(f.house, term)
    ) {
      return false;
    }
    return true;
  });
}

export function sortFragrances(
  fragrances: Fragrance[],
  sort: CatalogSort
): Fragrance[] {
  const copy = [...fragrances];
  copy.sort((a, b) => {
    switch (sort) {
      case "alpha-desc":
        return b.contratipo.localeCompare(a.contratipo, "es", { sensitivity: "base" });
      case "price-asc":
        return (
          a.pricePerGram - b.pricePerGram ||
          a.contratipo.localeCompare(b.contratipo, "es")
        );
      case "price-desc":
        return (
          b.pricePerGram - a.pricePerGram ||
          a.contratipo.localeCompare(b.contratipo, "es")
        );
      case "alpha-asc":
      default:
        return a.contratipo.localeCompare(b.contratipo, "es", { sensitivity: "base" });
    }
  });
  return copy;
}

/** Houses available for the *current* gender/group selection, so the house selector narrows dynamically instead of always listing every house in the catalog. */
export function availableHouses(
  fragrances: Fragrance[],
  filters: Omit<FilterState, "house">
): string[] {
  const scoped = fragrances.filter((f) => {
    if (filters.gender && f.gender !== filters.gender) return false;
    if (filters.group && f.group !== filters.group) return false;
    return true;
  });
  const map = new Map<string, string>();
  for (const f of scoped) {
    const key = normalizeText(f.house);
    if (!map.has(key)) map.set(key, f.house);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
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

/** The single recommendation banner. Prefers exact links, then fuzzy name match. */
export function getRecommendedBottle(
  fragranceId: string,
  bottles: Bottle[] = BOTTLES,
  fragrance?: Fragrance | null
): Bottle | null {
  const exactAaa = bottles.find(
    (b) => b.qualityTier === "AAA" && b.matchesFragranceIds?.includes(fragranceId)
  );
  if (exactAaa) return exactAaa;
  const exactAa = bottles.find(
    (b) => b.qualityTier === "AA" && b.matchesFragranceIds?.includes(fragranceId)
  );
  if (exactAa) return exactAa;

  if (fragrance) {
    const ranked = rankBottlesForFragrance(bottles, fragrance).filter(
      (r) => r.match.score >= 55
    );
    const aaa = ranked.find((r) => r.bottle.qualityTier === "AAA");
    if (aaa) return aaa.bottle;
    const aa = ranked.find((r) => r.bottle.qualityTier === "AA");
    if (aa) return aa.bottle;
    return ranked[0]?.bottle ?? null;
  }
  return null;
}

export function computeFragranceCost(fragrance: Fragrance, bottle: Bottle): number {
  return Math.round(fragrance.pricePerGram * bottle.capacityMl);
}
