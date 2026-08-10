"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatCOP } from "../../lib/utils";
import { getProductById, SHIPPING_METHODS } from "../../lib/catalog";
import { useCartStore } from "../../store/useCartStore";
import { Button } from "../../components/ui/button";
import { GramsQuantityInput } from "../../components/shop/GramsQuantityInput";
import { preloadWompiScript } from "../../lib/wompi-client";

export default function CarritoPage() {
  useEffect(() => {
    void preloadWompiScript().catch(() => undefined);
  }, []);

  const lines = useCartStore((s) => s.lines);
  const removeLine = useCartStore((s) => s.removeLine);
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = useCartStore((s) => s.subtotal);
  const shippingMethodId = useCartStore((s) => s.shippingMethodId);
  const shipping = SHIPPING_METHODS.find((m) => m.id === shippingMethodId);
  const total = subtotal() + (shipping?.price ?? 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-8">Tu carrito</h1>

      {lines.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-bone-60 mb-6">Aún no has agregado nada.</p>
          <Button asChild>
            <Link href="/tienda">Ir a la tienda</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-4 mb-8">
            {lines.map((line) => {
              const catalog =
                line.kind === "sku" ? getProductById(line.productId) : null;
              const isEssence =
                line.kind === "sku" &&
                !line.isWholesale &&
                (line.productKind === "essence" ||
                  catalog?.metadata?.product_kind === "essence");
              const minQty =
                line.kind === "sku"
                  ? line.minQty ??
                    catalog?.minQty ??
                    (isEssence ? 30 : 1)
                  : 1;
              const lineTotal = line.price * line.quantity;

              return (
                <li
                  key={line.id}
                  className="flex flex-col gap-3 rounded-sm border border-gold-400/20 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-bone">{line.title}</p>
                    <p className="text-xs text-bone-60">
                      {line.kind === "build"
                        ? "Fragancia personalizada"
                        : isEssence
                          ? "Esencia (aceite)"
                          : line.isWholesale
                            ? "Insumo mayorista"
                            : "Producto"}
                    </p>
                    {isEssence ? (
                      <p className="mt-1 text-sm text-gold-400">
                        {formatCOP(line.price)} / gramo
                        <span className="text-bone-60">
                          {" "}
                          · {line.quantity} g · total {formatCOP(lineTotal)}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gold-400">
                        {formatCOP(line.price)}
                        {line.quantity > 1 ? (
                          <span className="text-bone-60">
                            {" "}
                            · total {formatCOP(lineTotal)}
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {isEssence ? (
                      <GramsQuantityInput
                        value={line.quantity}
                        min={minQty}
                        onChange={(qty) => {
                          const r = updateQty(line.id, qty);
                          if (!r.ok) alert(r.error);
                        }}
                      />
                    ) : (
                      <label className="flex items-center gap-2 text-xs text-bone-60">
                        <span className="uppercase tracking-widest">Cant.</span>
                        <input
                          type="number"
                          min={minQty}
                          step={1}
                          value={line.quantity}
                          onChange={(e) => {
                            const r = updateQty(
                              line.id,
                              Math.max(minQty, Number(e.target.value) || minQty)
                            );
                            if (!r.ok) alert(r.error);
                          }}
                          className="h-10 w-24 rounded-sm border border-gold-400/30 bg-white/5 px-2 text-bone"
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="text-xs text-bone-60 underline hover:text-gold-400"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-sm border border-gold-400/20 bg-white/5 p-5 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-bone-60">Subtotal</span>
              <span>{formatCOP(subtotal())}</span>
            </div>
            {shipping && (
              <div className="flex justify-between text-sm">
                <span className="text-bone-60">{shipping.name}</span>
                <span>{shipping.price === 0 ? "Gratis" : formatCOP(shipping.price)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gold-400/30 pt-3 font-display text-lg text-gold-400">
              <span>Total</span>
              <span>{formatCOP(total)}</span>
            </div>
          </div>

          <Button asChild className="w-full" size="lg">
            <Link href="/checkout">Ir a pagar</Link>
          </Button>
        </>
      )}
    </div>
  );
}
