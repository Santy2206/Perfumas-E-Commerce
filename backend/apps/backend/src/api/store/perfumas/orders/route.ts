import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/perfumas/orders
 * Receives storefront checkout payloads (including custom build pick lists)
 * for fulfillment visibility until full Medusa cart→order flow is wired.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const order = req.body as Record<string, unknown>

  if (!order?.id) {
    return res.status(400).json({ message: "order.id is required" })
  }

  return res.status(201).json({
    ok: true,
    message: "Order recorded for fulfillment",
    order_id: order.id,
    fulfillment: order.fulfillment ?? [],
  })
}
