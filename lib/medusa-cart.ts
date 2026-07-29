/**
 * Medusa Store cart helpers for the Perfumas storefront.
 * Falls back gracefully when Medusa is not configured or unreachable.
 */

import { isMedusaConfigured, medusa } from "./medusa";

export type MedusaCartSummary = {
  id: string;
  total: number;
  items: {
    id: string;
    variant_id?: string | null;
    quantity: number;
    unit_price: number;
    title?: string;
    metadata?: Record<string, unknown> | null;
  }[];
};

let cachedRegionId: string | null | undefined;
let cachedRetailChannelId: string | null | undefined;
let cachedWholesaleChannelId: string | null | undefined;

export async function getColombiaRegionId(): Promise<string | null> {
  if (cachedRegionId !== undefined) return cachedRegionId;
  if (!isMedusaConfigured()) {
    cachedRegionId = null;
    return null;
  }
  try {
    const { regions } = await medusa.store.region.list({ limit: 20 });
    const co =
      regions?.find((r) => r.currency_code?.toLowerCase() === "cop") ||
      regions?.find((r) => r.name?.toLowerCase() === "colombia") ||
      null;
    cachedRegionId = co?.id ?? null;
    return cachedRegionId;
  } catch {
    cachedRegionId = null;
    return null;
  }
}

/** Resolve retail / wholesale sales channel IDs (required when publishable key has multiple channels). */
async function resolveSalesChannelId(opts?: {
  wholesale?: boolean;
}): Promise<string | null> {
  const fromEnv = opts?.wholesale
    ? process.env.NEXT_PUBLIC_MEDUSA_WHOLESALE_CHANNEL_ID ||
      process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID
    : process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID;
  if (fromEnv) return fromEnv;

  if (opts?.wholesale && cachedWholesaleChannelId !== undefined) {
    return cachedWholesaleChannelId;
  }
  if (!opts?.wholesale && cachedRetailChannelId !== undefined) {
    return cachedRetailChannelId;
  }

  try {
    const base = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
    const pk = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
    if (!base) return null;
    const res = await fetch(`${base}/store/perfumas/config`, {
      headers: pk ? { "x-publishable-api-key": pk } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      retail_sales_channel_id?: string;
      wholesale_sales_channel_id?: string;
    };
    cachedRetailChannelId = data.retail_sales_channel_id ?? null;
    cachedWholesaleChannelId = data.wholesale_sales_channel_id ?? null;
    return opts?.wholesale ? cachedWholesaleChannelId : cachedRetailChannelId;
  } catch {
    return null;
  }
}

export function getSalesChannelId(opts?: { wholesale?: boolean }): string | null {
  // Sync env-only helper for callers that cannot await.
  if (opts?.wholesale) {
    return (
      process.env.NEXT_PUBLIC_MEDUSA_WHOLESALE_CHANNEL_ID ||
      process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID ||
      cachedWholesaleChannelId ||
      null
    );
  }
  return (
    process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID ||
    cachedRetailChannelId ||
    null
  );
}

function summarizeCart(cart: {
  id: string;
  total?: number | null;
  customer_id?: string | null;
  items?: {
    id: string;
    variant_id?: string | null;
    quantity?: number;
    unit_price?: number | null;
    title?: string;
    metadata?: Record<string, unknown> | null;
  }[] | null;
}): MedusaCartSummary {
  return {
    id: cart.id,
    total: cart.total ?? 0,
    items: (cart.items || []).map((item) => ({
      id: item.id,
      variant_id: item.variant_id,
      quantity: item.quantity ?? 0,
      unit_price: item.unit_price ?? 0,
      title: item.title,
      metadata: item.metadata,
    })),
  };
}

export async function ensureMedusaCart(
  existingId?: string | null,
  opts?: { customerId?: string | null; wholesale?: boolean }
): Promise<MedusaCartSummary | null> {
  if (!isMedusaConfigured()) return null;
  const regionId = await getColombiaRegionId();
  if (!regionId) return null;
  const salesChannelId = await resolveSalesChannelId({
    wholesale: opts?.wholesale,
  });

  try {
    if (existingId) {
      try {
        const { cart } = await medusa.store.cart.retrieve(existingId);
        if (cart?.id) {
          if (opts?.customerId && !cart.customer_id) {
            await medusa.store.cart.update(cart.id, {
              customer_id: opts.customerId,
            });
          }
          return summarizeCart(cart);
        }
      } catch {
        // expired / missing — create new
      }
    }
    const { cart } = await medusa.store.cart.create({
      region_id: regionId,
      ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
      ...(opts?.customerId ? { customer_id: opts.customerId } : {}),
    });
    return cart ? summarizeCart(cart) : null;
  } catch (error) {
    console.warn("[medusa-cart] ensureCart failed:", error);
    return null;
  }
}

export async function addVariantToMedusaCart(
  cartId: string,
  variantId: string,
  quantity: number,
  metadata?: Record<string, unknown>
): Promise<MedusaCartSummary | null> {
  if (!isMedusaConfigured()) return null;
  try {
    const { cart } = await medusa.store.cart.createLineItem(cartId, {
      variant_id: variantId,
      quantity,
      ...(metadata ? { metadata } : {}),
    });
    return cart ? summarizeCart(cart) : null;
  } catch (error) {
    console.warn("[medusa-cart] addVariant failed:", error);
    return null;
  }
}

export async function updateMedusaLineQuantity(
  cartId: string,
  lineId: string,
  quantity: number
): Promise<MedusaCartSummary | null> {
  if (!isMedusaConfigured()) return null;
  try {
    if (quantity < 1) {
      return removeMedusaLine(cartId, lineId);
    }
    const { cart } = await medusa.store.cart.updateLineItem(cartId, lineId, {
      quantity,
    });
    return cart ? summarizeCart(cart) : null;
  } catch (error) {
    console.warn("[medusa-cart] updateLine failed:", error);
    return null;
  }
}

export async function removeMedusaLine(
  cartId: string,
  lineId: string
): Promise<MedusaCartSummary | null> {
  if (!isMedusaConfigured()) return null;
  try {
    await medusa.store.cart.deleteLineItem(cartId, lineId);
    return retrieveMedusaCart(cartId);
  } catch (error) {
    console.warn("[medusa-cart] removeLine failed:", error);
    return null;
  }
}

export async function retrieveMedusaCart(
  cartId: string
): Promise<MedusaCartSummary | null> {
  if (!isMedusaConfigured()) return null;
  try {
    const { cart } = await medusa.store.cart.retrieve(cartId);
    return cart ? summarizeCart(cart) : null;
  } catch {
    return null;
  }
}

/** Map local shipping method ids to Medusa shipping option name fragments. */
export const SHIPPING_NAME_MAP: Record<string, string[]> = {
  "pickup-fontibon": ["fontibón", "fontibon"],
  "pickup-bonanza": ["bonanza"],
  "delivery-bogota": ["bogotá", "bogota"],
  "delivery-nacional": ["national", "nacional"],
};

export async function listShippingOptionsForCart(cartId: string) {
  if (!isMedusaConfigured()) return [];
  try {
    const { shipping_options } = await medusa.store.fulfillment.listCartOptions({
      cart_id: cartId,
    });
    return shipping_options || [];
  } catch {
    return [];
  }
}

export function matchShippingOptionId(
  options: { id: string; name?: string | null }[],
  localShippingId: string
): string | null {
  const needles = SHIPPING_NAME_MAP[localShippingId] || [localShippingId];
  const found = options.find((o) => {
    const name = (o.name || "").toLowerCase();
    return needles.some((n) => name.includes(n));
  });
  return found?.id ?? options[0]?.id ?? null;
}
