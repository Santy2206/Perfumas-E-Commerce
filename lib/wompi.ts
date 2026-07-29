/**
 * Wompi helpers for Colombia payments.
 * When keys are unset, checkout uses Medusa system/manual payment.
 */

export function isWompiConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY && process.env.WOMPI_PRIVATE_KEY
  );
}

export function getWompiPublicKey() {
  return process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || "";
}

/**
 * Build a Wompi Widget / Checkout reference payload.
 * Production: create a transaction via Wompi API with WOMPI_PRIVATE_KEY,
 * then confirm via /api/payments/wompi/webhook.
 */
export function buildWompiCheckoutReference(input: {
  orderId: string;
  amountInCents: number;
  customerEmail: string;
}) {
  return {
    provider: "wompi" as const,
    publicKey: getWompiPublicKey(),
    currency: "COP",
    amountInCents: input.amountInCents,
    reference: input.orderId,
    customerEmail: input.customerEmail,
    redirectUrl:
      process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/cuenta`
        : "http://localhost:3000/cuenta",
  };
}
