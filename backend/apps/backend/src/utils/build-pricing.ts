/**
 * Server-side custom build pricing for POST /store/builds/add-to-cart.
 * Never trust client `serverPrice` — recompute from catalog-seed.
 */

import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

export type BuildPricePayload = {
  fragranceId: string
  bottleId: string
  pheromoneIds?: string[]
  giftWrap?: boolean
  alcoholId?: string
}

type SeedVariant = {
  sku?: string
  prices?: { amount: number; currency_code: string }[]
}

type SeedProduct = {
  handle?: string
  title?: string
  metadata?: Record<string, unknown>
  variants?: SeedVariant[]
}

type CatalogIndex = {
  bySku: Map<
    string,
    {
      title: string
      amount: number
      metadata: Record<string, unknown>
    }
  >
}

const GIFT_WRAP_FEE = 3000
const DEFAULT_ALCOHOL_SKU = "alc-30"

let cachedIndex: CatalogIndex | null = null

function catalogCandidates(): string[] {
  return [
    resolve(process.cwd(), "data/catalog-seed.json"),
    resolve(process.cwd(), "../../../scripts/output/catalog-seed.json"),
    resolve(process.cwd(), "../../scripts/output/catalog-seed.json"),
    resolve(process.cwd(), "../scripts/output/catalog-seed.json"),
    resolve(__dirname, "../../data/catalog-seed.json"),
    resolve(__dirname, "../../../../../../scripts/output/catalog-seed.json"),
  ]
}

export function loadCatalogIndex(
  catalogPath?: string
): CatalogIndex {
  if (!catalogPath && cachedIndex) {
    return cachedIndex
  }

  const path =
    catalogPath ||
    catalogCandidates().find((candidate) => existsSync(candidate))

  if (!path) {
    throw new Error("catalog-seed.json not found for build pricing")
  }

  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    products?: SeedProduct[]
  }
  const bySku = new Map<
    string,
    { title: string; amount: number; metadata: Record<string, unknown> }
  >()

  for (const product of raw.products || []) {
    const metadata = (product.metadata || {}) as Record<string, unknown>
    for (const variant of product.variants || []) {
      const sku = String(variant.sku || "").trim()
      if (!sku) continue
      const amount = Number(variant.prices?.[0]?.amount)
      if (!Number.isFinite(amount) || amount < 0) continue
      bySku.set(sku, {
        title: String(product.title || sku),
        amount,
        metadata,
      })
    }
  }

  const index = { bySku }
  if (!catalogPath) {
    cachedIndex = index
  }
  return index
}

/** Reset cache (tests). */
export function resetBuildPricingCache() {
  cachedIndex = null
}

export type BuildServerPriceResult =
  | {
      ok: true
      total: number
      breakdown: {
        fragranceCost: number
        bottlePrice: number
        alcoholPrice: number
        pheromonePrice: number
        giftWrapFee: number
      }
    }
  | { ok: false; error: string }

/**
 * Mirror storefront `computeBuildPrice` using seeded Medusa catalog amounts.
 * Bottle IDs starting with `rep-` are prepared replicas (oil+bottle+alcohol included).
 */
export function computeBuildServerPrice(
  payload: BuildPricePayload,
  catalogPath?: string
): BuildServerPriceResult {
  const { bySku } = loadCatalogIndex(catalogPath)

  const fragranceId = String(payload.fragranceId || "").trim()
  const bottleId = String(payload.bottleId || "").trim()
  if (!fragranceId || !bottleId) {
    return { ok: false, error: "fragranceId and bottleId are required" }
  }

  const fragrance = bySku.get(fragranceId)
  const bottle = bySku.get(bottleId)
  if (!fragrance) {
    return { ok: false, error: `Unknown fragrance ${fragranceId}` }
  }
  if (!bottle) {
    return { ok: false, error: `Unknown bottle ${bottleId}` }
  }

  const pheromoneIds = payload.pheromoneIds ?? []
  let pheromonePrice = 0
  for (const id of pheromoneIds) {
    const pheromone = bySku.get(String(id).trim())
    if (!pheromone) {
      return { ok: false, error: `Unknown pheromone ${id}` }
    }
    pheromonePrice += pheromone.amount
  }

  const giftWrapFee = payload.giftWrap ? GIFT_WRAP_FEE : 0
  const isPrepared =
    bottleId.startsWith("rep-") ||
    bottle.metadata.product_kind === "prepared_replica"

  if (isPrepared) {
    const total = bottle.amount + pheromonePrice + giftWrapFee
    return {
      ok: true,
      total,
      breakdown: {
        fragranceCost: 0,
        bottlePrice: bottle.amount,
        alcoholPrice: 0,
        pheromonePrice,
        giftWrapFee,
      },
    }
  }

  const alcoholIdRaw = String(payload.alcoholId || DEFAULT_ALCOHOL_SKU).trim()
  const alcoholId =
    !alcoholIdRaw ||
    alcoholIdRaw === "alcohol-default" ||
    alcoholIdRaw === "included"
      ? DEFAULT_ALCOHOL_SKU
      : alcoholIdRaw
  const alcohol = bySku.get(alcoholId)
  if (!alcohol) {
    return { ok: false, error: `Unknown alcohol ${alcoholId}` }
  }

  const pricePerGram = Number(
    fragrance.metadata.price_per_gram ?? fragrance.amount
  )
  const capacityMl = Number(bottle.metadata.capacity_ml)
  if (!Number.isFinite(pricePerGram) || pricePerGram < 0) {
    return { ok: false, error: `Invalid price_per_gram for ${fragranceId}` }
  }
  if (!Number.isFinite(capacityMl) || capacityMl <= 0) {
    return { ok: false, error: `Invalid capacity_ml for ${bottleId}` }
  }

  const fragranceCost = Math.round(pricePerGram * capacityMl)
  const total =
    fragranceCost +
    bottle.amount +
    alcohol.amount +
    pheromonePrice +
    giftWrapFee

  return {
    ok: true,
    total,
    breakdown: {
      fragranceCost,
      bottlePrice: bottle.amount,
      alcoholPrice: alcohol.amount,
      pheromonePrice,
      giftWrapFee,
    },
  }
}
