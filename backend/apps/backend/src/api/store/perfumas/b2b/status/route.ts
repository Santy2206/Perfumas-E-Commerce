import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/perfumas/b2b/status?customer_id=...
 * Approved = in group emprendedores OR metadata.b2b_status === approved.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId =
    typeof req.query.customer_id === "string" ? req.query.customer_id.trim() : ""

  if (!customerId) {
    return res.status(400).json({
      ok: false,
      approved: false,
      message: "customer_id required",
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "company_name",
        "phone",
        "metadata",
        "groups.id",
        "groups.name",
      ],
      filters: { id: customerId },
    })

    const customer = (
      data as Array<{
        id: string
        email?: string | null
        company_name?: string | null
        phone?: string | null
        metadata?: Record<string, unknown> | null
        groups?: Array<{ id: string; name?: string | null }>
      }>
    )?.[0]

    if (!customer) {
      return res.status(404).json({
        ok: false,
        approved: false,
        message: "Customer not found",
      })
    }

    const meta = customer.metadata || {}
    const metaStatus =
      typeof meta.b2b_status === "string" ? meta.b2b_status.toLowerCase() : ""

    const inGroup = Boolean(
      customer.groups?.some((g) => g.name?.toLowerCase() === "emprendedores")
    )
    const approved = inGroup || metaStatus === "approved"

    return res.status(200).json({
      ok: true,
      approved,
      status: approved
        ? "approved"
        : metaStatus === "pending"
          ? "pending"
          : metaStatus === "rejected"
            ? "rejected"
            : "none",
      customer_id: customer.id,
      email: customer.email,
      business_name: customer.company_name || null,
      nit: typeof meta.nit === "string" ? meta.nit : null,
      phone: customer.phone || null,
      city: typeof meta.city === "string" ? meta.city : null,
      in_emprendedores_group: inGroup,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      approved: false,
      message: error instanceof Error ? error.message : "Status check failed",
    })
  }
}
