import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createCustomerGroupsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * POST /store/perfumas/b2b/register
 * Creates a Medusa customer with B2B metadata. Admin assigns
 * "emprendedores" group after NIT review (or auto-link if group exists).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as {
    businessName?: string
    nit?: string
    phone?: string
    city?: string
    email?: string
    auto_approve?: boolean
  }

  if (!body?.businessName || !body?.nit || !body?.email) {
    return res
      .status(400)
      .json({ message: "businessName, nit and email are required" })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  try {
    const existing = await customerModule.listCustomers({
      email: body.email,
    })

    let customer = existing[0]
    if (!customer) {
      customer = await customerModule.createCustomers({
        email: body.email,
        company_name: body.businessName,
        phone: body.phone,
        metadata: {
          nit: body.nit,
          city: body.city,
          b2b_status: "pending",
          b2b_application_at: new Date().toISOString(),
          customer_group_target: "emprendedores",
        },
      })
    } else {
      await customerModule.updateCustomers(customer.id, {
        company_name: body.businessName,
        phone: body.phone,
        metadata: {
          ...(customer.metadata || {}),
          nit: body.nit,
          city: body.city,
          b2b_status: "pending",
          b2b_application_at: new Date().toISOString(),
          customer_group_target: "emprendedores",
        },
      })
    }

    const { data: groups } = await query.graph({
      entity: "customer_group",
      fields: ["id", "name"],
    })
    let group = (groups as { id: string; name?: string }[]).find(
      (g) => g.name?.toLowerCase() === "emprendedores"
    )

    if (!group) {
      const { result } = await createCustomerGroupsWorkflow(req.scope).run({
        input: { customersData: [{ name: "emprendedores" }] },
      })
      group = result[0]
    }

    // Do not auto-approve by default — Admin reviews NIT.
    // If auto_approve flag is sent (dev), add to group immediately.
    if (body.auto_approve && group) {
      await customerModule.addCustomerToGroup({
        customer_id: customer.id,
        customer_group_id: group.id,
      })
      await customerModule.updateCustomers(customer.id, {
        metadata: {
          ...(customer.metadata || {}),
          nit: body.nit,
          city: body.city,
          b2b_status: "approved",
        },
      })
    }

    logger.info(`B2B application for ${body.email} → customer ${customer.id}`)

    return res.status(201).json({
      ok: true,
      status: body.auto_approve ? "approved" : "pending",
      customer_id: customer.id,
      customer_group_target: "emprendedores",
      customer_group_id: group?.id,
      message: body.auto_approve
        ? "Customer created and assigned to emprendedores."
        : "Application received. Awaiting admin approval (assign emprendedores group).",
    })
  } catch (error) {
    logger.error(
      `b2b/register failed: ${error instanceof Error ? error.message : error}`
    )
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Registration failed",
    })
  }
}
