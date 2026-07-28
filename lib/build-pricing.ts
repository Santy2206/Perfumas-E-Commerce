/**
 * Server-side custom build pricing — never trust the browser total.
 * Mirrors useBuilderStore.currentBuildTotal + pheromone add-ons.
 */

import { DEFAULT_BUILD_ALCOHOL, GIFT_WRAP_FEE } from "./mock-data";
import { getProductById, PHEROMONES } from "./catalog";
import { BOTTLES, FRAGRANCES } from "./mock-data";
import { computeFragranceCost } from "./filters";

export type BuildPayload = {
  fragranceId: string;
  bottleId: string;
  pheromoneIds?: string[];
  labelText?: string;
  giftWrap?: boolean;
  alcoholId?: string;
};

export type BuildPriceResult = {
  ok: true;
  total: number;
  breakdown: {
    fragranceCost: number;
    bottlePrice: number;
    alcoholPrice: number;
    pheromonePrice: number;
    giftWrapFee: number;
  };
  metadata: {
    type: "custom_build";
    fragrance_id: string;
    bottle_id: string;
    alcohol_id: string;
    pheromone_ids: string[];
    label_text: string;
    gift_wrap: boolean;
    build_components: { variant_id: string; qty: number; name: string }[];
  };
} | { ok: false; error: string };

export function computeBuildPrice(payload: BuildPayload): BuildPriceResult {
  const fragrance = FRAGRANCES.find((f) => f.id === payload.fragranceId);
  const bottle = BOTTLES.find((b) => b.id === payload.bottleId);

  if (!fragrance) return { ok: false, error: "Fragancia no encontrada" };
  if (!bottle) return { ok: false, error: "Envase no encontrado" };

  const alcohol =
    (payload.alcoholId && getProductById(payload.alcoholId)
      ? {
          id: payload.alcoholId,
          name: getProductById(payload.alcoholId)!.title,
          price: getProductById(payload.alcoholId)!.price,
        }
      : null) ?? DEFAULT_BUILD_ALCOHOL;

  const pheromoneIds = payload.pheromoneIds ?? [];
  const selectedPheromones = PHEROMONES.filter((p) => pheromoneIds.includes(p.id));
  if (pheromoneIds.length !== selectedPheromones.length) {
    return { ok: false, error: "Feromona inválida" };
  }

  const fragranceCost = computeFragranceCost(fragrance, bottle);
  const pheromonePrice = selectedPheromones.reduce((s, p) => s + p.price, 0);
  const giftWrapFee = payload.giftWrap ? GIFT_WRAP_FEE : 0;
  const total = fragranceCost + bottle.price + alcohol.price + pheromonePrice + giftWrapFee;

  return {
    ok: true,
    total,
    breakdown: {
      fragranceCost,
      bottlePrice: bottle.price,
      alcoholPrice: alcohol.price,
      pheromonePrice,
      giftWrapFee,
    },
    metadata: {
      type: "custom_build",
      fragrance_id: fragrance.id,
      bottle_id: bottle.id,
      alcohol_id: alcohol.id,
      pheromone_ids: selectedPheromones.map((p) => p.id),
      label_text: (payload.labelText ?? "").slice(0, 40),
      gift_wrap: Boolean(payload.giftWrap),
      build_components: [
        { variant_id: fragrance.id, qty: bottle.capacityMl, name: `${fragrance.contratipo} (${bottle.capacityMl} g)` },
        { variant_id: bottle.id, qty: 1, name: bottle.name },
        { variant_id: alcohol.id, qty: 1, name: alcohol.name },
        ...selectedPheromones.map((p) => ({ variant_id: p.id, qty: 1, name: p.title })),
        ...(payload.giftWrap
          ? [{ variant_id: "gift-wrap", qty: 1, name: "Caja para regalo" }]
          : []),
      ],
    },
  };
}
