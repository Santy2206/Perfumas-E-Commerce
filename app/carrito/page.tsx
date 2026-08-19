"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatCOP } from "../../lib/utils";
import { bulkDiscountPct } from "../../lib/bulk-discount";
import { Badge } from "../../components/ui/badge";
import { getProductById, SHIPPING_METHODS } from "../../lib/catalog";
import {
  getShippingQuote,
  shippingProgressMessage,
} from "../../lib/shipping/pricing";
import { useCartStore } from "../../store/useCartStore";
import { Button } from "../../components/ui/button";
import { GramsQuantityInput } from "../../components/shop/GramsQuantityInput";
import { FreeShippingNotice } from "../../components/shop/FreeShippingNotice";
import { preloadWompiScript } from "../../lib/wompi-client";
import { Section } from "../../components/layout/Section";

export default function CarritoPage() {
  useEffect(() => {
    void preloadWompiScript().catch(() => undefined);
  }, []);

  const lines = useCartStore((s) => s.lines);
  const removeLine = useCartStore((s) => s.removeLine);
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = useCartStore((s) => s.subtotal);
  const shippingMethodId = useCartStore((s) => s.shippingMethodId);
  const shippingMeta = SHIPPING_METHODS.find((m) => m.id === shippingMethodId);
  const quoteLines = lines.map((l) => ({
    kind: l.kind,
    productId: l.kind === "sku" ? l.productId : undefined,
    productKind: l.kind === "sku" ? l.productKind : undefined,
    amount: l.price * l.quantity,
    department:
      l.kind === "sku" ? getProductById(l.productId)?.department : undefined,
  }));
  const shippingQuote = shippingMethodId
    ? getShippingQuote({
        methodId: shippingMethodId,
        lines: quoteLines,
        subtotal: subtotal(),
      })
    : null;
  const total = subtotal() + (shippingQuote?.price ?? 0);
  const shippingHint = shippingQuote
    ? shippingProgressMessage(shippingQuote)
    : shippingProgressMessage(
        getShippingQuote({
          methodId: "delivery-bogota",
          lines: quoteLines,
          subtotal: subtotal(),
        })
      );

  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <header className="mb-8 border-b-2 border-gold-400/40 pb-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
            Perfumas
          </p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Tu carrito</h1>
          {lines.length > 0 ? (
            <p className="mt-2 text-sm text-ink-60">
              {lines.length} {lines.length === 1 ? "producto" : "productos"} en tu pedido
            </p>
          ) : null}
        </header>

        {lines.length > 0 ? (
          <FreeShippingNotice variant="general" className="mb-6" />
        ) : null}

        {lines.length === 0 ? (
          <div className="rounded-sm border-2 border-ink/10 bg-white px-6 py-16 text-center">
            <p className="mb-6 text-base text-ink">Aún no has agregado nada.</p>
            <Button asChild size="lg">
              <Link href="/tienda">Ir a la tienda</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="mb-8 space-y-3">
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
                const discountPct = isEssence ? bulkDiscountPct(line.quantity) : 0;

                return (
                  <li
                    key={line.id}
                    className="flex flex-col gap-4 rounded-sm border-2 border-ink/10 bg-white p-4 shadow-[0_2px_0_0_rgba(202,169,105,0.2)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg leading-snug text-ink">
                        {line.title}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-gold-400">
                        {line.kind === "build"
                          ? "Fragancia personalizada"
                          : isEssence
                            ? "Esencia (aceite)"
                            : line.isWholesale
                              ? "Insumo mayorista"
                              : "Producto"}
                      </p>
                      {isEssence ? (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                          <span>
                            {formatCOP(line.price)}
                            <span className="font-normal text-ink-60"> / gramo</span>
                            <span className="font-normal text-ink-60">
                              {" "}
                              · {line.quantity} g ·{" "}
                            </span>
                            <span className="text-gold-400">{formatCOP(lineTotal)}</span>
                          </span>
                          {discountPct > 0 && (
                            <Badge>-{Math.round(discountPct * 100)}% dcto.</Badge>
                          )}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-ink">
                          {formatCOP(line.price)}
                          {line.quantity > 1 ? (
                            <span className="font-normal text-ink-60">
                              {" "}
                              · total{" "}
                              <span className="font-semibold text-gold-400">
                                {formatCOP(lineTotal)}
                              </span>
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
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink">
                          <span>Cant.</span>
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
                            className="h-10 w-24 rounded-sm border-2 border-ink/20 bg-white px-2 text-ink focus:outline-none focus:ring-2 focus:ring-gold-400"
                          />
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="text-xs font-semibold uppercase tracking-widest text-ink-60 underline hover:text-gold-400"
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mb-6 overflow-hidden rounded-sm border-2 border-gold-400/40 bg-white">
              <div className="border-b border-gold-400/30 bg-ink px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">
                  Resumen
                </p>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-60">Subtotal</span>
                  <span className="font-semibold text-ink">{formatCOP(subtotal())}</span>
                </div>
                {shippingMeta && shippingQuote ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-60">{shippingMeta.name}</span>
                    <span className="font-semibold text-ink">
                      {shippingQuote.free
                        ? "Gratis"
                        : formatCOP(shippingQuote.price)}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-ink-60">
                    Elige el envío en el checkout. Domicilio Bogotá gratis desde
                    $100.000 y nacional desde $200.000 con perfumería
                    (hogar/accesorios ok; insumos solo si perfume &gt; insumos).
                  </p>
                )}
                {shippingHint ? (
                  <p className="text-xs text-ink-60">{shippingHint}</p>
                ) : null}
                <div className="flex justify-between border-t-2 border-gold-400/30 pt-3 font-display text-xl text-ink">
                  <span>Total</span>
                  <span className="text-gold-400">{formatCOP(total)}</span>
                </div>
              </div>
            </div>

            <Button asChild className="w-full" size="lg">
              <Link href="/checkout">Ir a pagar</Link>
            </Button>
          </>
        )}
      </div>
    </Section>
  );
}
