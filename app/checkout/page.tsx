"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PAYMENT_PROVIDERS, SHIPPING_METHODS } from "../../lib/catalog";
import { formatCOP } from "../../lib/utils";
import { useCartStore } from "../../store/useCartStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";

export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal);
  const shippingMethodId = useCartStore((s) => s.shippingMethodId);
  const paymentProviderId = useCartStore((s) => s.paymentProviderId);
  const setShippingMethodId = useCartStore((s) => s.setShippingMethodId);
  const setPaymentProviderId = useCartStore((s) => s.setPaymentProviderId);
  const clearCart = useCartStore((s) => s.clearCart);
  const isB2B = useCartStore((s) => s.isB2B);
  const b2bProfile = useCartStore((s) => s.b2bProfile);
  const medusaCartId = useCartStore((s) => s.medusaCartId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bogotá");
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shipping = SHIPPING_METHODS.find((m) => m.id === shippingMethodId);
  const total = subtotal() + (shipping?.price ?? 0);

  if (lines.length === 0 && !orderId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-bone-60 mb-6">Tu carrito está vacío.</p>
        <Button asChild>
          <Link href="/tienda">Ir a la tienda</Link>
        </Button>
      </div>
    );
  }

  if (orderId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Badge className="mb-4">Pedido confirmado</Badge>
        <h1 className="font-display text-3xl text-bone mb-4">¡Gracias por tu compra!</h1>
        <p className="text-bone-60 mb-2">Número de pedido</p>
        <p className="font-mono text-gold-400 mb-6">{orderId}</p>
        <p className="text-sm text-bone-60 mb-8">
          Te contactaremos al correo/WhatsApp para confirmar el pago
          {paymentProviderId === "transfer"
            ? " por transferencia"
            : paymentProviderId === "wompi"
              ? " (Wompi / sistema — revisa el pedido en Admin)"
              : ` vía ${paymentProviderId}`}.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/cuenta">Ver mi cuenta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const placeOrder = async () => {
    setError(null);
    if (!name || !email || !phone) {
      setError("Completa nombre, correo y teléfono.");
      return;
    }
    if (!shippingMethodId) {
      setError("Selecciona un método de envío o recogida.");
      return;
    }
    if (!paymentProviderId) {
      setError("Selecciona un método de pago.");
      return;
    }
    if (shippingMethodId.startsWith("delivery") && !address) {
      setError("Ingresa la dirección de entrega.");
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name, email, phone, address, city },
          shippingMethodId,
          paymentProviderId,
          isB2B,
          customerId: b2bProfile?.customerId ?? null,
          medusaCartId,
          lines: lines.map((l) => ({
            id: l.id,
            kind: l.kind,
            title: l.title,
            price: l.price,
            quantity: l.quantity,
            build: l.kind === "build" ? l.build : undefined,
            productId: l.kind === "sku" ? l.productId : undefined,
            variantId: l.kind === "sku" ? l.variantId : undefined,
            medusaLineId: l.medusaLineId,
            isWholesale: l.kind === "sku" ? l.isWholesale : undefined,
          })),
          subtotal: subtotal(),
          shippingPrice: shipping?.price ?? 0,
          total,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el pedido");
        return;
      }
      clearCart();
      setOrderId(data.orderId);
    } catch {
      setError("Error de red al crear el pedido");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-2">Checkout</h1>
      <p className="text-sm text-bone-60 mb-8">
        Colombia · COP
        {isB2B ? " · Cuenta mayorista" : ""}
      </p>

      <div className="space-y-8">
        <section className="rounded-sm border border-gold-400/20 bg-white/5 p-5 space-y-4">
          <h2 className="font-display text-lg text-bone">Datos de contacto</h2>
          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono / WhatsApp</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="address">Dirección (si es domicilio)</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="rounded-sm border border-gold-400/20 bg-white/5 p-5 space-y-3">
          <h2 className="font-display text-lg text-bone mb-2">Envío / recogida</h2>
          {SHIPPING_METHODS.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 ${
                shippingMethodId === m.id ? "border-gold-400 bg-gold-400/10" : "border-white/10"
              }`}
            >
              <input
                type="radio"
                name="shipping"
                checked={shippingMethodId === m.id}
                onChange={() => setShippingMethodId(m.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="text-sm text-bone">{m.name}</p>
                <p className="text-xs text-bone-60">{m.description}</p>
              </div>
              <span className="text-sm text-gold-400">{m.price === 0 ? "Gratis" : formatCOP(m.price)}</span>
            </label>
          ))}
        </section>

        <section className="rounded-sm border border-gold-400/20 bg-white/5 p-5 space-y-3">
          <h2 className="font-display text-lg text-bone mb-2">Pago</h2>
          <p className="text-xs text-bone-60 mb-3">
            Wompi / Mercado Pago se conectan en producción con claves de API. Por ahora puedes elegir el medio preferido.
          </p>
          {PAYMENT_PROVIDERS.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 ${
                paymentProviderId === p.id ? "border-gold-400 bg-gold-400/10" : "border-white/10"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentProviderId === p.id}
                onChange={() => setPaymentProviderId(p.id)}
                className="mt-1"
              />
              <div>
                <p className="text-sm text-bone">{p.name}</p>
                <p className="text-xs text-bone-60">{p.description}</p>
              </div>
            </label>
          ))}
        </section>

        <section className="rounded-sm border border-gold-400/20 bg-white/5 p-5">
          <div className="flex justify-between font-display text-lg text-gold-400 mb-4">
            <span>Total a pagar</span>
            <span>{formatCOP(total)}</span>
          </div>
          {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
          <Button className="w-full" size="lg" disabled={placing} onClick={placeOrder}>
            {placing ? "Procesando…" : "Confirmar pedido"}
          </Button>
          <button
            type="button"
            className="mt-3 w-full text-sm text-bone-60 underline"
            onClick={() => router.push("/carrito")}
          >
            Volver al carrito
          </button>
        </section>
      </div>
    </div>
  );
}
