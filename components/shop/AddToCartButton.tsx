"use client";

import { useState } from "react";
import type { CatalogProduct } from "../../lib/catalog-types";
import { Button } from "../ui/button";
import { useCartStore } from "../../store/useCartStore";

export function AddToCartButton({
  product,
  wholesale = false,
}: {
  product: CatalogProduct;
  wholesale?: boolean;
}) {
  const addSku = useCartStore((s) => s.addSku);
  const isB2B = useCartStore((s) => s.isB2B);
  const useWholesale = wholesale || isB2B;
  const [qty, setQty] = useState(useWholesale ? product.minQty ?? 1 : 1);
  const [msg, setMsg] = useState<string | null>(null);

  const onAdd = () => {
    const result = addSku(product, qty, { wholesale: useWholesale });
    if (!result.ok) {
      setMsg(result.error);
      return;
    }
    setMsg("Agregado al carrito");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs uppercase tracking-widest text-gold-400">Cantidad</label>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="h-11 w-24 rounded-sm border border-gold-400/30 bg-white/5 px-3 text-bone"
        />
      </div>
      <Button onClick={onAdd}>Agregar al carrito</Button>
      {msg && <p className="text-sm text-bone-60">{msg}</p>}
    </div>
  );
}
