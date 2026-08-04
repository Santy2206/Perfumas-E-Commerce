import { Modules } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertInternalSecret } from "../../../../utils/internal-secret"

type Body = {
  order_id?: string
  metadata?: Record<string, unknown>
}

/**
 * POST /hooks/shipping/update
 * Merge shipping metadata onto an order (called from Vercel after Wompi capture).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const auth = assertInternalSecret(
    req.headers["x-perfumas-internal-secret"] as string | undefined
  )
  if (!auth.ok) {
    return res.status(401).json({ ok: false, message: auth.reason })
  }

  const body = (req.body || {}) as Body
  if (!body.order_id || !body.metadata) {
    return res.status(400).json({ ok: false, message: "order_id and metadata required" })
  }

  const query = req.scope.resolve("query")
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: body.order_id },
  })
  const order = (data as { id: string; metadata?: Record<string, unknown> | null }[])?.[0]
  if (!order) {
    return res.status(404).json({ ok: false, message: "Order not found" })
  }

  const orderModule = req.scope.resolve(Modules.ORDER)
  const nextMetadata = {
    ...(order.metadata || {}),
    ...body.metadata,
    shipping_updated_at: new Date().toISOString(),
  }

  await orderModule.updateOrders([
    {
      id: order.id,
      metadata: nextMetadata,
    },
  ])

  return res.status(200).json({ ok: true, order_id: order.id, metadata: nextMetadata })
}
