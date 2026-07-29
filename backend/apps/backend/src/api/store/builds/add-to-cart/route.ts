import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  addToCartWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

type BuildBody = {
  fragranceId: string
  bottleId: string
  pheromoneIds?: string[]
  labelText?: string
  giftWrap?: boolean
  alcoholId?: string
  cart_id?: string
  serverPrice?: number
  quantity?: number
  title?: string
  metadata?: Record<string, unknown>
}

const CUSTOM_BUILD_HANDLE = "custom-perfume-build"

async function ensureCustomBuildVariant(scope: MedusaRequest["scope"]) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku"],
    filters: { handle: CUSTOM_BUILD_HANDLE },
  })

  const existing = products?.[0] as
    | { id: string; variants?: { id: string }[] }
    | undefined
  if (existing?.variants?.[0]?.id) {
    return existing.variants[0].id
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfileId = shippingProfiles?.[0]?.id as string | undefined

  const { result } = await createProductsWorkflow(scope).run({
    input: {
      products: [
        {
          title: "Fragancia personalizada",
          handle: CUSTOM_BUILD_HANDLE,
          status: ProductStatus.PUBLISHED,
          description: "Build-to-order perfume (custom price)",
          shipping_profile_id: shippingProfileId,
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Custom build",
              sku: "custom-perfume-build",
              options: { Default: "Default" },
              prices: [{ amount: 0, currency_code: "cop" }],
              manage_inventory: false,
            },
          ],
          metadata: { product_kind: "custom_build" },
        },
      ],
    },
  })

  return result[0]?.variants?.[0]?.id as string
}

/**
 * POST /store/builds/add-to-cart
 * Adds a custom perfume build as a custom-priced cart line with pick-list metadata.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as BuildBody

  if (!body?.fragranceId || !body?.bottleId) {
    return res.status(400).json({
      message: "fragranceId and bottleId are required",
    })
  }
  if (typeof body.serverPrice !== "number" || body.serverPrice < 0) {
    return res.status(400).json({ message: "serverPrice is required" })
  }
  if (!body.cart_id) {
    return res.status(400).json({ message: "cart_id is required" })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const cartModule = req.scope.resolve(Modules.CART)

  const metadata = {
    type: "custom_build",
    fragrance_id: body.fragranceId,
    bottle_id: body.bottleId,
    pheromone_ids: body.pheromoneIds ?? [],
    label_text: body.labelText ?? "",
    gift_wrap: Boolean(body.giftWrap),
    alcohol_id: body.alcoholId ?? "alcohol-default",
    build_components: {
      fragrance_id: body.fragranceId,
      bottle_id: body.bottleId,
      pheromone_ids: body.pheromoneIds ?? [],
      alcohol_id: body.alcoholId ?? "alcohol-default",
      gift_wrap: Boolean(body.giftWrap),
      label_text: body.labelText ?? "",
    },
    ...(body.metadata || {}),
  }

  try {
    const variantId = await ensureCustomBuildVariant(req.scope)

    await addToCartWorkflow(req.scope).run({
      input: {
        cart_id: body.cart_id,
        items: [
          {
            variant_id: variantId,
            quantity: body.quantity ?? 1,
            unit_price: body.serverPrice,
            metadata,
          },
        ],
      },
    })

    const cart = await cartModule.retrieveCart(body.cart_id, {
      relations: ["items"],
    })
    const line =
      cart.items
        ?.slice()
        .reverse()
        .find((i) => i.metadata?.type === "custom_build") || null

    return res.status(200).json({
      ok: true,
      cart_id: body.cart_id,
      line_item: line,
      cart,
    })
  } catch (error) {
    logger.error(
      `builds/add-to-cart failed: ${error instanceof Error ? error.message : error}`
    )
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to add build to cart",
    })
  }
}
