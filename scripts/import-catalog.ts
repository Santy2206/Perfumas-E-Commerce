/**
 * Excel → Medusa catalog import pipeline.
 *
 * Usage (from PERFUMAS-E-COMMERCE):
 *   npx tsx scripts/import-catalog.ts
 *   npx tsx scripts/import-catalog.ts --xlsx path/to/PRECIOS_FRAGANCIAS_2026.xlsx
 *
 * Without Excel files, emits catalog-seed.json from the in-app catalog
 * (ready to POST to Medusa Admin Product API).
 *
 * Sheet mapping (when xlsx present):
 *   MUJER / HOMBRE + G.O  → fragrance / essence products
 *   Env Per               → bottle variants
 *   Spla, Crem, Alco, Arom → home care + alcohol + pheromones
 *   Bisut / Acces y Marro → accessories
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Resolve catalog from compiled path or relative source
const CATALOG_SEED_PATH = resolve(process.cwd(), "scripts", "output", "catalog-seed.json");

type SeedProduct = {
  handle: string;
  title: string;
  description?: string;
  collection: string;
  status: "published";
  metadata: Record<string, unknown>;
  variants: {
    title: string;
    sku: string;
    prices: { amount: number; currency_code: string }[];
    metadata?: Record<string, unknown>;
  }[];
};

async function loadCatalogFromApp(): Promise<SeedProduct[]> {
  // Dynamic import of the TS catalog (works with tsx)
  const { CATALOG_PRODUCTS } = await import("../lib/catalog");

  return CATALOG_PRODUCTS.map((p) => {
    const retail = p.price;
    const wholesale = p.wholesalePrice ?? Math.round(retail * 0.8);
    return {
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
          prices: [
            { amount: retail, currency_code: "cop" },
            // Wholesale price applied via price list in Medusa Admin;
            // stored here for seed helpers:
          ],
          metadata: {
            wholesale_price: wholesale,
            min_qty: p.minQty ?? 1,
          },
        },
      ],
    };
  });
}

async function main() {
  const xlsxArg = process.argv.find((a) => a.startsWith("--xlsx"));
  if (xlsxArg) {
    console.log(
      "Excel path provided. Install the `xlsx` package and extend this script to parse sheets.\n" +
        "For now, falling back to in-app catalog seed."
    );
  }

  const products = await loadCatalogFromApp();
  const outDir = dirname(CATALOG_SEED_PATH);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    currency: "COP",
    region: "co",
    wholesaleDiscountDefault: 0.2,
    customerGroup: "emprendedores",
    salesChannels: ["retail", "wholesale"],
    collections: [
      { handle: "perfumeria", title: "Perfumería" },
      { handle: "insumos", title: "Insumos" },
      { handle: "hogar", title: "Hogar y cuidado" },
      { handle: "accesorios", title: "Accesorios" },
    ],
    products,
    count: products.length,
  };

  writeFileSync(CATALOG_SEED_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${products.length} products → ${CATALOG_SEED_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
