import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  generateJwtToken,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"

type Body = {
  id_token?: string
}

type GoogleTokenInfo = {
  aud?: string
  sub?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
  error?: string
  error_description?: string
}

/**
 * POST /auth/customer/google/id-token
 * Completes Google One Tap / GIS Sign-in using an ID token (no redirect).
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const idToken = req.body?.id_token
  if (!idToken) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "id_token is required")
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "GOOGLE_CLIENT_ID is not configured"
    )
  }

  const tokenRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  )
  const payload = (await tokenRes.json()) as GoogleTokenInfo
  if (!tokenRes.ok || payload.error || payload.aud !== clientId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      payload.error_description || "Invalid Google id_token"
    )
  }

  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true"
  if (!emailVerified || !payload.email || !payload.sub) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Google email is not verified"
    )
  }

  const email = payload.email.toLowerCase()
  const userMetadata = {
    name: payload.name,
    email,
    picture: payload.picture,
    given_name: payload.given_name,
    family_name: payload.family_name,
  }

  const authModule = req.scope.resolve(Modules.AUTH)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig?: { http?: { jwtSecret?: string; jwtExpiresIn?: string } }
  }

  const { data: providerRows } = await query.graph({
    entity: "provider_identity",
    fields: ["id", "entity_id", "provider", "auth_identity_id", "user_metadata"],
    filters: {
      entity_id: payload.sub,
      provider: "google",
    },
  })

  let authIdentityId = (providerRows?.[0] as { auth_identity_id?: string } | undefined)
    ?.auth_identity_id

  if (!authIdentityId) {
    const created = await authModule.createAuthIdentities({
      provider_identities: [
        {
          entity_id: payload.sub,
          provider: "google",
          user_metadata: userMetadata,
        },
      ],
    })
    const createdIdentity = Array.isArray(created) ? created[0] : created
    authIdentityId = createdIdentity.id
  } else {
    try {
      await authModule.updateProviderIdentities({
        id: (providerRows![0] as { id: string }).id,
        user_metadata: userMetadata,
      })
    } catch {
      /* best-effort metadata refresh */
    }
  }

  const authIdentity = await authModule.retrieveAuthIdentity(authIdentityId!, {
    relations: ["provider_identities"],
  })

  let customerId = String(authIdentity.app_metadata?.customer_id || "")

  if (!customerId) {
    const existingCustomers = await customerModule.listCustomers({ email })
    const existing = existingCustomers[0]

    if (existing) {
      customerId = existing.id
      await authModule.updateAuthIdentities({
        id: authIdentityId!,
        app_metadata: {
          ...(authIdentity.app_metadata || {}),
          customer_id: customerId,
        },
      })
      await customerModule.updateCustomers(customerId, {
        metadata: {
          ...(existing.metadata || {}),
          google_email: email,
          avatar_url: payload.picture || undefined,
          google_picture: payload.picture || undefined,
        },
        ...(!String(existing.email || "").includes("@") ? { email } : {}),
      })
    } else {
      const { result } = await createCustomerAccountWorkflow(req.scope).run({
        input: {
          authIdentityId: authIdentityId!,
          customerData: {
            email,
            first_name: payload.given_name || undefined,
            last_name: payload.family_name || undefined,
            metadata: {
              google_email: email,
              avatar_url: payload.picture || undefined,
              google_picture: payload.picture || undefined,
            },
          },
        },
      })
      customerId = result.id
    }
  } else {
    try {
      const linked = await customerModule.listCustomers({ id: customerId })
      const current = linked[0]
      const updates: Record<string, unknown> = {
        metadata: {
          ...(current?.metadata || {}),
          google_email: email,
          avatar_url: payload.picture || undefined,
          google_picture: payload.picture || undefined,
        },
      }
      if (!String(current?.email || "").includes("@")) {
        updates.email = email
      }
      if (!current?.first_name && payload.given_name) {
        updates.first_name = payload.given_name
      }
      if (!current?.last_name && payload.family_name) {
        updates.last_name = payload.family_name
      }
      await customerModule.updateCustomers(customerId, updates)
    } catch {
      /* ignore */
    }
  }

  const jwtSecret = config.projectConfig?.http?.jwtSecret || process.env.JWT_SECRET
  const expiresIn = config.projectConfig?.http?.jwtExpiresIn || "7d"
  if (!jwtSecret) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "JWT_SECRET is not configured"
    )
  }

  const refreshed = await authModule.retrieveAuthIdentity(authIdentityId!)
  const token = generateJwtToken(
    {
      actor_id: customerId,
      actor_type: "customer",
      auth_identity_id: authIdentityId,
      app_metadata: refreshed.app_metadata || { customer_id: customerId },
      user_metadata: userMetadata,
    },
    {
      secret: jwtSecret,
      expiresIn,
    }
  )

  return res.status(200).json({ token })
}
