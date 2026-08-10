import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  getCustomerProviders,
  requireCustomerId,
} from "../../../../utils/customer-auth"

/**
 * GET /auth/customer/providers
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req.auth_context?.actor_id)
  const providers = await getCustomerProviders(req.scope, customerId)
  return res.status(200).json({
    google: providers.google,
    emailpass: providers.emailpass,
    email: providers.email,
  })
}
