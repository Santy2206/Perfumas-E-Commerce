/**
 * Catalog CLI
 *
 *   npx tsx scripts/catalog/cli.ts import --fragancias <xlsx> --perfumas <xlsx>
 *   npx tsx scripts/catalog/cli.ts export
 *   npx tsx scripts/catalog/cli.ts sync [--prune] [--dry-run]
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { parseBothWorkbooks } from "./parse-xlsx";
import { mapParsedCatalog } from "./map-products";
import { writeCatalogOutputs } from "./write-outputs";
import { syncMedusaCatalog } from "./sync-medusa";

function argValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  const prefix = `${name}=`;
  const hit = argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

async function cmdImport(argv: string[]) {
  const fragancias =
    argValue(argv, "--fragancias") ||
    argValue(argv, "--fragrances") ||
    process.env.PERFUMAS_FRAGANCIAS_XLSX;
  const perfumas =
    argValue(argv, "--perfumas") ||
    process.env.PERFUMAS_PERFUMAS_XLSX;

  if (!fragancias || !perfumas) {
    console.error(
      "Usage: catalog:import --fragancias <PRECIOS FRAGANCIAS.xlsx> --perfumas <PRECIOS PERFUMAS.xlsx>"
    );
    process.exit(1);
  }
  const fPath = resolve(fragancias);
  const pPath = resolve(perfumas);
  if (!existsSync(fPath)) {
    console.error("Fragancias file not found:", fPath);
    process.exit(1);
  }
  if (!existsSync(pPath)) {
    console.error("Perfumas file not found:", pPath);
    process.exit(1);
  }

  console.log("Parsing…");
  const parsed = parseBothWorkbooks(fPath, pPath);
  const mapped = mapParsedCatalog(parsed);
  const { seedPath, generatedPath } = writeCatalogOutputs(mapped);
  console.log("Summary:", mapped.summary);
  console.log("Wrote", seedPath);
  console.log("Wrote", generatedPath);
}

async function cmdExport() {
  // Re-emit seed from generated module if present; else fail with hint
  const gen = resolve(process.cwd(), "lib", "generated", "catalog-data.ts");
  if (!existsSync(gen)) {
    console.error(
      "No generated catalog. Run catalog:import with Excel paths first."
    );
    process.exit(1);
  }
  const { CATALOG_PRODUCTS, CATALOG_SUMMARY } = await import(
    "../../lib/generated/catalog-data"
  );
  const { writeCatalogOutputs } = await import("./write-outputs");
  // Rebuild a minimal MappedCatalog-compatible write via seed-only path
  const { mapParsedCatalog } = await import("./map-products");
  // Simpler: rewrite seed from CATALOG_PRODUCTS using write-outputs helpers
  const seedProducts = (CATALOG_PRODUCTS as {
    id: string;
    handle: string;
    title: string;
    description?: string;
    department: string;
    category: string;
    price: number;
    wholesalePrice?: number;
    minQty?: number;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }[]).map((p) => ({
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
    products: seedProducts,
    count: seedProducts.length,
    summary: CATALOG_SUMMARY,
  };

  const { writeFileSync, mkdirSync, existsSync: ex } = await import("fs");
  const { resolve: r, dirname } = await import("path");
  const seedPath = r(process.cwd(), "scripts", "output", "catalog-seed.json");
  if (!ex(dirname(seedPath))) mkdirSync(dirname(seedPath), { recursive: true });
  writeFileSync(seedPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Exported ${seedProducts.length} products → ${seedPath}`);
  void mapParsedCatalog;
  void writeCatalogOutputs;
}

async function cmdSync(argv: string[]) {
  const result = await syncMedusaCatalog({
    prune: hasFlag(argv, "--prune"),
    dryRun: hasFlag(argv, "--dry-run"),
  });
  console.log("Sync result:", result);
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || "import";
  if (cmd === "import") await cmdImport(argv.slice(1));
  else if (cmd === "export") await cmdExport();
  else if (cmd === "sync") await cmdSync(argv.slice(1));
  else {
    console.error("Unknown command:", cmd);
    console.error("Use: import | export | sync");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
