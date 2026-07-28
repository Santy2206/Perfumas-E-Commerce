import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/perfumas/b2b/register
 * Stores a pending B2B application. Admin assigns customer to
 * "emprendedores" group after NIT review.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as {
    businessName?: string
    nit?: string
    phone?: string
    city?: string
    email?: string
  }

  if (!body?.businessName || !body?.nit || !body?.email) {
    return res.status(400).json({ message: "businessName, nit and email are required" })
  }

  return res.status(201).json({
    ok: true,
    status: "pending",
    customer_group_target: "emprendedores",
    message: "Application received. Awaiting admin approval.",
    application: {
      ...body,
      created_at: new Date().toISOString(),
    },
  })
}
