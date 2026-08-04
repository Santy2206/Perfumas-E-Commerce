export function getInternalHookSecret() {
  return (
    process.env.PERFUMAS_INTERNAL_SECRET ||
    process.env.WOMPI_EVENTS_SECRET ||
    ""
  )
}

export function assertInternalSecret(
  headerValue: string | string[] | undefined
): { ok: true } | { ok: false; reason: string } {
  const expected = getInternalHookSecret()
  if (!expected) {
    return { ok: false, reason: "Missing PERFUMAS_INTERNAL_SECRET" }
  }
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue
  if (!provided || provided !== expected) {
    return { ok: false, reason: "Invalid internal secret" }
  }
  return { ok: true }
}
