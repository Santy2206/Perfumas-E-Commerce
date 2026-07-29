/**
 * Wompi helpers for Colombia payments.
 * When keys are unset, checkout uses Medusa system/manual payment.
 */

import { createHash } from "crypto";

export function isWompiConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY && process.env.WOMPI_PRIVATE_KEY
  );
}

export function getWompiPublicKey() {
  return process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || "";
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
  return {
    provider: "wompi",
    publicKey: getWompiPublicKey(),
    currency: "COP",
    amountInCents,
    reference,
    customerEmail: input.customerEmail,
    redirectUrl: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/cuenta`
      : "http://localhost:3000/cuenta",
    integrity: buildIntegritySignature({
      reference,
      amountInCents,
    }),
  };
}
