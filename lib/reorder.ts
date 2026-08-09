/**
 * Re-add past order line items to the unified cart ("Volver a comprar").
 */

import type { BuildPayload } from "./build-pricing";
import type { CatalogProduct, Department } from "./catalog-types";
import { useCartStore } from "../store/useCartStore";
import { isMedusaConfigured, MEDUSA_BACKEND_URL } from "./medusa";

export type ReorderLine = {
  id?: string;
  title?: string | null;
  quantity?: number;
  unit_price?: number | null;
  product_id?: string | null;
  variant_id?: string | null;
  product?: {
    id?: string;
    handle?: string | null;
    title?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  variant?: {
    id?: string;
    product_id?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
};

export type ReorderResult =
  | { ok: true; kind: "sku" | "build" }
  | { ok: false; error: string };

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function isCustomBuild(meta: Record<string, unknown> | null | undefined): boolean {
  if (!meta) return false;
  return meta.type === "custom_build" || Boolean(meta.fragrance_id && meta.bottle_id);
}

function buildPayloadFromMetadata(meta: Record<string, unknown>): BuildPayload | null {
  const fragranceId = String(meta.fragrance_id || "");
  const bottleId = String(meta.bottle_id || "");
  if (!fragranceId || !bottleId) return null;
  return {
    fragranceId,
    bottleId,
    pheromoneIds: asStringArray(meta.pheromone_ids),
    labelText: meta.label_text != null ? String(meta.label_text) : undefined,
    giftWrap: Boolean(meta.gift_wrap),
    alcoholId: meta.alcohol_id != null ? String(meta.alcohol_id) : undefined,
  };
}

function departmentFromMetadata(
  meta: Record<string, unknown> | null | undefined
): Department {
  const raw = String(meta?.department || meta?.perfumas_department || "accesorios");
  if (
    raw === "perfumeria" ||
    raw === "insumos" ||
    raw === "hogar" ||
    raw === "accesorios"
  ) {
    return raw;
  }
  return "accesorios";
}

async function syncBuildToMedusa(
  cartId: string | null,
  build: BuildPayload,
  quantity: number,
  serverPrice: number
): Promise<string | undefined> {
  if (!isMedusaConfigured() || !cartId) return undefined;
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/builds/add-to-cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
          ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
          : {}),
      },
      body: JSON.stringify({
        cart_id: cartId,
        fragranceId: build.fragranceId,
        bottleId: build.bottleId,
        pheromoneIds: build.pheromoneIds,
        labelText: build.labelText,
        giftWrap: build.giftWrap,
        alcoholId: build.alcoholId,
        quantity,
        serverPrice,
      }),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { item?: { id?: string } };
    return data.item?.id;
  } catch {
    return undefined;
  }
}

export async function reorderLineItem(item: ReorderLine): Promise<ReorderResult> {
  const quantity = Math.max(1, item.quantity || 1);
  const title = item.title || item.product?.title || "Producto";
  const unitPrice = item.unit_price ?? 0;
  const meta = (item.metadata || {}) as Record<string, unknown>;

  if (isCustomBuild(meta)) {
    const build = buildPayloadFromMetadata(meta);
    if (!build) {
      return { ok: false, error: "No pudimos reconstruir esta fragancia personalizada." };
    }

    const { addBuild, medusaCartId, setMedusaCartId } = useCartStore.getState();
    let medusaLineId: string | undefined;
    if (isMedusaConfigured()) {
      // Ensure cart exists first via a no-op ensure through addBuild's sync path
      const { ensureMedusaCart } = await import("./medusa-cart");
      const cart = await ensureMedusaCart(medusaCartId, {
        customerId: useCartStore.getState().linkedCustomerId,
        wholesale: useCartStore.getState().isB2B,
      });
      if (cart?.id && cart.id !== medusaCartId) {
        setMedusaCartId(cart.id);
      }
      medusaLineId = await syncBuildToMedusa(
        cart?.id ?? medusaCartId,
        build,
        quantity,
        unitPrice
      );
    }

    addBuild({
      title,
      price: unitPrice,
      build,
      quantity,
      medusaLineId,
    });
    return { ok: true, kind: "build" };
  }

  const productId =
    item.product_id ||
    item.product?.id ||
    item.variant?.product_id ||
    item.variant_id ||
    "";
  const variantId = item.variant_id || item.variant?.id || undefined;
  const handle = item.product?.handle || productId || "producto";

  if (!productId && !variantId) {
    return { ok: false, error: "Este artículo no se puede volver a agregar." };
  }

  const productMeta = (item.product?.metadata || {}) as Record<string, unknown>;
  const product: CatalogProduct = {
    id: String(productId || variantId),
    handle: String(handle),
    title,
    department: departmentFromMetadata(productMeta),
    category: String(productMeta.category || "general"),
    price: unitPrice,
    variantId: variantId ? String(variantId) : undefined,
    metadata: {
      medusa_variant_id: variantId ? String(variantId) : undefined,
    },
  };

  const result = useCartStore.getState().addSku(product, quantity);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, kind: "sku" };
}
