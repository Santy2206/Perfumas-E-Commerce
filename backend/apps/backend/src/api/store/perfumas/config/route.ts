import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/perfumas/config
 * Public storefront bootstrap: region + sales channel IDs when the
 * publishable key is linked to multiple channels.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  })
  const colombia =
    (regions as { id: string; name?: string; currency_code?: string }[]).find(
      (r) => r.currency_code?.toLowerCase() === "cop"
    ) || regions?.[0]

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const list = (channels || []) as { id: string; name?: string }[]
  const retail =
    list.find((c) => c.name?.toLowerCase() === "retail") ||
    list.find((c) => c.name?.toLowerCase().includes("default")) ||
    list[0]
  const wholesale =
    list.find((c) => c.name?.toLowerCase() === "wholesale") || null

  return res.status(200).json({
    region_id: colombia?.id ?? null,
    retail_sales_channel_id: retail?.id ?? null,
    wholesale_sales_channel_id: wholesale?.id ?? null,
  })
}
