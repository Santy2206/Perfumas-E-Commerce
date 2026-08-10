import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  getCustomerProviders,
  isValidEmail,
  makeEmailChangeCode,
  requireCustomerId,
  sendAccountEmail,
  verifyEmailpassPassword,
} from "../../../../../utils/customer-auth"

type Body = {
  new_email?: string
  password?: string
}

/**
 * POST /auth/customer/email/request
 */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req.auth_context?.actor_id)
  const newEmail = String(req.body?.new_email || "")
    .trim()
    .toLowerCase()
  const password = String(req.body?.password || "")

  if (!isValidEmail(newEmail)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Correo nuevo inválido"
    )
  }
  if (!password) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "La contraseña es obligatoria para cambiar el correo"
    )
  }

  const providers = await getCustomerProviders(req.scope, customerId)
  if (!providers.emailpass) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Primero crea una contraseña para poder cambiar el correo"
    )
  }
  if (!isValidEmail(providers.email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Tu correo actual no es válido; repara la cuenta primero"
    )
  }
  if (newEmail === providers.email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "El correo nuevo es igual al actual"
    )
  }

  const ok = await verifyEmailpassPassword(
    req.scope,
    providers.email,
    password
  )
  if (!ok) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Contraseña incorrecta"
    )
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const existing = await customerModule.listCustomers({ email: newEmail })
  if (existing[0] && existing[0].id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ese correo ya está en uso por otra cuenta"
    )
  }

  const { code, hash } = makeEmailChangeCode()
  const customers = await customerModule.listCustomers({ id: customerId })
  const current = customers[0]
  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...(current?.metadata || {}),
      email_change_to: newEmail,
      email_change_hash: hash,
      email_change_expires: Date.now() + 15 * 60 * 1000,
    },
  })

  const sent = await sendAccountEmail({
    to: newEmail,
    subject: "Confirma tu nuevo correo — Perfumas",
    html: `
      <div style="font-family:Georgia,serif;color:#230a0b;line-height:1.5">
        <h1 style="color:#5c1a1a">Confirma tu correo</h1>
        <p>Tu código de verificación es:</p>
        <p style="font-size:28px;letter-spacing:4px"><strong>${code}</strong></p>
        <p style="color:#666;font-size:13px">Caduca en 15 minutos. Si no pediste este cambio, ignora este mensaje.</p>
      </div>
    `,
    text: `Tu código Perfumas: ${code}`,
  })

  if (!sent.ok) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "No pudimos enviar el código al correo nuevo"
    )
  }

  return res.status(200).json({
    ok: true,
    // Local/dev without Resend: surface code so QA can complete the flow
    ...(sent.skipped ? { dev_code: code } : {}),
  })
}
