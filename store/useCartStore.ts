"use client";

/**
 * Unified cart store — builds + standard SKUs + B2B line items.
 * Persists to localStorage; syncs SKU lines to Medusa Store cart when configured.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BuildPayload } from "../lib/build-pricing";
import type { CatalogProduct } from "../lib/catalog-types";
import { isMedusaConfigured } from "../lib/medusa";
import {
  addVariantToMedusaCart,
  ensureMedusaCart,
  removeMedusaLine,
  updateMedusaLineQuantity,
} from "../lib/medusa-cart";

export type CartLine =
  | {
      id: string;
      kind: "build";
      title: string;
      price: number;
      quantity: number;
      build: BuildPayload & { metadata?: Record<string, unknown> };
      medusaLineId?: string;
    }
  | {
      id: string;
      kind: "sku";
      title: string;
      price: number;
      quantity: number;
      productId: string;
      handle: string;
      variantId?: string;
      isWholesale?: boolean;
      minQty?: number;
      medusaLineId?: string;
    };

type B2BProfile = {
  businessName: string;
  nit: string;
  phone: string;
  city: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  customerId?: string;
};

interface CartStore {
  lines: CartLine[];
  medusaCartId: string | null;
  setMedusaCartId: (id: string | null) => void;

  isB2B: boolean;
  b2bProfile: B2BProfile | null;
  setB2BSession: (profile: B2BProfile | null) => void;

  shippingMethodId: string | null;
  paymentProviderId: string | null;
  setShippingMethodId: (id: string | null) => void;
  setPaymentProviderId: (id: string | null) => void;

  addBuild: (
    line: Omit<Extract<CartLine, { kind: "build" }>, "id" | "kind" | "quantity"> & {
      quantity?: number;
      medusaLineId?: string;
    }
  ) => void;
  addSku: (
    product: CatalogProduct,
    quantity: number,
    opts?: { wholesale?: boolean }
  ) => { ok: true } | { ok: false; error: string };
  updateQty: (id: string, quantity: number) => { ok: true } | { ok: false; error: string };
  removeLine: (id: string) => void;
  clearCart: () => void;
  subtotal: () => number;
  itemCount: () => number;
}

async function syncEnsureCart(get: () => CartStore, set: (p: Partial<CartStore>) => void) {
  if (!isMedusaConfigured()) return null;
  const customerId = get().isB2B ? get().b2bProfile?.customerId : undefined;
  const cart = await ensureMedusaCart(get().medusaCartId, {
    customerId,
    wholesale: Boolean(get().isB2B),
  });
  if (cart?.id && cart.id !== get().medusaCartId) {
    set({ medusaCartId: cart.id });
  }
  return cart;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      lines: [],
      medusaCartId: null,
      setMedusaCartId: (medusaCartId) => set({ medusaCartId }),

      isB2B: false,
      b2bProfile: null,
      setB2BSession: (b2bProfile) =>
        set({
          b2bProfile,
          isB2B: Boolean(b2bProfile && b2bProfile.status === "approved"),
        }),

      shippingMethodId: null,
      paymentProviderId: null,
      setShippingMethodId: (shippingMethodId) => set({ shippingMethodId }),
      setPaymentProviderId: (paymentProviderId) => set({ paymentProviderId }),

      addBuild: (line) => {
        const item: CartLine = {
          id: `build-${Date.now()}`,
          kind: "build",
          title: line.title,
          price: line.price,
          quantity: line.quantity ?? 1,
          build: line.build,
          medusaLineId: line.medusaLineId,
        };
        set((s) => ({ lines: [...s.lines, item] }));
      },

      addSku: (product, quantity, opts) => {
        const wholesale = Boolean(opts?.wholesale);
        const minQty = product.minQty ?? 1;
        if (wholesale && quantity < minQty) {
          return {
            ok: false,
            error: `Cantidad mínima mayorista: ${minQty} unidades`,
          };
        }
        const price =
          wholesale && product.wholesalePrice != null ? product.wholesalePrice : product.price;
        const variantId =
          product.variantId ||
          (typeof product.metadata?.medusa_variant_id === "string"
            ? product.metadata.medusa_variant_id
            : undefined);

        const existing = get().lines.find(
          (l) =>
            l.kind === "sku" &&
            l.productId === product.id &&
            Boolean(l.isWholesale) === wholesale
        );

        if (existing && existing.kind === "sku") {
          const nextQty = existing.quantity + quantity;
          if (wholesale && nextQty < minQty) {
            return { ok: false, error: `Cantidad mínima mayorista: ${minQty} unidades` };
          }
          set((s) => ({
            lines: s.lines.map((l) =>
              l.id === existing.id && l.kind === "sku"
                ? { ...l, quantity: nextQty, variantId: variantId || l.variantId }
                : l
            ),
          }));

          void (async () => {
            const cart = await syncEnsureCart(get, set);
            if (!cart || !variantId) return;
            if (existing.medusaLineId) {
              await updateMedusaLineQuantity(cart.id, existing.medusaLineId, nextQty);
            } else {
              const updated = await addVariantToMedusaCart(cart.id, variantId, quantity, {
                wholesale,
                handle: product.handle,
              });
              const medusaLine = updated?.items.find((i) => i.variant_id === variantId);
              if (medusaLine) {
                set((s) => ({
                  lines: s.lines.map((l) =>
                    l.id === existing.id ? { ...l, medusaLineId: medusaLine.id } : l
                  ),
                }));
              }
            }
          })();

          return { ok: true };
        }

        const localId = `sku-${product.id}-${Date.now()}`;
        const item: CartLine = {
          id: localId,
          kind: "sku",
          title: product.title,
          price,
          quantity,
          productId: product.id,
          handle: product.handle,
          variantId,
          isWholesale: wholesale,
          minQty: product.minQty,
        };
        set((s) => ({ lines: [...s.lines, item] }));

        void (async () => {
          const cart = await syncEnsureCart(get, set);
          if (!cart || !variantId) return;
          const updated = await addVariantToMedusaCart(cart.id, variantId, quantity, {
            wholesale,
            handle: product.handle,
          });
          const medusaLine = updated?.items.find(
            (i) => i.variant_id === variantId && !get().lines.some((l) => l.medusaLineId === i.id)
          ) || updated?.items.find((i) => i.variant_id === variantId);
          if (medusaLine) {
            set((s) => ({
              lines: s.lines.map((l) =>
                l.id === localId ? { ...l, medusaLineId: medusaLine.id } : l
              ),
            }));
          }
        })();

        return { ok: true };
      },

      updateQty: (id, quantity) => {
        if (quantity < 1) {
          get().removeLine(id);
          return { ok: true };
        }
        const line = get().lines.find((l) => l.id === id);
        if (line?.kind === "sku" && line.isWholesale && line.minQty && quantity < line.minQty) {
          return { ok: false, error: `Cantidad mínima mayorista: ${line.minQty} unidades` };
        }
        set((s) => ({
          lines: s.lines.map((l) => (l.id === id ? { ...l, quantity } : l)),
        }));

        if (line?.medusaLineId && get().medusaCartId) {
          void updateMedusaLineQuantity(get().medusaCartId!, line.medusaLineId, quantity);
        }
        return { ok: true };
      },

      removeLine: (id) => {
        const line = get().lines.find((l) => l.id === id);
        set((s) => ({ lines: s.lines.filter((l) => l.id !== id) }));
        if (line?.medusaLineId && get().medusaCartId) {
          void removeMedusaLine(get().medusaCartId!, line.medusaLineId);
        }
      },

      clearCart: () =>
        set({
          lines: [],
          shippingMethodId: null,
          paymentProviderId: null,
          medusaCartId: null,
        }),
      subtotal: () => get().lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      itemCount: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    { name: "perfumas-cart-v1" }
  )
);
