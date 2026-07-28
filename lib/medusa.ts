/**
 * Medusa JS SDK client for the Perfumas storefront.
 * Falls back to mock/catalog mode when NEXT_PUBLIC_MEDUSA_BACKEND_URL is unset
 * or the backend is unreachable.
 */

import Medusa from "@medusajs/js-sdk";

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

export const medusa = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY || undefined,
  debug: process.env.NODE_ENV === "development",
});

export const isMedusaConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL && process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY);

export { MEDUSA_BACKEND_URL };
