import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type BuildBody = {
  fragranceId: string
  bottleId: string
  pheromoneIds?: string[]
  labelText?: string
  giftWrap?: boolean
  alcoholId?: string
  cart_id?: string
  serverPrice?: number
  metadata?: Record<string, unknown>
}

/**
 * POST /store/builds/add-to-cart
 * Adds a custom perfume build as a line item with is_custom_price.
 * Price must be computed server-side (storefront sends recomputed total).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as BuildBody

  if (!body?.fragranceId || !body?.bottleId) {
    return res.status(400).json({
      message: "fragranceId and bottleId are required",
    })
  }

  // When Product Module catalog is seeded, resolve variants and call
  // addToCartWorkflow with unit_price = serverPrice and metadata.
  // Until then, acknowledge the build payload for the Next.js storefront.
  return res.status(200).json({
    ok: true,
    message: "Custom build accepted. Wire to addToCartWorkflow after catalog seed.",
    build: {
      fragrance_id: body.fragranceId,
      bottle_id: body.bottleId,
      pheromone_ids: body.pheromoneIds ?? [],
      label_text: body.labelText ?? "",
      gift_wrap: Boolean(body.giftWrap),
      unit_price: body.serverPrice,
      metadata: body.metadata ?? {
        type: "custom_build",
        ...body,
      },
    },
  })
}
