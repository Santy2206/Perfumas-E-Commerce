import { createHash, randomInt } from "crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

export function isValidEmail(value: string): boolean {
  return value.includes("@") && value.includes(".")
}

export type ProviderIdentityRow = {
  id: string
  provider?: string | null
  entity_id?: string | null
  auth_identity_id?: string | null
}

export type AuthIdentityRow = {
  id: string
  app_metadata?: Record<string, unknown> | null
  provider_identities?: ProviderIdentityRow[] | null
}

export async function listCustomerAuthIdentities(
  scope: MedusaContainer,
  customerId: string
): Promise<AuthIdentityRow[]> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "auth_identity",
    fields: [
      "id",
      "app_metadata",
      "provider_identities.id",
      "provider_identities.provider",
      "provider_identities.entity_id",
      "provider_identities.auth_identity_id",
    ],
  })

  return ((data || []) as AuthIdentityRow[]).filter((row) => {
    const meta = row.app_metadata || {}
    return String(meta.customer_id || "") === customerId
  })
}

export async function getCustomerProviders(
  scope: MedusaContainer,
  customerId: string
): Promise<{
  google: boolean
  emailpass: boolean
  email: string
  googleEntityIds: string[]
  emailpassEntityIds: string[]
  identities: AuthIdentityRow[]
}> {
  const customerModule = scope.resolve(Modules.CUSTOMER)
  const customers = await customerModule.listCustomers({ id: customerId })
  const customer = customers[0]
  if (!customer) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
  }

  const identities = await listCustomerAuthIdentities(scope, customerId)
  let google = false
  let emailpass = false
  const googleEntityIds: string[] = []
  const emailpassEntityIds: string[] = []

  for (const identity of identities) {
    for (const pi of identity.provider_identities || []) {
      if (pi.provider === "google") {
        google = true
        if (pi.entity_id) googleEntityIds.push(pi.entity_id)
      }
      if (pi.provider === "emailpass") {
        emailpass = true
        if (pi.entity_id) emailpassEntityIds.push(pi.entity_id)
      }
    }
  }

  const meta = (customer.metadata || {}) as Record<string, unknown>
  const rawEmail = String(customer.email || "")
  const googleEmail =
    typeof meta.google_email === "string" ? meta.google_email : ""
  const email = isValidEmail(rawEmail)
    ? rawEmail.toLowerCase()
    : isValidEmail(googleEmail)
      ? googleEmail.toLowerCase()
      : ""

  return {
    google,
    emailpass,
    email,
    googleEntityIds,
    emailpassEntityIds,
    identities,
  }
}

export function makeEmailChangeCode(): { code: string; hash: string } {
  const code = String(randomInt(100000, 999999))
  const hash = createHash("sha256").update(code).digest("hex")
  return { code, hash }
}

export function hashEmailChangeCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex")
}

export async function sendAccountEmail(input: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Perfumas <onboarding@resend.dev>"

  if (!apiKey) {
    console.info("[account-email] skipped (no RESEND_API_KEY):", input.subject)
    return { ok: true, skipped: true }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.warn("[account-email] Resend error:", res.status, body)
      return { ok: false, error: body }
    }
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "email failed"
    console.warn("[account-email]", message)
    return { ok: false, error: message }
  }
}

export async function verifyEmailpassPassword(
  scope: MedusaContainer,
  email: string,
  password: string
): Promise<boolean> {
  const authModule = scope.resolve(Modules.AUTH)
  try {
    const result = await authModule.authenticate("emailpass", {
      body: {
        email: email.trim().toLowerCase(),
        password,
      },
    })
    return Boolean(result?.success)
  } catch {
    return false
  }
}

export function requireCustomerId(actorId?: string | null): string {
  if (!actorId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Debes iniciar sesión"
    )
  }
  return actorId
}
