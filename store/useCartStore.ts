"use client";

/**
 * Unified cart store — builds + standard SKUs + B2B line items.
 * Persists to localStorage; syncs to Medusa when the backend is available.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BuildPayload } from "../lib/build-pricing";
import type { CatalogProduct } from "../lib/catalog-types";

export type CartLine =
  | {
      id: string;
      kind: "build";
      title: string;
      price: number;
      quantity: number;
      build: BuildPayload & { metadata?: Record<string, unknown> };
    }
  | {
      id: string;
      kind: "sku";
      title: string;
      price: number;
      quantity: number;
      productId: string;
      handle: string;
      isWholesale?: boolean;
      minQty?: number;
    };

type B2BProfile = {
  businessName: string;
  nit: string;
  phone: string;
  city: string;
  email: string;
  status: "pending" | "approved" | "rejected";
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

  addBuild: (line: Omit<Extract<CartLine, { kind: "build" }>, "id" | "kind" | "quantity"> & { quantity?: number }) => void;
  addSku: (product: CatalogProduct, quantity: number, opts?: { wholesale?: boolean }) => { ok: true } | { ok: false; error: string };
  updateQty: (id: string, quantity: number) => { ok: true } | { ok: false; error: string };
  removeLine: (id: string) => void;
  clearCart: () => void;
  subtotal: () => number;
  itemCount: () => number;
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
        const price = wholesale && product.wholesalePrice != null ? product.wholesalePrice : product.price;
        const existing = get().lines.find(
          (l) => l.kind === "sku" && l.productId === product.id && Boolean(l.isWholesale) === wholesale
        );
        if (existing) {
          const nextQty = existing.quantity + quantity;
          if (wholesale && nextQty < minQty) {
            return { ok: false, error: `Cantidad mínima mayorista: ${minQty} unidades` };
          }
          set((s) => ({
            lines: s.lines.map((l) => (l.id === existing.id ? { ...l, quantity: nextQty } : l)),
          }));
          return { ok: true };
        }
        const item: CartLine = {
          id: `sku-${product.id}-${Date.now()}`,
          kind: "sku",
          title: product.title,
          price,
          quantity,
          productId: product.id,
          handle: product.handle,
          isWholesale: wholesale,
          minQty: product.minQty,
        };
        set((s) => ({ lines: [...s.lines, item] }));
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
        return { ok: true };
      },

      removeLine: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      clearCart: () => set({ lines: [], shippingMethodId: null, paymentProviderId: null }),
      subtotal: () => get().lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      itemCount: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    { name: "perfumas-cart-v1" }
  )
);
