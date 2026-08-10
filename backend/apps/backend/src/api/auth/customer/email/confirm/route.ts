import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  getCustomerProviders,
  hashEmailChangeCode,
  isValidEmail,
  requireCustomerId,
} from "../../../../../utils/customer-auth"

type Body = {
  code?: string
}

/**
 * POST /auth/customer/email/confirm
 */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req.auth_context?.actor_id)
  const code = String(req.body?.code || "").trim()
  if (!code) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Código requerido")
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const authModule = req.scope.resolve(Modules.AUTH)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customers = await customerModule.listCustomers({ id: customerId })
  const current = customers[0]
  if (!current) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
  }

  const meta = (current.metadata || {}) as Record<string, unknown>
  const pending = String(meta.email_change_to || "").toLowerCase()
  const hash = String(meta.email_change_hash || "")
  const expires = Number(meta.email_change_expires || 0)

  if (!isValidEmail(pending) || !hash) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No hay un cambio de correo pendiente"
    )
  }
  if (!expires || Date.now() > expires) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "El código expiró. Solicita uno nuevo."
    )
  }
  if (hashEmailChangeCode(code) !== hash) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Código incorrecto"
    )
  }

  const conflict = await customerModule.listCustomers({ email: pending })
  if (conflict[0] && conflict[0].id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ese correo ya está en uso"
    )
  }

  const providers = await getCustomerProviders(req.scope, customerId)
  const oldEmail = providers.email

  const {
    email_change_to: _t,
    email_change_hash: _h,
    email_change_expires: _e,
    ...restMeta
  } = meta

  await customerModule.updateCustomers(customerId, {
    email: pending,
    metadata: {
      ...restMeta,
      google_email: pending,
    },
  })

  if (providers.emailpass && oldEmail) {
    try {
      const { data: providerRows } = await query.graph({
        entity: "provider_identity",
        fields: ["id", "entity_id", "provider", "auth_identity_id"],
        filters: {
          provider: "emailpass",
          entity_id: oldEmail,
        },
      })

      const row = (providerRows || [])[0] as { id?: string } | undefined
      if (row?.id) {
        await authModule.updateProviderIdentities({
          id: row.id,
          entity_id: pending,
        })
      }
    } catch {
      /* best-effort emailpass rename */
    }
  }

  return res.status(200).json({ ok: true, email: pending })
}
