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
import {
  clearAccountMergeToken,
  detectEmailConflict,
  emailFromProviderIdentities,
  issueAccountMergeToken,
  isValidEmail,
  mergeCustomersByEmail,
  verifyAccountMergeToken,
  verifyEmailpassPassword,
} from "../../../../utils/customer-auth"

type Body = {
  email?: string
  first_name?: string
  last_name?: string
  picture?: string
  /** Opaque token from POST /auth/customer/google/link */
  link_token?: string
  link_customer_id?: string
  /** Opt-in merge when Google email already has emailpass */
  confirm_merge?: boolean
  merge_token?: string
  password?: string
}

/**
 * POST /auth/customer/ensure
 * After Google OAuth callback: create a customer or link the auth identity
 * to an existing customer with the same email.
 *
 * If the Gmail already has email+password, returns status "conflict" until
 * the user confirms with password + merge_token.
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
  let email = String(body.email || "")
    .trim()
    .toLowerCase()
  let hasGoogleProvider = false

  if (identityId) {
    const { data: authIdentities } = await query.graph({
      entity: "auth_identity",
      fields: [
        "id",
        "app_metadata",
        "provider_identities.provider",
        "provider_identities.entity_id",
        "provider_identities.user_metadata",
      ],
      filters: { id: identityId },
    })

    const identity = (authIdentities || [])[0] as
      | {
          provider_identities?: {
            provider?: string | null
            entity_id?: string | null
            user_metadata?: Record<string, unknown> | null
          }[] | null
        }
      | undefined

    const pis = identity?.provider_identities || []
    hasGoogleProvider = pis.some((p) => p.provider === "google")
    const fromProviders = emailFromProviderIdentities(pis)
    if (!isValidEmail(email) && fromProviders.email) {
      email = fromProviders.email
    }
    providerMeta = fromProviders.meta
  }

  const picture =
    String(body.picture || providerMeta.picture || "") || undefined
  const firstName =
    body.first_name ||
    String(providerMeta.given_name || providerMeta.first_name || "") ||
    undefined
  const lastName =
    body.last_name ||
    String(providerMeta.family_name || providerMeta.last_name || "") ||
    undefined

  const confirmMerge = Boolean(body.confirm_merge)
  const mergeToken = String(body.merge_token || "").trim()
  const password = String(body.password || "")

  const respondConflict = async (targetCustomerId: string, mail: string) => {
    const token = await issueAccountMergeToken(req.scope, targetCustomerId)
    return res.status(200).json({
      status: "conflict",
      code: "EMAIL_ALREADY_REGISTERED",
      email: mail,
      existing_providers: ["emailpass"],
      pending_providers: ["google"],
      merge_token: token,
      message:
        "Ya existe una cuenta con este correo y contraseña. Confirma tu contraseña para unirlas.",
    })
  }

  const finishLink = async (customerId: string, mode: string) => {
    if (identityId) {
      const authIdentity = await authModule.retrieveAuthIdentity(identityId)
      await authModule.updateAuthIdentities({
        id: identityId,
        app_metadata: {
          ...(authIdentity.app_metadata || {}),
          customer_id: customerId,
        },
      })
    }
    try {
      await clearAccountMergeToken(req.scope, customerId)
    } catch {
      /* ignore */
    }
    return res.status(200).json({
      status: "ok",
      customer_id: customerId,
      mode,
    })
  }

  // Confirmed merge: password + merge_token required
  if (confirmMerge) {
    if (!isValidEmail(email)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Correo inválido para fusionar"
      )
    }
    if (!mergeToken || !password) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Contraseña y token de fusión son obligatorios"
      )
    }

    const conflict = await detectEmailConflict(req.scope, email)
    if (!conflict) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No hay una cuenta de correo+contraseña para fusionar"
      )
    }
    const tokenOk = await verifyAccountMergeToken(
      req.scope,
      conflict.customerId,
      mergeToken
    )
    if (!tokenOk) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "El enlace de fusión expiró. Entra de nuevo con Google."
      )
    }
    const pwdOk = await verifyEmailpassPassword(
      req.scope,
      conflict.email,
      password
    )
    if (!pwdOk) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Contraseña incorrecta"
      )
    }

    let currentId = conflict.customerId
    if (identityId) {
      const authIdentity = await authModule.retrieveAuthIdentity(identityId)
      const linkedId = String(authIdentity.app_metadata?.customer_id || "")
      if (linkedId) currentId = linkedId
    } else if (req.auth_context?.actor_id) {
      currentId = req.auth_context.actor_id
    }

    const merged = await mergeCustomersByEmail(req.scope, {
      currentId,
      email: conflict.email,
      picture,
      firstName,
      lastName,
    })
    return finishLink(merged.customerId, "merged")
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

    const merged = await mergeCustomersByEmail(req.scope, {
      currentId: linkCustomerId,
      email,
      picture,
      firstName,
      lastName,
    })

    await customerModule.updateCustomers(merged.customerId, {
      metadata: {
        ...restMeta,
        google_email: email,
        ...(picture
          ? { avatar_url: picture, google_picture: picture }
          : {}),
      },
    })

    return finishLink(merged.customerId, "google_linked")
  }

  // Already linked: repair bad email; conflict if another emailpass owns the Gmail
  if (req.auth_context?.actor_id) {
    const customerId = req.auth_context.actor_id
    try {
      const customers = await customerModule.listCustomers({ id: customerId })
      const current = customers[0]
      const meta = (current?.metadata || {}) as Record<string, unknown>
      if (!isValidEmail(email) && typeof meta.google_email === "string") {
        email = meta.google_email.toLowerCase()
      }

      if (isValidEmail(email) && hasGoogleProvider) {
        const conflict = await detectEmailConflict(req.scope, email, {
          excludeCustomerId: customerId,
        })
        if (conflict) {
          return respondConflict(conflict.customerId, conflict.email)
        }

        const merged = await mergeCustomersByEmail(req.scope, {
          currentId: customerId,
          email,
          picture,
          firstName,
          lastName,
        })
        return finishLink(merged.customerId, merged.mode)
      }

      if (isValidEmail(email) && !hasGoogleProvider) {
        const merged = await mergeCustomersByEmail(req.scope, {
          currentId: customerId,
          email,
          picture,
          firstName,
          lastName,
        })
        return finishLink(merged.customerId, merged.mode)
      }
    } catch (error) {
      console.warn("[ensure] repair/merge failed:", error)
    }
    return res.status(200).json({
      status: "ok",
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
    fields: ["id", "email", "first_name", "last_name", "phone", "metadata"],
    filters: { email },
  })

  let existing = (customers || [])[0] as
    | {
        id: string
        email?: string | null
        first_name?: string | null
        last_name?: string | null
        phone?: string | null
        metadata?: Record<string, unknown> | null
      }
    | undefined

  let linkedBrokenId = ""
  if (identityId) {
    const authIdentity = await authModule.retrieveAuthIdentity(identityId)
    linkedBrokenId = String(authIdentity.app_metadata?.customer_id || "")
  }

  // Google login into an email that already has emailpass → ask to merge
  if (hasGoogleProvider) {
    const conflict = await detectEmailConflict(req.scope, email, {
      excludeCustomerId: linkedBrokenId || undefined,
    })
    if (conflict) {
      // Already linked to the emailpass customer → just repair
      if (linkedBrokenId && linkedBrokenId === conflict.customerId) {
        const merged = await mergeCustomersByEmail(req.scope, {
          currentId: conflict.customerId,
          email,
          picture,
          firstName,
          lastName,
        })
        return finishLink(merged.customerId, "linked")
      }
      return respondConflict(conflict.customerId, conflict.email)
    }
  }

  // Broken Google customer (sub as email) without emailpass conflict
  if (!existing && linkedBrokenId) {
    const linked = await customerModule.listCustomers({ id: linkedBrokenId })
    existing = linked[0]
  }

  if (existing?.id) {
    const merged = await mergeCustomersByEmail(req.scope, {
      currentId: existing.id,
      email,
      picture,
      firstName,
      lastName,
    })
    return finishLink(merged.customerId, "linked")
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
    status: "ok",
    customer_id: result.id,
    mode: "created",
  })
}
