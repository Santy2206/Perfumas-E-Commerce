/**
 * store/useBuilderStore.ts
 * Wizard UI state for the custom perfume builder.
 * Cart persistence lives in useCartStore (unified retail + B2B + builds).
 */

import { create } from "zustand";
import { DEFAULT_BUILD_ALCOHOL, GIFT_WRAP_FEE } from "../lib/mock-data";
import { PHEROMONES } from "../lib/catalog";
import { computeFragranceCost } from "../lib/filters";
import type { Bottle, BuilderStep, FilterState, Fragrance, Gender, OlfactiveGroup } from "../lib/types";
import { useCartStore } from "./useCartStore";
import { getProductById } from "../lib/catalog";

interface BuilderStore {
  step: BuilderStep;
  setStep: (step: BuilderStep) => void;

  filters: FilterState;
  setGender: (gender: Gender | null) => void;
  setGroup: (group: OlfactiveGroup | null) => void;
  setHouse: (house: string | null) => void;
  setSearch: (term: string) => void;

  selectedFragrance: Fragrance | null;
  selectedBottle: Bottle | null;
  selectedPheromoneIds: string[];
  labelText: string;
  giftWrap: boolean;
  selectFragrance: (fragrance: Fragrance) => void;
  selectBottle: (bottle: Bottle) => void;
  togglePheromone: (id: string) => void;
  setLabelText: (text: string) => void;
  toggleGiftWrap: () => void;
  resetSelection: () => void;

  currentBuildTotal: () => number;

  /** Adds the in-progress build to the unified cart (server-priced). */
  addBuildToCart: () => Promise<{ ok: true } | { ok: false; error: string }>;
  addComponentToCart: (name: string, price: number, sourceId: string) => void;
}

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  step: 1,
  setStep: (step) => set({ step }),

  filters: { gender: null, group: null, house: null, search: "" },
  setGender: (gender) => set((s) => ({ filters: { ...s.filters, gender, house: null } })),
  setGroup: (group) =>
    set((s) => ({ filters: { ...s.filters, group: s.filters.group === group ? null : group } })),
  setHouse: (house) =>
    set((s) => ({ filters: { ...s.filters, house: s.filters.house === house ? null : house } })),
  setSearch: (search) => set((s) => ({ filters: { ...s.filters, search } })),

  selectedFragrance: null,
  selectedBottle: null,
  selectedPheromoneIds: [],
  labelText: "",
  giftWrap: false,

  selectFragrance: (fragrance) =>
    set({ selectedFragrance: fragrance, selectedBottle: null, selectedPheromoneIds: [], step: 3 }),
  selectBottle: (bottle) => set({ selectedBottle: bottle, step: 4 }),
  togglePheromone: (id) =>
    set((s) => ({
      selectedPheromoneIds: s.selectedPheromoneIds.includes(id)
        ? s.selectedPheromoneIds.filter((x) => x !== id)
        : [...s.selectedPheromoneIds, id],
    })),
  setLabelText: (labelText) => set({ labelText }),
  toggleGiftWrap: () => set((s) => ({ giftWrap: !s.giftWrap })),
  resetSelection: () =>
    set({
      selectedFragrance: null,
      selectedBottle: null,
      selectedPheromoneIds: [],
      labelText: "",
      giftWrap: false,
      step: 1,
    }),

  currentBuildTotal: () => {
    const { selectedFragrance, selectedBottle, giftWrap, selectedPheromoneIds } = get();
    if (!selectedFragrance || !selectedBottle) return 0;
    const fragranceCost = computeFragranceCost(selectedFragrance, selectedBottle);
    const pheromonePrice = PHEROMONES.filter((p) => selectedPheromoneIds.includes(p.id)).reduce(
      (sum, p) => sum + p.price,
      0
    );
    return (
      fragranceCost +
      selectedBottle.price +
      DEFAULT_BUILD_ALCOHOL.price +
      pheromonePrice +
      (giftWrap ? GIFT_WRAP_FEE : 0)
    );
  },

  addBuildToCart: async () => {
    const { selectedFragrance, selectedBottle, labelText, giftWrap, selectedPheromoneIds, resetSelection } =
      get();
    if (!selectedFragrance || !selectedBottle) {
      return { ok: false, error: "Selección incompleta" };
    }

    const payload = {
      fragranceId: selectedFragrance.id,
      bottleId: selectedBottle.id,
      pheromoneIds: selectedPheromoneIds,
      labelText,
      giftWrap,
    };

    let total = get().currentBuildTotal();
    try {
      const res = await fetch("/api/builds/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        return { ok: false, error: data.error || "No se pudo validar el precio" };
      }
      total = data.total;
    } catch {
      // fall back to client total if API unreachable
    }

    useCartStore.getState().addBuild({
      title: `Fragancia: ${selectedFragrance.contratipo}`,
      price: total,
      build: payload,
    });

    // Sync custom build into Medusa cart when configured
    try {
      const cartState = useCartStore.getState();
      let cartId = cartState.medusaCartId;
      if (!cartId) {
        const { ensureMedusaCart } = await import("../lib/medusa-cart");
        const cart = await ensureMedusaCart(null);
        if (cart?.id) {
          cartId = cart.id;
          cartState.setMedusaCartId(cart.id);
        }
      }
      if (cartId && process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
        const resBuild = await fetch(
          `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/builds/add-to-cart`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
                ? {
                    "x-publishable-api-key":
                      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
                  }
                : {}),
            },
            body: JSON.stringify({
              ...payload,
              cart_id: cartId,
              serverPrice: total,
              title: `Fragancia: ${selectedFragrance.contratipo}`,
            }),
          }
        );
        if (resBuild.ok) {
          const data = await resBuild.json();
          const lineId = data.line_item?.id as string | undefined;
          if (lineId) {
            const lines = useCartStore.getState().lines;
            const last = [...lines].reverse().find((l) => l.kind === "build");
            if (last) {
              useCartStore.setState({
                lines: lines.map((l) =>
                  l.id === last.id ? { ...l, medusaLineId: lineId } : l
                ),
              });
            }
          }
        }
      }
    } catch {
      // local cart line is enough if Medusa unreachable
    }

    resetSelection();
    return { ok: true };
  },

  addComponentToCart: (name, price, sourceId) => {
    const product = getProductById(sourceId);
    if (product) {
      useCartStore.getState().addSku(product, 1);
      return;
    }
    useCartStore.getState().addSku(
      {
        id: sourceId,
        handle: sourceId,
        title: name,
        department: "accesorios",
        category: "cross-sell",
        price,
      },
      1
    );
  },
}));
