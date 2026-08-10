"use client";

import { create } from "zustand";
import {
  getCustomer,
  logout as authLogout,
  type StoreCustomer,
} from "../lib/auth";

interface CustomerStore {
  customer: StoreCustomer | null;
  loading: boolean;
  hydrated: boolean;
  setCustomer: (customer: StoreCustomer | null) => void;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customer: null,
  loading: true,
  hydrated: false,

  setCustomer: (customer) => set({ customer, loading: false, hydrated: true }),

  hydrate: async () => {
    if (get().hydrated && get().customer) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    let customer = await getCustomer();
    // Repair Google accounts that stored numeric sub as email
    if (customer && !customer.email) {
      const { repairCustomerEmail } = await import("../lib/auth");
      customer = (await repairCustomerEmail()) || customer;
    }
    const { useCartStore } = await import("./useCartStore");
    useCartStore.getState().setLinkedCustomerId(customer?.id ?? null);
    set({ customer, loading: false, hydrated: true });
  },

  clear: async () => {
    await authLogout();
    const { useFavoritesStore } = await import("./useFavoritesStore");
    useFavoritesStore.getState().reset();
    set({ customer: null, loading: false, hydrated: true });
  },
}));
