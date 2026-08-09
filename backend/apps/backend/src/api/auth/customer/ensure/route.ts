import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"

type Body = {
  first_name?: string
  last_name?: string
}

/**
 * POST /auth/customer/ensure
 * After Google OAuth callback: create a customer or link the auth identity
 * to an existing customer with the same email.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  if (req.auth_context?.actor_id) {
    return res.status(200).json({
      customer_id: req.auth_context.actor_id,
      mode: "existing",
    })
  }

  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing auth identity on request"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const authModule = req.scope.resolve(Modules.AUTH)
  const body = (req.body || {}) as Body

  const { data: authIdentities } = await query.graph({
    entity: "auth_identity",
    fields: ["id", "app_metadata", "provider_identities.entity_id"],
    filters: { id: authIdentityId },
  })

  const identity = (authIdentities || [])[0] as
    | {
        id: string
        app_metadata?: Record<string, unknown> | null
        provider_identities?: { entity_id?: string | null }[] | null
      }
    | undefined

  const email = String(identity?.provider_identities?.[0]?.entity_id || "")
    .trim()
    .toLowerCase()

  if (!email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Couldn't determine the identity's email from Google."
    )
  }

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { email },
  })

  const existing = (customers || [])[0] as { id: string } | undefined

  if (existing?.id) {
    const authIdentity = await authModule.retrieveAuthIdentity(authIdentityId)
    const appMetadata = {
      ...(authIdentity.app_metadata || {}),
      customer_id: existing.id,
    }
    await authModule.updateAuthIdentities({
      id: authIdentityId,
      app_metadata: appMetadata,
    })

    return res.status(200).json({
      customer_id: existing.id,
      mode: "linked",
    })
  }

  const { result } = await createCustomerAccountWorkflow(req.scope).run({
    input: {
      authIdentityId,
      customerData: {
        email,
        first_name: body.first_name || undefined,
        last_name: body.last_name || undefined,
      },
    },
  })

  return res.status(200).json({
    customer_id: result.id,
    mode: "created",
  })
}
