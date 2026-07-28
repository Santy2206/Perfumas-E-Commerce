import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * Seed script outline for Perfumas catalog.
 * Run after DATABASE_URL points at Supabase Postgres and migrations succeed:
 *   npx medusa exec ./src/scripts/seed-perfumas.ts
 *
 * Creates collections, sales channels, emprendedores customer group,
 * and products from the storefront catalog seed JSON.
 */

const COLLECTIONS = [
  { handle: "perfumeria", title: "Perfumería" },
  { handle: "insumos", title: "Insumos" },
  { handle: "hogar", title: "Hogar y cuidado" },
  { handle: "accesorios", title: "Accesorios" },
]

export default async function seedPerfumas({ container }: { container: MedusaContainer }) {
  const logger = container.resolve("logger")
  logger.info("Perfumas seed: create collections " + COLLECTIONS.map((c) => c.handle).join(", "))
  logger.info("Next: import products via scripts/import-catalog.ts from Excel or catalog-seed.json")
  logger.info("Create customer group 'emprendedores' and wholesale price list (20% off default)")
  logger.info("Create sales channels: retail + wholesale")
}
