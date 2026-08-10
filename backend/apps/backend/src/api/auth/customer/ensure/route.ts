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
  email?: string
  first_name?: string
  last_name?: string
  picture?: string
}

function isValidEmail(value: string): boolean {
  return value.includes("@") && value.includes(".")
}

/**
 * POST /auth/customer/ensure
 * After Google OAuth callback: create a customer or link the auth identity
 * to an existing customer with the same email.
 *
 * Note: Google provider stores Google `sub` in entity_id; email lives in user_metadata.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId && !req.auth_context?.actor_id) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing auth identity on request"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const authModule = req.scope.resolve(Modules.AUTH)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const body = (req.body || {}) as Body

  const identityId = authIdentityId || undefined
  let providerMeta: Record<string, unknown> = {}

  if (identityId) {
    const { data: authIdentities } = await query.graph({
      entity: "auth_identity",
      fields: [
        "id",
        "app_metadata",
        "provider_identities.entity_id",
        "provider_identities.user_metadata",
      ],
      filters: { id: identityId },
    })

    const identity = (authIdentities || [])[0] as
      | {
          provider_identities?: {
            entity_id?: string | null
            user_metadata?: Record<string, unknown> | null
          }[] | null
        }
      | undefined

    providerMeta = identity?.provider_identities?.[0]?.user_metadata || {}
  }

  const email = String(body.email || providerMeta.email || "")
    .trim()
    .toLowerCase()

  if (!isValidEmail(email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Couldn't determine the identity's email from Google."
    )
  }

  const picture = String(body.picture || providerMeta.picture || "") || undefined
  const firstName =
    body.first_name ||
    String(providerMeta.given_name || providerMeta.first_name || "") ||
    undefined
  const lastName =
    body.last_name ||
    String(providerMeta.family_name || providerMeta.last_name || "") ||
    undefined

  const patchCustomerProfile = async (
    customerId: string,
    current?: {
      email?: string | null
      first_name?: string | null
      last_name?: string | null
      metadata?: Record<string, unknown> | null
    }
  ) => {
    const updates: Record<string, unknown> = {
      metadata: {
        ...(current?.metadata || {}),
        google_email: email,
        ...(picture
          ? { avatar_url: picture, google_picture: picture }
          : {}),
      },
    }
    if (!isValidEmail(String(current?.email || ""))) {
      updates.email = email
    }
    if (!current?.first_name && firstName) updates.first_name = firstName
    if (!current?.last_name && lastName) updates.last_name = lastName
    await customerModule.updateCustomers(customerId, updates)
  }

  // Already linked: repair bad email / metadata, then return
  if (req.auth_context?.actor_id) {
    const customerId = req.auth_context.actor_id
    try {
      const customers = await customerModule.listCustomers({ id: customerId })
      const current = customers[0]
      await patchCustomerProfile(customerId, current)
    } catch {
      /* best-effort repair */
    }
    return res.status(200).json({
      customer_id: customerId,
      mode: "existing",
    })
  }

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "last_name", "metadata"],
    filters: { email },
  })

  let existing = (customers || [])[0] as
    | {
        id: string
        email?: string | null
        first_name?: string | null
        last_name?: string | null
        metadata?: Record<string, unknown> | null
      }
    | undefined

  // Also find broken customers created with Google sub as email
  if (!existing && identityId) {
    const authIdentity = await authModule.retrieveAuthIdentity(identityId)
    const linkedId = String(authIdentity.app_metadata?.customer_id || "")
    if (linkedId) {
      const linked = await customerModule.listCustomers({ id: linkedId })
      existing = linked[0]
    }
  }

  if (existing?.id) {
    await authModule.updateAuthIdentities({
      id: identityId!,
      app_metadata: {
        customer_id: existing.id,
      },
    })
    await patchCustomerProfile(existing.id, existing)

    return res.status(200).json({
      customer_id: existing.id,
      mode: "linked",
    })
  }

  const { result } = await createCustomerAccountWorkflow(req.scope).run({
    input: {
      authIdentityId: identityId!,
      customerData: {
        email,
        first_name: firstName,
        last_name: lastName,
        metadata: {
          google_email: email,
          ...(picture
            ? { avatar_url: picture, google_picture: picture }
            : {}),
        },
      },
    },
  })

  return res.status(200).json({
    customer_id: result.id,
    mode: "created",
  })
}
