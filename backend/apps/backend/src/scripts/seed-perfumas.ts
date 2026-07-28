import { readFileSync, existsSync, writeFileSync } from "fs"
import { resolve } from "path"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createCustomerGroupsWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkProductsToSalesChannelWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

type SeedVariant = {
  title: string
  sku: string
  prices: { amount: number; currency_code: string }[]
  metadata?: Record<string, unknown>
}

type SeedProduct = {
  handle: string
  title: string
  description?: string
  collection: string
  status?: string
  metadata?: Record<string, unknown>
  variants: SeedVariant[]
}

type CatalogSeed = {
  collections: { handle: string; title: string }[]
  products: SeedProduct[]
}

const SHIPPING_OPTIONS = [
  {
    name: "Pickup Fontibón",
    code: "pickup_fontibon",
    description: "Retiro en tienda Fontibón",
    amount: 0,
  },
  {
    name: "Pickup Bonanza",
    code: "pickup_bonanza",
    description: "Retiro en tienda Bonanza",
    amount: 0,
  },
  {
    name: "Bogotá delivery",
    code: "bogota_delivery",
    description: "Entrega en Bogotá",
    amount: 8000,
  },
  {
    name: "National shipping",
    code: "national_shipping",
    description: "Envío nacional Colombia",
    amount: 15000,
  },
]

function loadCatalog(): CatalogSeed {
  const candidates = [
    resolve(process.cwd(), "../../../scripts/output/catalog-seed.json"),
    resolve(process.cwd(), "../../scripts/output/catalog-seed.json"),
    resolve(process.cwd(), "../scripts/output/catalog-seed.json"),
    resolve(__dirname, "../../../../../../scripts/output/catalog-seed.json"),
  ]
  const path = candidates.find((p) => existsSync(p))
  if (!path) {
    throw new Error(
      "catalog-seed.json not found. Run `npm run catalog:export` from PERFUMAS-E-COMMERCE first."
    )
  }
  return JSON.parse(readFileSync(path, "utf8")) as CatalogSeed
}

function first<T>(rows: T[] | undefined): T | undefined {
  return rows?.[0]
}

/**
 * Seeds Perfumas commerce basics + catalog into Medusa.
 * From apps/backend:
 *   npx medusa exec ./src/scripts/seed-perfumas.ts
 */
export default async function seedPerfumas({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  const catalog = loadCatalog()
  logger.info(`Loaded catalog with ${catalog.products.length} products`)

  // --- Sales channels ---
  const { data: existingChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  const findChannel = (name: string) =>
    existingChannels.find(
      (c: { name?: string }) => c.name?.toLowerCase() === name.toLowerCase()
    )

  let retailChannel = findChannel("retail") || findChannel("Default Sales Channel")
  let wholesaleChannel = findChannel("wholesale")

  if (!retailChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          { name: "retail", description: "Perfumas retail storefront" },
        ],
      },
    })
    retailChannel = result[0]
    logger.info(`Created sales channel retail (${retailChannel.id})`)
  } else {
    logger.info(`Using sales channel ${retailChannel.name} (${retailChannel.id})`)
  }

  if (!wholesaleChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "wholesale",
            description: "Perfumas B2B / emprendedores",
          },
        ],
      },
    })
    wholesaleChannel = result[0]
    logger.info(`Created sales channel wholesale (${wholesaleChannel.id})`)
  }

  // --- Publishable API key ---
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "type"],
    filters: { type: "publishable" },
  })

  let publishableKey = first(
    existingKeys as { id: string; title?: string; token?: string }[]
  )
  if (!publishableKey?.token) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Perfumas Storefront",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })
    publishableKey = result[0]
    logger.info(`Created publishable API key ${publishableKey.id}`)
  } else {
    logger.info(`Using existing publishable API key ${publishableKey.id}`)
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableKey.id,
      add: [retailChannel.id, wholesaleChannel.id],
    },
  })

  // --- Store currencies (COP) ---
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_sales_channel_id"],
  })
  const store = first(stores as { id: string }[])
  if (store) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          name: "Perfumas",
          supported_currencies: [
            { currency_code: "cop", is_default: true },
          ],
          default_sales_channel_id: retailChannel.id,
        },
      },
    })
    logger.info("Updated store for COP + retail default channel")
  }

  // --- Region Colombia ---
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  })
  let region = (regions as { id: string; name?: string; currency_code?: string }[]).find(
    (r) =>
      r.name?.toLowerCase() === "colombia" ||
      r.currency_code?.toLowerCase() === "cop"
  )

  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Colombia",
            currency_code: "cop",
            countries: ["co"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = result[0]
    logger.info(`Created region Colombia (${region.id})`)

    try {
      await createTaxRegionsWorkflow(container).run({
        input: [{ country_code: "co", provider_id: "tp_system" }],
      })
    } catch (e) {
      logger.warn(`Tax region CO skipped: ${e instanceof Error ? e.message : e}`)
    }
  } else {
    logger.info(`Using region ${region.name} (${region.id})`)
  }

  // --- Stock location ---
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  let stockLocation = first(locations as { id: string; name?: string }[])
  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Perfumas Fontibón",
            address: {
              city: "Bogotá",
              country_code: "CO",
              address_1: "Fontibón",
            },
          },
        ],
      },
    })
    stockLocation = result[0]
    logger.info(`Created stock location ${stockLocation.id}`)
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
  } catch {
    // already linked
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [retailChannel.id, wholesaleChannel.id],
    },
  })

  // --- Fulfillment set + shipping options ---
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })
  const shippingProfile = first(shippingProfiles as { id: string }[])
  if (!shippingProfile) {
    throw new Error("No shipping profile found — run migrations first")
  }

  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.id", "service_zones.name"],
  })

  let fulfillmentSet = (
    fulfillmentSets as {
      id: string
      name?: string
      service_zones?: { id: string; name?: string }[]
    }[]
  ).find((f) => f.name === "Perfumas Colombia")

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Perfumas Colombia",
      type: "shipping",
      service_zones: [
        {
          name: "Colombia",
          geo_zones: [{ country_code: "co", type: "country" }],
        },
      ],
    })
    logger.info(`Created fulfillment set ${fulfillmentSet.id}`)

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    })
  }

  const serviceZoneId =
    fulfillmentSet.service_zones?.[0]?.id ||
    (fulfillmentSet as { service_zones?: { id: string }[] }).service_zones?.[0]
      ?.id

  if (!serviceZoneId) {
    throw new Error("Fulfillment set has no service zone")
  }

  const { data: existingShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  })
  const existingShippingNames = new Set(
    (existingShippingOptions as { name?: string }[]).map((o) => o.name)
  )

  const shippingToCreate = SHIPPING_OPTIONS.filter(
    (o) => !existingShippingNames.has(o.name)
  )

  if (shippingToCreate.length) {
    await createShippingOptionsWorkflow(container).run({
      input: shippingToCreate.map((opt) => ({
        name: opt.name,
        price_type: "flat" as const,
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: opt.name,
          description: opt.description,
          code: opt.code,
        },
        prices: [
          { currency_code: "cop", amount: opt.amount },
          { region_id: region.id, amount: opt.amount },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
          { attribute: "is_return", value: "false", operator: "eq" as const },
        ],
      })),
    })
    logger.info(`Created ${shippingToCreate.length} shipping options`)
  } else {
    logger.info("Shipping options already present")
  }

  // --- Collections ---
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle", "title"],
  })
  const collectionByHandle = new Map(
    (existingCollections as { id: string; handle?: string }[]).map((c) => [
      c.handle,
      c,
    ])
  )

  const collectionsToCreate = catalog.collections.filter(
    (c) => !collectionByHandle.has(c.handle)
  )
  if (collectionsToCreate.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: collectionsToCreate },
    })
    for (const c of result) {
      collectionByHandle.set(c.handle, c)
    }
    logger.info(`Created ${result.length} collections`)
  }

  // --- Products ---
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const existingHandles = new Set(
    (existingProducts as { handle?: string }[]).map((p) => p.handle)
  )

  const productsToCreate = catalog.products.filter(
    (p) => !existingHandles.has(p.handle)
  )

  const createdVariantIds: {
    sku: string
    variantId: string
    wholesale?: number
    minQty?: number
  }[] = []

  const chunkSize = 10
  for (let i = 0; i < productsToCreate.length; i += chunkSize) {
    const chunk = productsToCreate.slice(i, i + chunkSize)
    const { result: created } = await createProductsWorkflow(container).run({
      input: {
        products: chunk.map((p) => {
          const collection = collectionByHandle.get(p.collection)
          return {
            title: p.title,
            handle: p.handle,
            description: p.description || "",
            status: ProductStatus.PUBLISHED,
            collection_id: collection?.id,
            shipping_profile_id: shippingProfile.id,
            metadata: p.metadata || {},
            sales_channels: [{ id: retailChannel.id }, { id: wholesaleChannel.id }],
            options: [{ title: "Default", values: ["Default"] }],
            variants: p.variants.map((v) => ({
              title: v.title || "Default",
              sku: v.sku,
              options: { Default: "Default" },
              prices: v.prices.map((price) => ({
                amount: price.amount,
                currency_code: price.currency_code.toLowerCase(),
              })),
              metadata: v.metadata || {},
              manage_inventory: true,
            })),
          }
        }),
      },
    })

    for (const product of created) {
      for (const variant of product.variants || []) {
        const meta = (variant.metadata || {}) as Record<string, unknown>
        createdVariantIds.push({
          sku: variant.sku || "",
          variantId: variant.id,
          wholesale:
            typeof meta.wholesale_price === "number"
              ? meta.wholesale_price
              : undefined,
          minQty: typeof meta.min_qty === "number" ? meta.min_qty : undefined,
        })
      }
    }
    logger.info(
      `Created products ${i + 1}-${Math.min(i + chunkSize, productsToCreate.length)} / ${productsToCreate.length}`
    )
  }

  if (!productsToCreate.length) {
    logger.info("All catalog products already exist")
    // still link existing products to sales channels
    const { data: allProducts } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
    })
    const ids = (allProducts as { id: string }[]).map((p) => p.id)
    if (ids.length) {
      await linkProductsToSalesChannelWorkflow(container).run({
        input: { id: retailChannel.id, add: ids },
      })
      await linkProductsToSalesChannelWorkflow(container).run({
        input: { id: wholesaleChannel.id, add: ids },
      })
    }
  }

  // Inventory levels for managed variants
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  })
  const { data: existingLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id"],
  })
  const leveled = new Set(
    (existingLevels as { inventory_item_id?: string; location_id?: string }[])
      .filter((l) => l.location_id === stockLocation.id)
      .map((l) => l.inventory_item_id)
  )

  const levelsToCreate = (
    inventoryItems as { id: string; sku?: string }[]
  )
    .filter((item) => !leveled.has(item.id))
    .map((item) => ({
      inventory_item_id: item.id,
      location_id: stockLocation.id,
      stocked_quantity: 1000,
    }))

  if (levelsToCreate.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: levelsToCreate },
    })
    logger.info(`Created ${levelsToCreate.length} inventory levels`)
  }

  // --- B2B: emprendedores + wholesale price list ---
  const { data: groups } = await query.graph({
    entity: "customer_group",
    fields: ["id", "name"],
  })
  let emprendedores = (
    groups as { id: string; name?: string }[]
  ).find((g) => g.name?.toLowerCase() === "emprendedores")

  if (!emprendedores) {
    const { result } = await createCustomerGroupsWorkflow(container).run({
      input: {
        customersData: [{ name: "emprendedores" }],
      },
    })
    emprendedores = result[0]
    logger.info(`Created customer group emprendedores (${emprendedores.id})`)
  } else {
    logger.info(`Using customer group emprendedores (${emprendedores.id})`)
  }

  const { data: priceLists } = await query.graph({
    entity: "price_list",
    fields: ["id", "title"],
  })
  const hasWholesaleList = (
    priceLists as { title?: string }[]
  ).some((p) => p.title === "Wholesale emprendedores")

  // Collect all variant wholesale prices from catalog + DB
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "metadata"],
  })

  const wholesalePrices = (
    variants as {
      id: string
      sku?: string
      metadata?: Record<string, unknown>
    }[]
  )
    .map((v) => {
      const wholesale = v.metadata?.wholesale_price
      const amount =
        typeof wholesale === "number"
          ? wholesale
          : catalog.products
              .flatMap((p) => p.variants)
              .find((sv) => sv.sku === v.sku)?.metadata?.wholesale_price
      if (typeof amount !== "number") return null
      return {
        variant_id: v.id,
        amount,
        currency_code: "cop",
        min_quantity:
          typeof v.metadata?.min_qty === "number"
            ? (v.metadata.min_qty as number)
            : undefined,
      }
    })
    .filter(Boolean) as {
    variant_id: string
    amount: number
    currency_code: string
    min_quantity?: number
  }[]

  if (!hasWholesaleList && wholesalePrices.length) {
    await createPriceListsWorkflow(container).run({
      input: {
        price_lists_data: [
          {
            title: "Wholesale emprendedores",
            description: "Default ~20% off retail for B2B customer group",
            status: "active",
            type: "override",
            rules: {
              "customer.groups.id": [emprendedores.id],
            },
            prices: wholesalePrices,
          },
        ],
      },
    })
    logger.info(
      `Created wholesale price list with ${wholesalePrices.length} prices`
    )
  } else {
    logger.info("Wholesale price list already exists or no wholesale prices")
  }

  const token = (publishableKey as { token?: string }).token || ""
  const outPath = resolve(process.cwd(), ".seed-output.json")
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        publishableApiKey: token,
        retailSalesChannelId: retailChannel.id,
        wholesaleSalesChannelId: wholesaleChannel.id,
        regionId: region.id,
        customerGroupId: emprendedores.id,
        productsCreated: productsToCreate.length,
        variantsWithWholesale: wholesalePrices.length,
      },
      null,
      2
    )
  )
  logger.info(`Wrote seed output to ${outPath}`)
  if (token) {
    logger.info(`PUBLISHABLE_KEY=${token}`)
  }
  logger.info("Perfumas seed completed")
}
