"use client";

import { useBuilderStore } from "../../store/useBuilderStore";

const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export function PriceSummary() {
  const cart = useBuilderStore((s) => s.cart);
  const removeFromCart = useBuilderStore((s) => s.removeFromCart);
  const cartTotal = useBuilderStore((s) => s.cartTotal);
  const resetSelection = useBuilderStore((s) => s.resetSelection);

  return (
    <div className="bg-white/5 border border-gold-400/20 rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-bone">Tu carrito</h3>
        <span className="text-xs text-bone-60">{cart.length} {cart.length === 1 ? "artículo" : "artículos"}</span>
      </div>

      {cart.length === 0 && <p className="text-sm text-bone-60">Aún no has agregado nada.</p>}

      <ul className="space-y-3 mb-4">
        {cart.map((item) => (
          <li key={item.id} className="flex justify-between items-start gap-3 text-sm border-t border-white/10 pt-3 first:border-0 first:pt-0">
            <div>
              {item.type === "build" ? (
                <>
                  <p className="font-medium text-bone">Fragancia personalizada</p>
                  <p className="text-xs text-bone-60">
                    {item.fragrance?.contratipo} + {item.bottle?.name}
                    {item.labelText ? ` · "${item.labelText}"` : ""}
                    {item.giftWrap ? " · regalo" : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-bone">{item.componentName}</p>
                  <p className="text-xs text-bone-60">Componente individual</p>
                </>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-bone">{formatCOP(item.price)}</p>
              <button onClick={() => removeFromCart(item.id)} className="text-xs text-bone-60 underline">
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-between pt-4 border-t border-gold-400/30 mb-4">
        <span className="font-display text-gold-400">Total</span>
        <span className="font-display text-gold-400">{formatCOP(cartTotal())}</span>
      </div>

      <button disabled={cart.length === 0} className="w-full bg-gold-400 disabled:opacity-40 hover:bg-gold-100 text-wine-950 text-sm font-semibold uppercase tracking-widest rounded-sm py-3 mb-2 transition-colors">
        Ir a pagar
      </button>
      <button onClick={resetSelection} className="w-full text-center text-sm text-bone-60 hover:text-gold-400 underline">
        + Crear otra fragancia
      </button>
    </div>
  );
}
