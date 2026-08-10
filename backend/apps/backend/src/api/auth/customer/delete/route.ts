import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  deleteCustomerAccount,
  requireCustomerId,
} from "../../../../utils/customer-auth"

type Body = {
  confirm?: string
}

/**
 * DELETE /auth/customer/delete
 * Permanently closes the logged-in customer account.
 * Requires an active session + typing ELIMINAR (no password: Google-only users
 * and merged accounts may not know an emailpass password).
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const customerId = requireCustomerId(req.auth_context?.actor_id)
  const confirm = String(req.body?.confirm || "")
    .trim()
    .toUpperCase()

  if (confirm !== "ELIMINAR") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Escribe ELIMINAR para confirmar"
    )
  }

  await deleteCustomerAccount(req.scope, customerId)
  return res.status(200).json({ ok: true })
}
