import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertInternalSecret } from "../../../../utils/internal-secret"

type OrderRow = {
  id: string
  display_id?: string | number | null
  email?: string | null
  created_at?: string
  total?: number | null
  metadata?: Record<string, unknown> | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    city?: string | null
    phone?: string | null
    province?: string | null
    postal_code?: string | null
  } | null
  items?: Array<{ title?: string | null; quantity?: number | null }>
}

/**
 * GET /hooks/shipping/list?hub=&status=
 * Internal secret auth for the Next.js ops panel.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const auth = assertInternalSecret(
    req.headers["x-perfumas-internal-secret"] as string | undefined
  )
  if (!auth.ok) {
    return res.status(401).json({ ok: false, message: auth.reason })
  }

  const hub = typeof req.query.hub === "string" ? req.query.hub : undefined
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined
  const orderId =
    typeof req.query.order_id === "string" ? req.query.order_id : undefined
  const piboxId =
    typeof req.query.pibox_shipment_id === "string"
      ? req.query.pibox_shipment_id
      : undefined
  const piboxPackageId =
    typeof req.query.pibox_package_id === "string"
      ? req.query.pibox_package_id
      : undefined

  const query = req.scope.resolve("query")
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "created_at",
      "total",
      "metadata",
      "shipping_address.first_name",
      "shipping_address.last_name",
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
    if (orderId) return o.id === orderId
    if (piboxId) return String(meta.pibox_shipment_id || "") === piboxId
    if (piboxPackageId) {
      return String(meta.pibox_package_id || "") === piboxPackageId
    }
    if (!meta.shipping_hub && !meta.shipping_status) return false
    if (hub && String(meta.shipping_hub) !== hub) return false
    if (status && String(meta.shipping_status) !== status) return false
    return true
  })

  return res.status(200).json({ ok: true, count: orders.length, orders })
}
