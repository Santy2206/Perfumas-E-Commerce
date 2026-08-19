/**
 * Bulk-gram discount for essences bought at retail (by weight).
 * Not applied to wholesale (B2B) pricing — that already has its own
 * separate wholesale price per product.
 */

export type BulkDiscountTier = { minGrams: number; pct: number };

/** Highest-threshold tier first is not required; helpers sort internally. */
export const BULK_DISCOUNT_TIERS: BulkDiscountTier[] = [
  { minGrams: 100, pct: 0.05 },
  { minGrams: 200, pct: 0.1 },
];

/** Fraction off (0–1) for a given quantity in grams. 0 when no tier applies. */
export function bulkDiscountPct(grams: number): number {
  let pct = 0;
  for (const tier of BULK_DISCOUNT_TIERS) {
    if (grams >= tier.minGrams && tier.pct > pct) pct = tier.pct;
  }
  return pct;
}

/** Per-gram price after the bulk discount for this quantity, rounded to the peso. */
export function bulkDiscountedUnitPrice(
  basePricePerGram: number,
  grams: number,
): number {
  const pct = bulkDiscountPct(grams);
  return pct > 0 ? Math.round(basePricePerGram * (1 - pct)) : basePricePerGram;
}

/** Grams still needed to reach the next (better) discount tier, or null if already at the top tier. */
export function gramsToNextTier(
  grams: number,
): { minGrams: number; pct: number; more: number } | null {
  const currentPct = bulkDiscountPct(grams);
  const next = [...BULK_DISCOUNT_TIERS]
    .sort((a, b) => a.minGrams - b.minGrams)
    .find((t) => t.pct > currentPct);
  if (!next) return null;
  return { minGrams: next.minGrams, pct: next.pct, more: next.minGrams - grams };
}
