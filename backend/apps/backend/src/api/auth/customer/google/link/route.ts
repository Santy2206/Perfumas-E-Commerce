import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createHash, randomBytes } from "crypto"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  getCustomerProviders,
  isValidEmail,
  requireCustomerId,
} from "../../../../../utils/customer-auth"

type Body = {
  password?: string
  allow_email_mismatch?: boolean
}

/**
 * POST /auth/customer/google/link
 * Marks the current customer for Google linking; storefront then starts OAuth.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req.auth_context?.actor_id)
  const providers = await getCustomerProviders(req.scope, customerId)

  if (providers.google) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Google ya está vinculado a esta cuenta"
    )
  }
  if (!isValidEmail(providers.email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Tu cuenta no tiene un correo válido. Crea una contraseña con un correo, o contacta soporte."
    )
  }

  const token = randomBytes(24).toString("hex")
  const tokenHash = createHash("sha256").update(token).digest("hex")

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customers = await customerModule.listCustomers({ id: customerId })
  const current = customers[0]

  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...(current?.metadata || {}),
      google_link_token_hash: tokenHash,
      google_link_expires: Date.now() + 10 * 60 * 1000,
    },
  })

  return res.status(200).json({
    ok: true,
    link_token: token,
    customer_id: customerId,
    account_email: providers.email,
  })
}
