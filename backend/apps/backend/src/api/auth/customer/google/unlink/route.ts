import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  getCustomerProviders,
  requireCustomerId,
} from "../../../../../utils/customer-auth"

/**
 * DELETE /auth/customer/google/unlink
 * Removes Google provider identities linked to this customer (requires emailpass).
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req.auth_context?.actor_id)
  const providers = await getCustomerProviders(req.scope, customerId)

  if (!providers.google) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Google no está vinculado"
    )
  }
  if (!providers.emailpass) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Crea una contraseña antes de desvincular Google"
    )
  }

  const authModule = req.scope.resolve(Modules.AUTH)

  for (const identity of providers.identities) {
    const googleProviders = (identity.provider_identities || []).filter(
      (p) => p.provider === "google"
    )
    if (!googleProviders.length) continue

    const onlyGoogle = (identity.provider_identities || []).every(
      (p) => p.provider === "google"
    )

    if (onlyGoogle) {
      // Detach auth identity from customer (keep emailpass identity intact)
      await authModule.updateAuthIdentities({
        id: identity.id,
        app_metadata: {
          ...(identity.app_metadata || {}),
          customer_id: "",
        },
      })
    } else {
      for (const pi of googleProviders) {
        if (!pi.id) continue
        try {
          await authModule.deleteProviderIdentities([pi.id])
        } catch {
          /* best-effort */
        }
      }
    }
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customers = await customerModule.listCustomers({ id: customerId })
  const current = customers[0]
  if (current) {
    const meta = { ...(current.metadata || {}) } as Record<string, unknown>
    delete meta.google_link_token_hash
    delete meta.google_link_expires
    await customerModule.updateCustomers(customerId, { metadata: meta })
  }

  return res.status(200).json({ ok: true })
}
