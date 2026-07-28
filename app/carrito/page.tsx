"use client";

import Link from "next/link";
import { formatCOP } from "../../lib/utils";
import { useCartStore } from "../../store/useCartStore";
import { Button } from "../../components/ui/button";
import { SHIPPING_METHODS } from "../../lib/catalog";

export default function CarritoPage() {
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
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-col gap-3 rounded-sm border border-gold-400/20 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-bone">{line.title}</p>
                  <p className="text-xs text-bone-60">
                    {line.kind === "build"
                      ? "Fragancia personalizada"
                      : line.isWholesale
                        ? "Insumo mayorista"
                        : "Producto"}
                  </p>
                  <p className="text-sm text-gold-400 mt-1">{formatCOP(line.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => {
                      const r = updateQty(line.id, Math.max(1, Number(e.target.value) || 1));
                      if (!r.ok) alert(r.error);
                    }}
                    className="h-10 w-20 rounded-sm border border-gold-400/30 bg-white/5 px-2 text-bone"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-xs text-bone-60 underline hover:text-gold-400"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
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
