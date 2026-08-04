import { Modules } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type OrderRow = {
  id: string
  display_id?: string | number | null
  email?: string | null
  created_at?: string
  metadata?: Record<string, unknown> | null
  shipping_address?: {
    address_1?: string | null
    city?: string | null
    phone?: string | null
    province?: string | null
    postal_code?: string | null
  } | null
  items?: Array<{ title?: string | null; quantity?: number | null }>
}

/**
 * GET /admin/perfumas/shipping?hub=fontibon|bonanza&status=pending_dispatch
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hub = typeof req.query.hub === "string" ? req.query.hub : undefined
  const status =
    typeof req.query.status === "string" ? req.query.status : "pending_dispatch"

  const query = req.scope.resolve("query")
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "created_at",
      "metadata",
      "shipping_address.address_1",
      "shipping_address.city",
      "shipping_address.phone",
      "shipping_address.province",
      "shipping_address.postal_code",
      "items.title",
      "items.quantity",
    ],
    pagination: { take: 100, order: { created_at: "DESC" } },
  })

  const orders = ((data as unknown as OrderRow[]) || []).filter((o) => {
    const meta = o.metadata || {}
    const st = String(meta.shipping_status || "")
    const h = String(meta.shipping_hub || "")
    if (status && st !== status) return false
    if (hub && h !== hub) return false
    return Boolean(meta.shipping_hub || meta.shipping_status)
  })

  return res.status(200).json({
    ok: true,
    count: orders.length,
    orders: orders.map((o) => ({
      id: o.id,
      display_id: o.display_id,
      email: o.email,
      created_at: o.created_at,
      shipping_address: o.shipping_address,
      items: o.items,
      metadata: o.metadata,
    })),
  })
}

type PatchBody = {
  order_id?: string
  tracking_number?: string
  label_url?: string
  shipping_status?: string
}

/**
 * POST /admin/perfumas/shipping
 * Mark dispatched / paste tracking from ops.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as PatchBody
  if (!body.order_id) {
    return res.status(400).json({ ok: false, message: "order_id required" })
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

  const now = new Date().toISOString()
  const nextMetadata = {
    ...(order.metadata || {}),
    ...(body.tracking_number != null
      ? { tracking_number: body.tracking_number }
      : {}),
    ...(body.label_url != null ? { label_url: body.label_url } : {}),
    shipping_status: body.shipping_status || "dispatched",
    shipping_dispatched_at: now,
    shipping_updated_at: now,
  }

  const orderModule = req.scope.resolve(Modules.ORDER)
  await orderModule.updateOrders([{ id: order.id, metadata: nextMetadata }])

  return res.status(200).json({ ok: true, order_id: order.id, metadata: nextMetadata })
}
