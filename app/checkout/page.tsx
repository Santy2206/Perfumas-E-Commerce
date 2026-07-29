"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SHIPPING_METHODS } from "../../lib/catalog";
import { formatCOP } from "../../lib/utils";
import { openWompiWidget, preloadWompiScript } from "../../lib/wompi-client";
import { useCartStore } from "../../store/useCartStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";

const LAST_ORDER_KEY = "perfumas_last_order";
const DEFAULT_PAYMENT = "wompi";

type WompiPayload = {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  customerEmail: string;
  redirectUrl: string;
  integrity: string | null;
};

type CheckoutPayment = {
  mode: string;
  wompi?: WompiPayload;
  message?: string;
};

function rememberOrder(orderId: string) {
  try {
    sessionStorage.setItem(
      LAST_ORDER_KEY,
      JSON.stringify({
        orderId,
        paymentProviderId: DEFAULT_PAYMENT,
        createdAt: new Date().toISOString(),
      })
    );
  } catch {
    /* ignore */
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal);
  const shippingMethodId = useCartStore((s) => s.shippingMethodId);
  const setShippingMethodId = useCartStore((s) => s.setShippingMethodId);
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
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void preloadWompiScript().catch(() => undefined);
  }, []);

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
        <p className="text-sm text-bone-60 mb-4">
          Te contactaremos al correo/WhatsApp si necesitamos confirmar algo del pedido.
        </p>
        {paymentNote ? (
          <p className="text-sm text-gold-400 mb-8">{paymentNote}</p>
        ) : (
          <div className="mb-8" />
        )}
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
          paymentProviderId: DEFAULT_PAYMENT,
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
      const data = (await res.json()) as {
        error?: string;
        orderId?: string;
        payment?: CheckoutPayment;
        warning?: string;
      };
      if (!res.ok) {
        setError(data.error || "No se pudo crear el pedido");
        return;
      }

      const oid = data.orderId;
      if (!oid) {
        setError("Pedido sin número. Intenta de nuevo.");
        return;
      }

      rememberOrder(oid);

      const payment = data.payment;
      if (payment?.mode === "wompi_widget" && payment.wompi) {
        try {
          const tx = await openWompiWidget(payment.wompi);
          const approved = tx.status === "APPROVED";
          if (approved) clearCart();
          const q = new URLSearchParams({ ref: payment.wompi.reference || oid });
          if (tx.id) q.set("id", tx.id);
          if (!approved && tx.status) q.set("status", tx.status);
          router.replace(`/checkout/resultado?${q.toString()}`);
          return;
        } catch (e) {
          setError(
            e instanceof Error
              ? `No se completó el pago: ${e.message}. Tu carrito se mantiene.`
              : "No se completó el pago. Tu carrito se mantiene."
          );
          return;
        }
      }

      clearCart();
      if (payment?.mode === "wompi_needs_integrity") {
        setPaymentNote(
          payment.message ||
            "Pedido creado. Falta configurar el secreto de integridad de pagos en el servidor."
        );
      } else if (payment?.message) {
        setPaymentNote(payment.message);
      } else if (data.warning) {
        setPaymentNote(data.warning);
      }
      setOrderId(oid);
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
              <span className="text-sm text-gold-400">
                {m.price === 0 ? "Gratis" : formatCOP(m.price)}
              </span>
            </label>
          ))}
        </section>

        <section className="rounded-sm border border-gold-400/20 bg-white/5 p-5">
          <div className="flex justify-between text-sm text-bone-60 mb-1">
            <span>Subtotal</span>
            <span>{formatCOP(subtotal())}</span>
          </div>
          <div className="flex justify-between text-sm text-bone-60 mb-3">
            <span>Envío</span>
            <span>
              {shipping ? (shipping.price === 0 ? "Gratis" : formatCOP(shipping.price)) : "—"}
            </span>
          </div>
          <div className="flex justify-between font-display text-xl text-bone mb-4">
            <span>Total</span>
            <span className="text-gold-400">{formatCOP(total)}</span>
          </div>
          <p className="mb-6 text-xs leading-relaxed text-bone-60">
            Al confirmar se abre el pago seguro. Puedes pagar con{" "}
            <span className="text-bone">tarjeta débito o crédito</span>,{" "}
            <span className="text-bone">PSE</span>,{" "}
            <span className="text-bone">Nequi</span>,{" "}
            <span className="text-bone">Bancolombia</span> u otros medios disponibles.
          </p>
          {error ? <p className="text-sm text-red-400 mb-4">{error}</p> : null}
          <Button className="w-full" disabled={placing} onClick={placeOrder}>
            {placing ? "Procesando…" : "Confirmar pedido"}
          </Button>
        </section>
      </div>
    </div>
  );
}
