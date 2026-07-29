import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/perfumas/orders
 * Legacy echo endpoint — storefront now completes carts via JS SDK.
 * Kept for compatibility; prefers forwarding display metadata only.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const order = req.body as Record<string, unknown>

  if (!order?.id && !order?.order_id) {
    return res.status(400).json({
      message:
        "Prefer medusa.store.cart.complete from the storefront. Pass order.id if recording fulfillment notes.",
    })
  }

  return res.status(201).json({
    ok: true,
    message:
      "Use Store cart.complete for Admin-visible orders. This route only acknowledges payloads.",
    order_id: order.id || order.order_id,
    fulfillment: order.fulfillment ?? [],
  })
}
