/**
 * store/useBuilderStore.ts
 * Single source of truth for the builder wizard + cart. Swapped in for
 * `useReducer` per your request — same shape, but consumable from any
 * component tree without prop drilling, and easy to persist later with
 * Zustand's `persist` middleware if you want an in-progress build to
 * survive a refresh.
 */

import { create } from "zustand";
import { DEFAULT_BUILD_ALCOHOL, GIFT_WRAP_FEE } from "../lib/mock-data";
import { computeFragranceCost } from "../lib/filters";
import type { Bottle, BuilderStep, CartItem, FilterState, Fragrance, Gender, OlfactiveGroup } from "../lib/types";

interface BuilderStore {
  // --- wizard ---
  step: BuilderStep;
  setStep: (step: BuilderStep) => void;

  // --- filters ---
  filters: FilterState;
  setGender: (gender: Gender | null) => void;
  setGroup: (group: OlfactiveGroup | null) => void;
  setHouse: (house: string | null) => void;
  setSearch: (term: string) => void;

  // --- in-progress selection ---
  selectedFragrance: Fragrance | null;
  selectedBottle: Bottle | null;
  labelText: string;
  giftWrap: boolean;
  selectFragrance: (fragrance: Fragrance) => void;
  selectBottle: (bottle: Bottle) => void;
  setLabelText: (text: string) => void;
  toggleGiftWrap: () => void;
  resetSelection: () => void;

  // --- real-time price ---
  currentBuildTotal: () => number;

  // --- cart (mixed: full builds + standalone components) ---
  cart: CartItem[];
  addBuildToCart: () => void;
  addComponentToCart: (name: string, price: number, sourceId: string) => void;
  removeFromCart: (id: string) => void;
  cartTotal: () => number;
}

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  step: 1,
  setStep: (step) => set({ step }),

  filters: { gender: null, group: null, house: null, search: "" },
  setGender: (gender) => set((s) => ({ filters: { ...s.filters, gender, house: null } })),
  setGroup: (group) => set((s) => ({ filters: { ...s.filters, group: s.filters.group === group ? null : group } })),
  setHouse: (house) => set((s) => ({ filters: { ...s.filters, house: s.filters.house === house ? null : house } })),
  setSearch: (search) => set((s) => ({ filters: { ...s.filters, search } })),

  selectedFragrance: null,
  selectedBottle: null,
  labelText: "",
  giftWrap: false,

  selectFragrance: (fragrance) => set({ selectedFragrance: fragrance, selectedBottle: null, step: 3 }),
  selectBottle: (bottle) => set({ selectedBottle: bottle, step: 4 }),
  setLabelText: (labelText) => set({ labelText }),
  toggleGiftWrap: () => set((s) => ({ giftWrap: !s.giftWrap })),
  resetSelection: () => set({ selectedFragrance: null, selectedBottle: null, labelText: "", giftWrap: false, step: 1 }),

  currentBuildTotal: () => {
    const { selectedFragrance, selectedBottle, giftWrap } = get();
    if (!selectedFragrance || !selectedBottle) return 0;
    const fragranceCost = computeFragranceCost(selectedFragrance, selectedBottle);
    return fragranceCost + selectedBottle.price + DEFAULT_BUILD_ALCOHOL.price + (giftWrap ? GIFT_WRAP_FEE : 0);
  },

  cart: [],

  addBuildToCart: () => {
    const { selectedFragrance, selectedBottle, labelText, giftWrap, currentBuildTotal, cart } = get();
    if (!selectedFragrance || !selectedBottle) return;
    const item: CartItem = {
      id: `build-${Date.now()}`,
      type: "build",
      price: currentBuildTotal(),
      quantity: 1,
      fragrance: selectedFragrance,
      bottle: selectedBottle,
      labelText,
      giftWrap,
    };
    set({
      cart: [...cart, item],
      selectedFragrance: null,
      selectedBottle: null,
      labelText: "",
      giftWrap: false,
      step: 1,
    });
  },

  addComponentToCart: (name, price, sourceId) => {
    const item: CartItem = {
      id: `comp-${sourceId}-${Date.now()}`,
      type: "component",
      price,
      quantity: 1,
      componentName: name,
      componentSourceId: sourceId,
    };
    set((s) => ({ cart: [...s.cart, item] }));
  },

  removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((i) => i.id !== id) })),

  cartTotal: () => get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
