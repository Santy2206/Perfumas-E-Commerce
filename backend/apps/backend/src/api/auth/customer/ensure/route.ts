import { createHash } from "crypto"
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
import { isValidEmail } from "../../../../utils/customer-auth"

type Body = {
  email?: string
  first_name?: string
  last_name?: string
  picture?: string
  /** Opaque token from POST /auth/customer/google/link */
  link_token?: string
  link_customer_id?: string
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

  let email = String(body.email || providerMeta.email || "")
    .trim()
    .toLowerCase()

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
    },
    resolvedEmail?: string
  ) => {
    const mail = resolvedEmail || email
    if (!isValidEmail(mail)) return
    const updates: Record<string, unknown> = {
      metadata: {
        ...(current?.metadata || {}),
        google_email: mail,
        ...(picture
          ? { avatar_url: picture, google_picture: picture }
          : {}),
      },
    }
    if (!isValidEmail(String(current?.email || ""))) {
      updates.email = mail
    }
    if (!current?.first_name && firstName) updates.first_name = firstName
    if (!current?.last_name && lastName) updates.last_name = lastName
    await customerModule.updateCustomers(customerId, updates)
  }

  // Link Google OAuth identity to an existing logged-in customer (settings flow)
  const linkToken = String(body.link_token || "").trim()
  const linkCustomerId = String(body.link_customer_id || "").trim()
  if (linkToken && linkCustomerId && identityId) {
    const customers = await customerModule.listCustomers({ id: linkCustomerId })
    const target = customers[0]
    if (!target) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Cuenta a vincular no encontrada"
      )
    }
    const meta = (target.metadata || {}) as Record<string, unknown>
    const expectedHash = String(meta.google_link_token_hash || "")
    const expires = Number(meta.google_link_expires || 0)
    const tokenHash = createHash("sha256").update(linkToken).digest("hex")
    if (!expectedHash || tokenHash !== expectedHash) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Enlace de Google inválido o expirado"
      )
    }
    if (!expires || Date.now() > expires) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "El enlace de Google expiró. Intenta de nuevo."
      )
    }

    const accountEmail = isValidEmail(String(target.email || ""))
      ? String(target.email).toLowerCase()
      : typeof meta.google_email === "string"
        ? meta.google_email.toLowerCase()
        : ""

    if (!isValidEmail(email)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Google no devolvió un correo válido para vincular"
      )
    }
    if (accountEmail && accountEmail !== email) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `El Google (${email}) no coincide con el correo de la cuenta (${accountEmail}).`
      )
    }

    const authIdentity = await authModule.retrieveAuthIdentity(identityId)
    const alreadyLinked = String(authIdentity.app_metadata?.customer_id || "")
    if (alreadyLinked && alreadyLinked !== linkCustomerId) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Esa cuenta de Google ya está vinculada a otro perfil"
      )
    }

    await authModule.updateAuthIdentities({
      id: identityId,
      app_metadata: {
        ...(authIdentity.app_metadata || {}),
        customer_id: linkCustomerId,
      },
    })

    const {
      google_link_token_hash: _th,
      google_link_expires: _ex,
      ...restMeta
    } = meta
    await customerModule.updateCustomers(linkCustomerId, {
      metadata: {
        ...restMeta,
        google_email: email,
        ...(picture
          ? { avatar_url: picture, google_picture: picture }
          : {}),
      },
      ...(!isValidEmail(String(target.email || "")) ? { email } : {}),
    })

    return res.status(200).json({
      customer_id: linkCustomerId,
      mode: "google_linked",
    })
  }

  // Already linked: repair bad email / metadata, then return
  if (req.auth_context?.actor_id) {
    const customerId = req.auth_context.actor_id
    try {
      const customers = await customerModule.listCustomers({ id: customerId })
      const current = customers[0]
      const meta = (current?.metadata || {}) as Record<string, unknown>
      if (!isValidEmail(email) && typeof meta.google_email === "string") {
        email = meta.google_email.toLowerCase()
      }
      // Also try emailpass entity_id from auth identity
      if (!isValidEmail(email) && identityId) {
        const { data: authIdentities } = await query.graph({
          entity: "auth_identity",
          fields: ["provider_identities.provider", "provider_identities.entity_id"],
          filters: { id: identityId },
        })
        const pis =
          (
            (authIdentities || [])[0] as
              | {
                  provider_identities?: {
                    provider?: string
                    entity_id?: string
                  }[]
                }
              | undefined
          )?.provider_identities || []
        for (const pi of pis) {
          if (
            pi.provider === "emailpass" &&
            pi.entity_id &&
            isValidEmail(pi.entity_id)
          ) {
            email = pi.entity_id.toLowerCase()
            break
          }
        }
      }
      await patchCustomerProfile(customerId, current, email)
    } catch {
      /* best-effort repair */
    }
    return res.status(200).json({
      customer_id: customerId,
      mode: "existing",
    })
  }

  if (!isValidEmail(email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Couldn't determine the identity's email from Google."
    )
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
