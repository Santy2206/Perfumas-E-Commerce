"use client";

import { useEffect } from "react";
import { useCustomerStore } from "../../store/useCustomerStore";
import { useFavoritesStore } from "../../store/useFavoritesStore";

/** Hydrates Medusa customer session (JWT) and favorites on app load. */
export function CustomerHydrator() {
  const hydrate = useCustomerStore((s) => s.hydrate);
  const customer = useCustomerStore((s) => s.customer);
  const hydrated = useCustomerStore((s) => s.hydrated);
  const hydrateFavorites = useFavoritesStore((s) => s.hydrate);
  const resetFavorites = useFavoritesStore((s) => s.reset);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (customer) {
      void hydrateFavorites();
    } else {
      resetFavorites();
    }
  }, [customer, hydrated, hydrateFavorites, resetFavorites]);

  return null;
}
