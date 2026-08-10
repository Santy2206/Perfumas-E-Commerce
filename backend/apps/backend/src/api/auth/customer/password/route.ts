import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  getCustomerProviders,
  isValidEmail,
  requireCustomerId,
  verifyEmailpassPassword,
} from "../../../../utils/customer-auth"

type Body = {
  password?: string
  current_password?: string
}

/**
 * POST /auth/customer/password
 * Create emailpass (Google-only) or update password (requires current_password).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req.auth_context?.actor_id)
  const password = String(req.body?.password || "")
  const currentPassword = String(req.body?.current_password || "")

  if (password.length < 8) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "La contraseña debe tener al menos 8 caracteres"
    )
  }

  const providers = await getCustomerProviders(req.scope, customerId)
  if (!isValidEmail(providers.email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Tu cuenta no tiene un correo válido. Repara el correo con Google o contacta soporte."
    )
  }

  const authModule = req.scope.resolve(Modules.AUTH)
  const email = providers.email

  if (providers.emailpass) {
    if (!currentPassword) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Debes indicar tu contraseña actual"
      )
    }
    const ok = await verifyEmailpassPassword(
      req.scope,
      email,
      currentPassword
    )
    if (!ok) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Contraseña actual incorrecta"
      )
    }

    const updated = await authModule.updateProvider("emailpass", {
      entity_id: email,
      password,
    })
    if (!updated?.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No pudimos actualizar la contraseña"
      )
    }
    return res.status(200).json({ ok: true, mode: "updated" })
  }

  // Create emailpass for Google-only accounts
  const registered = await authModule.register("emailpass", {
    body: {
      email,
      password,
    },
  })

  if (!registered?.success || !registered.authIdentity?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      registered?.error || "No pudimos crear la contraseña (¿el correo ya tiene password?)"
    )
  }

  await authModule.updateAuthIdentities({
    id: registered.authIdentity.id,
    app_metadata: {
      ...(registered.authIdentity.app_metadata || {}),
      customer_id: customerId,
    },
  })

  return res.status(200).json({ ok: true, mode: "created" })
}
