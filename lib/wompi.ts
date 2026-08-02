/**
 * Wompi helpers for Colombia payments.
 * When keys are unset, checkout uses Medusa system/manual payment.
 *
 * Secrets (Dashboard → Desarrolladores → Secretos para integración técnica):
 * - WOMPI_INTEGRITY_SECRET → firma del Widget (reference+amount+currency)
 * - WOMPI_EVENTS_SECRET → checksum de webhooks (distinct from integrity / private key)
 */

import { createHash, timingSafeEqual } from "crypto";

export function isWompiConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY && process.env.WOMPI_PRIVATE_KEY
  );
}

export function getWompiPublicKey() {
  return process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || "";
}

/** Events secret for webhook checksum (Dashboard → secreto de eventos). */
export function getWompiEventsSecret() {
  return process.env.WOMPI_EVENTS_SECRET || "";
}

/** COP pesos → Wompi amount_in_cents (e.g. $95.000 → 9500000) */
export function pesosToWompiCents(pesos: number) {
  return Math.round(pesos) * 100;
}

export function buildIntegritySignature(input: {
  reference: string;
  amountInCents: number;
  currency?: string;
}) {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secret) return null;
  const currency = input.currency || "COP";
  const raw = `${input.reference}${input.amountInCents}${currency}${secret}`;
  return createHash("sha256").update(raw).digest("hex");
}

export type WompiEventPayload = {
  event?: string;
  data?: {
    transaction?: {
      id?: string;
      status?: string;
      reference?: string;
      amount_in_cents?: number;
      customer_email?: string;
      currency?: string;
    };
  };
  signature?: {
    properties?: string[];
    checksum?: string;
  };
  timestamp?: number;
  environment?: string;
  sent_at?: string;
};

function readNestedValue(
  root: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, root);
}

/**
 * Verify Wompi event checksum (X-Event-Checksum or signature.checksum).
 * @see https://docs.wompi.co/docs/colombia/eventos/
 */
export function verifyWompiEventSignature(
  event: WompiEventPayload,
  checksumHeader?: string | null
): { ok: true } | { ok: false; reason: string } {
  const secret = getWompiEventsSecret();
  if (!secret) {
    return { ok: false, reason: "Missing WOMPI_EVENTS_SECRET" };
  }

  const properties = event.signature?.properties;
  const timestamp = event.timestamp;
  const provided = (
    checksumHeader ||
    event.signature?.checksum ||
    ""
  ).toUpperCase();

  if (!properties?.length || timestamp == null || !provided) {
    return { ok: false, reason: "Event missing signature fields" };
  }

  const dataRoot = (event.data || {}) as Record<string, unknown>;
  let concat = "";
  for (const prop of properties) {
    const value = readNestedValue(dataRoot, prop);
    if (value === undefined || value === null) {
      return { ok: false, reason: `Missing signature property: ${prop}` };
    }
    concat += String(value);
  }
  concat += String(timestamp);
  concat += secret;

  const computed = createHash("sha256").update(concat).digest("hex").toUpperCase();
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "Invalid event checksum" };
  }
  return { ok: true };
}

export type WompiCheckoutPayload = {
  provider: "wompi";
  publicKey: string;
  currency: "COP";
  amountInCents: number;
  reference: string;
  customerEmail: string;
  redirectUrl: string;
  integrity: string | null;
};

/**
 * Build a Wompi Widget payload (server-side).
 * Requires WOMPI_INTEGRITY_SECRET for the widget signature.
 */
export function buildWompiCheckoutReference(input: {
  orderId: string;
  /** Total in COP pesos (not cents) */
  amountPesos: number;
  customerEmail: string;
}): WompiCheckoutPayload {
  const amountInCents = pesosToWompiCents(input.amountPesos);
  const reference = input.orderId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return {
    provider: "wompi",
    publicKey: getWompiPublicKey(),
    currency: "COP",
    amountInCents,
    reference,
    customerEmail: input.customerEmail,
    redirectUrl: `${site}/checkout/resultado?ref=${encodeURIComponent(reference)}`,
    integrity: buildIntegritySignature({
      reference,
      amountInCents,
    }),
  };
}
