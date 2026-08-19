"use client";

import { useState } from "react";
import type { CatalogProduct } from "../../lib/catalog-types";
import { formatCOP } from "../../lib/utils";
import { bulkDiscountPct, bulkDiscountedUnitPrice } from "../../lib/bulk-discount";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useCartStore } from "../../store/useCartStore";
import { GramsQuantityInput } from "./GramsQuantityInput";
import { BulkDiscountNotice } from "./BulkDiscountNotice";

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
  const isEssence =
    product.metadata?.product_kind === "essence" && !useWholesale;
  const minQty = product.minQty ?? (isEssence ? 30 : 1);
  const unitPrice =
    useWholesale && product.wholesalePrice != null
      ? product.wholesalePrice
      : product.price;

  const [qty, setQty] = useState(minQty);
  const [msg, setMsg] = useState<string | null>(null);

  const discountPct = isEssence ? bulkDiscountPct(qty) : 0;
  const discountedUnitPrice = isEssence
    ? bulkDiscountedUnitPrice(unitPrice, qty)
    : unitPrice;

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
      {isEssence && <BulkDiscountNotice />}
      {isEssence && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-gold-400">
          Total {formatCOP(discountedUnitPrice * qty)}
          {discountPct > 0 && (
            <>
              <span className="text-xs font-normal text-ink-60 line-through">
                {formatCOP(unitPrice * qty)}
              </span>
              <Badge>-{Math.round(discountPct * 100)}% dcto.</Badge>
            </>
          )}
        </p>
      )}
      {isEssence ? (
        <GramsQuantityInput
          value={qty}
          min={minQty}
          onChange={setQty}
          showMinHint
          inputClassName="h-11 w-20"
        />
      ) : (
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-widest text-gold-400">
            Cantidad
          </label>
          <input
            type="number"
            min={minQty}
            step={1}
            value={qty}
            onChange={(e) =>
              setQty(Math.max(minQty, Number(e.target.value) || minQty))
            }
            className="h-11 w-24 rounded-sm border border-gold-400/30 bg-paper px-3 text-ink"
          />
        </div>
      )}
      <Button onClick={onAdd}>Agregar al carrito</Button>
      {msg && <p className="text-sm text-ink-60">{msg}</p>}
    </div>
  );
}
