import { createHash, timingSafeEqual } from "crypto"

export type WompiEventPayload = {
  event?: string
  data?: {
    transaction?: {
      id?: string
      status?: string
      reference?: string
      amount_in_cents?: number
      customer_email?: string
      currency?: string
    }
  }
  signature?: {
    properties?: string[]
    checksum?: string
  }
  timestamp?: number
  environment?: string
  sent_at?: string
}

function readNestedValue(
  root: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, root)
}

export function getWompiEventsSecret() {
  return process.env.WOMPI_EVENTS_SECRET || ""
}

/**
 * Verify Wompi event checksum (X-Event-Checksum or signature.checksum).
 * @see https://docs.wompi.co/docs/colombia/eventos/
 */
export function verifyWompiEventSignature(
  event: WompiEventPayload,
  checksumHeader?: string | null
): { ok: true } | { ok: false; reason: string } {
  const secret = getWompiEventsSecret()
  if (!secret) {
    return { ok: false, reason: "Missing WOMPI_EVENTS_SECRET" }
  }

  const properties = event.signature?.properties
  const timestamp = event.timestamp
  const provided = (
    checksumHeader ||
    event.signature?.checksum ||
    ""
  ).toUpperCase()

  if (!properties?.length || timestamp == null || !provided) {
    return { ok: false, reason: "Event missing signature fields" }
  }

  const dataRoot = (event.data || {}) as Record<string, unknown>
  let concat = ""
  for (const prop of properties) {
    const value = readNestedValue(dataRoot, prop)
    if (value === undefined || value === null) {
      return { ok: false, reason: `Missing signature property: ${prop}` }
    }
    concat += String(value)
  }
  concat += String(timestamp)
  concat += secret

  const computed = createHash("sha256").update(concat).digest("hex").toUpperCase()
  const a = Buffer.from(computed, "utf8")
  const b = Buffer.from(provided, "utf8")
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "Invalid event checksum" }
  }
  return { ok: true }
}
