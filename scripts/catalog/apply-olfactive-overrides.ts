/**
 * Re-apply olfactive classification + unisex flags onto the current
 * generated catalog without a full Excel price re-import.
 *
 *   npx tsx scripts/catalog/apply-olfactive-overrides.ts
 */

import {
  applyOlfactiveOverrides,
  syncEssenceCatalogFromFragrances,
} from "./olfactive-overrides";
import { OLFACTIVE_GROUPS } from "./sheet-maps";
import { writeCatalogOutputs } from "./write-outputs";
import type { MappedCatalog } from "./map-products";

async function main() {
  const root = process.cwd();
  const mod = await import("../../lib/generated/catalog-data");

  const fragrances = structuredClone(mod.FRAGRANCES) as {
    id: string;
    contratipo: string;
    house: string;
    gender: "dama" | "caballero" | "unisex";
    group: string;
    pricePerGram: number;
  }[];

  const catalogProducts = structuredClone(mod.CATALOG_PRODUCTS) as MappedCatalog["catalogProducts"];
  const bottles = structuredClone(mod.BOTTLES) as MappedCatalog["bottles"];
  const alcoholOptions = structuredClone(mod.ALCOHOL_OPTIONS) as MappedCatalog["alcoholOptions"];
  const pheromones = structuredClone(mod.PHEROMONES) as MappedCatalog["pheromones"];

  const stats = applyOlfactiveOverrides(fragrances, { root });
  const catalogUpdated = syncEssenceCatalogFromFragrances(fragrances, catalogProducts);

  const mapped: MappedCatalog = {
    seedProducts: [],
    fragrances,
    bottles,
    alcoholOptions,
    catalogProducts,
    pheromones,
    giftWrapFee: mod.GIFT_WRAP_FEE,
    olfactiveGroups: OLFACTIVE_GROUPS,
    summary: {
      ...(mod.CATALOG_SUMMARY as Record<string, number>),
      unisex_fragrances: fragrances.filter((f) => f.gender === "unisex").length,
    },
  };

  mapped.seedProducts = catalogProducts.map((p) => ({
    handle: p.handle,
    title: p.title,
    description: p.description,
    collection: p.department,
    status: "published" as const,
    metadata: {
      department: p.department,
      category: p.category,
      ...(p.metadata ?? {}),
      tags: p.tags ?? [],
    },
    variants: [
      {
        title: "Default",
        sku: p.id,
        prices: [{ amount: p.price, currency_code: "cop" }],
        metadata: {
          wholesale_price: p.wholesalePrice ?? Math.round(p.price * 0.8),
          min_qty: p.minQty ?? 6,
        },
      },
    ],
  }));

  const { seedPath, generatedPath } = writeCatalogOutputs(mapped, { root });

  console.log("Override stats:", stats);
  console.log("Catalog essence rows updated:", catalogUpdated);
  console.log(
    "Unisex fragrances:",
    fragrances.filter((f) => f.gender === "unisex").map((f) => `${f.contratipo} [${f.group}]`)
  );
  console.log("Wrote", generatedPath);
  console.log("Wrote", seedPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
