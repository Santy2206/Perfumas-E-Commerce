import { createHash, randomBytes, randomInt } from "crypto"
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
  user_metadata?: Record<string, unknown> | null
}

export type AuthIdentityRow = {
  id: string
  app_metadata?: Record<string, unknown> | null
  provider_identities?: ProviderIdentityRow[] | null
}

export type CustomerLike = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  metadata?: Record<string, unknown> | null
}

/** Prefer Google user_metadata.email, then emailpass entity_id. */
export function emailFromProviderIdentities(
  identities: {
    provider?: string | null
    entity_id?: string | null
    user_metadata?: Record<string, unknown> | null
  }[]
): { email: string; meta: Record<string, unknown> } {
  let email = ""
  let meta: Record<string, unknown> = {}
  for (const pi of identities) {
    const um = (pi.user_metadata || {}) as Record<string, unknown>
    const fromMeta = String(um.email || "")
      .trim()
      .toLowerCase()
    if (isValidEmail(fromMeta)) {
      return { email: fromMeta, meta: um }
    }
    if (
      pi.provider === "emailpass" &&
      pi.entity_id &&
      isValidEmail(pi.entity_id)
    ) {
      email = pi.entity_id.toLowerCase()
      meta = um
    }
  }
  return { email, meta }
}

export function customerProfileScore(customer: CustomerLike): number {
  const meta = (customer.metadata || {}) as Record<string, unknown>
  let score = 0
  if (customer.phone) score += 3
  if (meta.profile_complete === true) score += 3
  if (meta.birthday) score += 2
  if (meta.cedula) score += 2
  if (Array.isArray(meta.likes) && meta.likes.length) score += 2
  if (Array.isArray(meta.lists) && meta.lists.length) score += 1
  if (customer.first_name) score += 1
  if (customer.last_name) score += 1
  if (isValidEmail(String(customer.email || ""))) score += 1
  return score
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
      "provider_identities.user_metadata",
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
  const allProviders: ProviderIdentityRow[] = []

  for (const identity of identities) {
    for (const pi of identity.provider_identities || []) {
      allProviders.push(pi)
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
  const fromProviders = emailFromProviderIdentities(allProviders).email
  const email = isValidEmail(rawEmail)
    ? rawEmail.toLowerCase()
    : isValidEmail(googleEmail)
      ? googleEmail.toLowerCase()
      : fromProviders

  return {
    google,
    emailpass,
    email,
    googleEntityIds,
    emailpassEntityIds,
    identities,
  }
}

export type EmailConflict = {
  customerId: string
  email: string
  hasEmailpass: boolean
  hasGoogle: boolean
}

/**
 * Detect when a Gmail already belongs to an email+password customer that
 * Google should not silently absorb.
 */
export async function detectEmailConflict(
  scope: MedusaContainer,
  email: string,
  options?: { excludeCustomerId?: string }
): Promise<EmailConflict | null> {
  if (!isValidEmail(email)) return null
  const customerModule = scope.resolve(Modules.CUSTOMER)
  const rows = await customerModule.listCustomers({
    email: email.trim().toLowerCase(),
  })
  const existing = (rows as CustomerLike[]).find(
    (c) => c.id !== options?.excludeCustomerId
  )
  if (!existing) return null

  const providers = await getCustomerProviders(scope, existing.id)
  if (!providers.emailpass) return null

  return {
    customerId: existing.id,
    email: providers.email || email.trim().toLowerCase(),
    hasEmailpass: true,
    hasGoogle: providers.google,
  }
}

export async function issueAccountMergeToken(
  scope: MedusaContainer,
  customerId: string
): Promise<string> {
  const customerModule = scope.resolve(Modules.CUSTOMER)
  const customers = await customerModule.listCustomers({ id: customerId })
  const current = customers[0]
  if (!current) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
  }
  const token = randomBytes(24).toString("hex")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...(current.metadata || {}),
      account_merge_token_hash: tokenHash,
      account_merge_expires: Date.now() + 15 * 60 * 1000,
    },
  })
  return token
}

export async function verifyAccountMergeToken(
  scope: MedusaContainer,
  customerId: string,
  token: string
): Promise<boolean> {
  const customerModule = scope.resolve(Modules.CUSTOMER)
  const customers = await customerModule.listCustomers({ id: customerId })
  const current = customers[0]
  if (!current) return false
  const meta = (current.metadata || {}) as Record<string, unknown>
  const expected = String(meta.account_merge_token_hash || "")
  const expires = Number(meta.account_merge_expires || 0)
  if (!expected || !expires || Date.now() > expires) return false
  const hash = createHash("sha256").update(token.trim()).digest("hex")
  return hash === expected
}

export async function clearAccountMergeToken(
  scope: MedusaContainer,
  customerId: string
): Promise<void> {
  const customerModule = scope.resolve(Modules.CUSTOMER)
  const customers = await customerModule.listCustomers({ id: customerId })
  const current = customers[0]
  if (!current) return
  const meta = { ...(current.metadata || {}) } as Record<string, unknown>
  delete meta.account_merge_token_hash
  delete meta.account_merge_expires
  await customerModule.updateCustomers(customerId, { metadata: meta })
}

/**
 * When a Google account stored the numeric sub as customer.email, fixing the
 * email can collide with an older emailpass customer. Merge into the richer
 * profile and soft-delete the loser.
 */
export async function mergeCustomersByEmail(
  scope: MedusaContainer,
  input: {
    currentId: string
    email: string
    picture?: string
    firstName?: string
    lastName?: string
  }
): Promise<{ customerId: string; mode: "repaired" | "merged" }> {
  const customerModule = scope.resolve(Modules.CUSTOMER)
  const authModule = scope.resolve(Modules.AUTH)

  const currentRows = await customerModule.listCustomers({ id: input.currentId })
  const current = currentRows[0] as CustomerLike | undefined
  if (!current) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
  }

  const email = input.email.trim().toLowerCase()
  if (!isValidEmail(email)) {
    return { customerId: input.currentId, mode: "repaired" }
  }

  const conflicts = (
    await customerModule.listCustomers({ email })
  ).filter((c: CustomerLike) => c.id !== input.currentId) as CustomerLike[]

  let survivor = current
  let loser: CustomerLike | null = null

  if (conflicts.length) {
    const other = conflicts[0]
    if (customerProfileScore(other) > customerProfileScore(current)) {
      survivor = other
      loser = current
    } else {
      survivor = current
      loser = other
    }
  }

  const survivorMeta = {
    ...((loser?.metadata || {}) as Record<string, unknown>),
    ...((survivor.metadata || {}) as Record<string, unknown>),
  }
  // Prefer non-empty likes/lists from either side
  const survivorLikes = Array.isArray(survivorMeta.likes)
    ? survivorMeta.likes
    : []
  const loserLikes = Array.isArray(loser?.metadata?.likes)
    ? (loser!.metadata!.likes as unknown[])
    : []
  if (!survivorLikes.length && loserLikes.length) {
    survivorMeta.likes = loserLikes
  }
  const survivorLists = Array.isArray(survivorMeta.lists)
    ? survivorMeta.lists
    : []
  const loserLists = Array.isArray(loser?.metadata?.lists)
    ? (loser!.metadata!.lists as unknown[])
    : []
  if (!survivorLists.length && loserLists.length) {
    survivorMeta.lists = loserLists
  }

  const updates: Record<string, unknown> = {
    email,
    metadata: {
      ...survivorMeta,
      google_email: email,
      ...(input.picture
        ? { avatar_url: input.picture, google_picture: input.picture }
        : {}),
    },
  }
  if (!survivor.first_name && (input.firstName || loser?.first_name)) {
    updates.first_name = input.firstName || loser?.first_name
  }
  if (!survivor.last_name && (input.lastName || loser?.last_name)) {
    updates.last_name = input.lastName || loser?.last_name
  }
  if (!survivor.phone && loser?.phone) {
    updates.phone = loser.phone
  }

  // Free the email on the loser before assigning it to the survivor
  if (loser) {
    await customerModule.updateCustomers(loser.id, {
      email: `merged+${loser.id.toLowerCase()}@deleted.perfumas.local`,
    })
  }

  await customerModule.updateCustomers(survivor.id, updates)

  // Re-point every auth identity that pointed at either customer to survivor
  const idsToRemap = new Set([input.currentId, survivor.id])
  if (loser) idsToRemap.add(loser.id)

  for (const cid of idsToRemap) {
    const identities = await listCustomerAuthIdentities(scope, cid)
    for (const identity of identities) {
      await authModule.updateAuthIdentities({
        id: identity.id,
        app_metadata: {
          ...(identity.app_metadata || {}),
          customer_id: survivor.id,
        },
      })
    }
  }

  if (loser) {
    try {
      if (typeof customerModule.softDeleteCustomers === "function") {
        await customerModule.softDeleteCustomers([loser.id])
      } else if (typeof customerModule.deleteCustomers === "function") {
        await customerModule.deleteCustomers([loser.id])
      } else {
        await customerModule.updateCustomers(loser.id, {
          metadata: {
            ...((loser.metadata || {}) as Record<string, unknown>),
            merged_into: survivor.id,
            deleted_by_merge: true,
          },
        })
      }
    } catch {
      /* best-effort soft delete */
    }
  }

  return {
    customerId: survivor.id,
    mode: loser ? "merged" : "repaired",
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

export async function deleteCustomerAccount(
  scope: MedusaContainer,
  customerId: string
): Promise<void> {
  const customerModule = scope.resolve(Modules.CUSTOMER)
  const authModule = scope.resolve(Modules.AUTH)

  const identities = await listCustomerAuthIdentities(scope, customerId)
  for (const identity of identities) {
    const providerIds = (identity.provider_identities || [])
      .map((p) => p.id)
      .filter(Boolean)
    if (providerIds.length) {
      try {
        await authModule.deleteProviderIdentities(providerIds)
      } catch {
        /* best-effort */
      }
    }
    try {
      await authModule.updateAuthIdentities({
        id: identity.id,
        app_metadata: {
          ...(identity.app_metadata || {}),
          customer_id: "",
          deleted_customer_id: customerId,
        },
      })
    } catch {
      /* best-effort */
    }
    try {
      if (typeof authModule.deleteAuthIdentities === "function") {
        await authModule.deleteAuthIdentities([identity.id])
      }
    } catch {
      /* best-effort */
    }
  }

  const customers = await customerModule.listCustomers({ id: customerId })
  const current = customers[0]
  if (current) {
    await customerModule.updateCustomers(customerId, {
      email: `deleted+${customerId.toLowerCase()}@deleted.perfumas.local`,
      metadata: {
        ...((current.metadata || {}) as Record<string, unknown>),
        account_deleted_at: new Date().toISOString(),
      },
    })
  }

  try {
    if (typeof customerModule.softDeleteCustomers === "function") {
      await customerModule.softDeleteCustomers([customerId])
    } else if (typeof customerModule.deleteCustomers === "function") {
      await customerModule.deleteCustomers([customerId])
    }
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      error instanceof Error
        ? error.message
        : "No pudimos eliminar la cuenta"
    )
  }
}
