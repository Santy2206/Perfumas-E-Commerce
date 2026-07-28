"use client";

import Link from "next/link";
import { useBuilderStore } from "../../store/useBuilderStore";
import { useCartStore } from "../../store/useCartStore";
import { formatCOP } from "../../lib/utils";

export function PriceSummary() {
  const lines = useCartStore((s) => s.lines);
  const removeLine = useCartStore((s) => s.removeLine);
  const subtotal = useCartStore((s) => s.subtotal);
  const resetSelection = useBuilderStore((s) => s.resetSelection);

  return (
    <div className="bg-white/5 border border-gold-400/20 rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-bone">Tu carrito</h3>
        <span className="text-xs text-bone-60">
          {lines.length} {lines.length === 1 ? "artículo" : "artículos"}
        </span>
      </div>

      {lines.length === 0 && <p className="text-sm text-bone-60">Aún no has agregado nada.</p>}

      <ul className="space-y-3 mb-4">
        {lines.map((item) => (
          <li
            key={item.id}
            className="flex justify-between items-start gap-3 text-sm border-t border-white/10 pt-3 first:border-0 first:pt-0"
          >
            <div>
              <p className="font-medium text-bone">{item.title}</p>
              <p className="text-xs text-bone-60">
                {item.kind === "build"
                  ? "Fragancia personalizada"
                  : item.isWholesale
                    ? "Mayorista"
                    : "Producto"}
                {item.quantity > 1 ? ` · x${item.quantity}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-bone">{formatCOP(item.price * item.quantity)}</p>
              <button onClick={() => removeLine(item.id)} className="text-xs text-bone-60 underline">
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-between pt-4 border-t border-gold-400/30 mb-4">
        <span className="font-display text-gold-400">Total</span>
        <span className="font-display text-gold-400">{formatCOP(subtotal())}</span>
      </div>

      <Link
        href="/checkout"
        className={`block w-full text-center bg-gold-400 hover:bg-gold-100 text-wine-950 text-sm font-semibold uppercase tracking-widest rounded-sm py-3 mb-2 transition-colors ${
          lines.length === 0 ? "pointer-events-none opacity-40" : ""
        }`}
      >
        Ir a pagar
      </Link>
      <button
        onClick={resetSelection}
        className="w-full text-center text-sm text-bone-60 hover:text-gold-400 underline"
      >
        + Crear otra fragancia
      </button>
    </div>
  );
}
