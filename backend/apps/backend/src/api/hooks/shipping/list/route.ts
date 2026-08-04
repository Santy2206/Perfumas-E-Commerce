import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertInternalSecret } from "../../../../utils/internal-secret"

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
      "items.title",
      "items.quantity",
    ],
    pagination: { take: 100, order: { created_at: "DESC" } },
  })

  const orders = ((data as unknown as OrderRow[]) || []).filter((o) => {
    const meta = o.metadata || {}
    if (!meta.shipping_hub && !meta.shipping_status) return false
    if (hub && String(meta.shipping_hub) !== hub) return false
    if (status && String(meta.shipping_status) !== status) return false
    return true
  })

  return res.status(200).json({ ok: true, count: orders.length, orders })
}
