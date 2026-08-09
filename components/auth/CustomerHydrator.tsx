"use client";

import { useEffect } from "react";
import { useCustomerStore } from "../../store/useCustomerStore";

/** Hydrates Medusa customer session (JWT) on app load. */
export function CustomerHydrator() {
  const hydrate = useCustomerStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return null;
}
