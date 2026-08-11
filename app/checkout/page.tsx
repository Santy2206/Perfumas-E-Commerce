"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SHIPPING_METHODS, getProductById } from "../../lib/catalog";
import {
  getShippingQuote,
  shippingProgressMessage,
} from "../../lib/shipping/pricing";
import { BOGOTA_LOCALITIES } from "../../lib/shipping/hub-routing";
import { formatCOP } from "../../lib/utils";
import { openWompiWidget, preloadWompiScript } from "../../lib/wompi-client";
import { useCartStore } from "../../store/useCartStore";
import { useCustomerStore } from "../../store/useCustomerStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Section } from "../../components/layout/Section";

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
  const linkedCustomerId = useCartStore((s) => s.linkedCustomerId);
  const customer = useCustomerStore((s) => s.customer);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bogotá");
  const [locality, setLocality] = useState("");
  const [department, setDepartment] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placingStep, setPlacingStep] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void preloadWompiScript().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!customer) return;
    setEmail((prev) => prev || customer.email || "");
    const fullName = [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ");
    if (fullName) {
      setName((prev) => prev || fullName);
    }
    if (customer.phone) {
      setPhone((prev) => prev || customer.phone || "");
    }
  }, [customer]);

  useEffect(() => {
    if (shippingMethodId === "delivery-bogota") {
      setCity("Bogotá");
    }
  }, [shippingMethodId]);

  const shippingMeta = SHIPPING_METHODS.find((m) => m.id === shippingMethodId);
  const shippingQuote = shippingMethodId
    ? getShippingQuote({
        methodId: shippingMethodId,
        lines: lines.map((l) => ({
          kind: l.kind,
          productId: l.kind === "sku" ? l.productId : undefined,
          productKind: l.kind === "sku" ? l.productKind : undefined,
          amount: l.price * l.quantity,
          department:
            l.kind === "sku"
              ? getProductById(l.productId)?.department
              : undefined,
        })),
        subtotal: subtotal(),
      })
    : null;
  const shippingPrice = shippingQuote?.price ?? 0;
  const total = subtotal() + shippingPrice;
  const shippingHint = shippingQuote
    ? shippingProgressMessage(shippingQuote)
    : null;
  const needsAddress = Boolean(shippingMethodId?.startsWith("delivery"));
  const needsLocality = shippingMethodId === "delivery-bogota";
  const needsNationalCity = shippingMethodId === "delivery-nacional";

  if (lines.length === 0 && !orderId) {
    return (
      <Section tone="light" className="min-h-[50vh]">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="rounded-sm border-2 border-ink/10 bg-white px-6 py-12">
            <p className="mb-6 text-base text-ink">Tu carrito está vacío.</p>
            <Button asChild size="lg">
              <Link href="/tienda">Ir a la tienda</Link>
            </Button>
          </div>
        </div>
      </Section>
    );
  }

  if (orderId) {
    return (
      <Section tone="light" className="min-h-[50vh]">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="overflow-hidden rounded-sm border-2 border-gold-400/40 bg-white">
            <div className="border-b border-gold-400/30 bg-ink px-5 py-3">
              <Badge className="bg-gold-400 text-ink">Pedido confirmado</Badge>
            </div>
            <div className="px-6 py-10">
              <h1 className="mb-4 font-display text-3xl text-ink">¡Gracias por tu compra!</h1>
              <p className="mb-2 text-sm text-ink-60">Número de pedido</p>
              <p className="mb-6 font-mono text-base font-semibold text-gold-400">{orderId}</p>
              <p className="mb-4 text-sm text-ink-60">
                Te contactaremos al correo/WhatsApp si necesitamos confirmar algo del pedido.
              </p>
              {paymentNote ? (
                <p className="mb-8 text-sm text-gold-400">{paymentNote}</p>
              ) : (
                <div className="mb-8" />
              )}
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/cuenta">Ver mi cuenta</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/">Volver al inicio</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>
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
    if (needsAddress && !address) {
      setError("Ingresa la dirección de entrega.");
      return;
    }
    if (needsLocality && !locality) {
      setError("Selecciona la localidad de Bogotá.");
      return;
    }
    if (needsNationalCity && !city.trim()) {
      setError("Indica la ciudad de destino.");
      return;
    }
    if (needsNationalCity && !postalCode.trim()) {
      setError("Indica el código postal (requerido para envíos nacionales).");
      return;
    }

    setPlacing(true);
    setPlacingStep("Creando pedido…");
    try {
      const wompiReady = preloadWompiScript().catch(() => undefined);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name,
            email,
            phone,
            address,
            city: needsLocality ? "Bogotá" : city,
            locality: needsLocality ? locality : undefined,
            department: needsNationalCity ? department || undefined : undefined,
            postalCode: postalCode || undefined,
          },
          shippingMethodId,
          paymentProviderId: DEFAULT_PAYMENT,
          isB2B,
          customerId:
            b2bProfile?.customerId ?? linkedCustomerId ?? customer?.id ?? null,
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
            productKind: l.kind === "sku" ? l.productKind : undefined,
          })),
          subtotal: subtotal(),
          shippingPrice,
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
          setPlacingStep("Abriendo Wompi…");
          await wompiReady;
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
      setPlacingStep(null);
    }
  };

  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <header className="mb-8 border-b-2 border-gold-400/40 pb-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
            Perfumas
          </p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-sm text-ink-60">
            Colombia · COP
            {isB2B ? " · Cuenta mayorista" : ""}
          </p>
        </header>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-sm border-2 border-ink/10 bg-white shadow-[0_2px_0_0_rgba(202,169,105,0.2)]">
            <div className="border-b border-gold-400/30 bg-ink px-5 py-3">
              <h2 className="font-display text-lg text-white">Datos de contacto</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border-2 border-ink/10 bg-white shadow-[0_2px_0_0_rgba(202,169,105,0.2)]">
            <div className="border-b border-gold-400/30 bg-ink px-5 py-3">
              <h2 className="font-display text-lg text-white">Envío / recogida</h2>
            </div>
            <div className="space-y-3 p-5">
              {SHIPPING_METHODS.map((m) => {
                const quote = getShippingQuote({
                  methodId: m.id,
                  lines: lines.map((l) => ({
                    kind: l.kind,
                    productId: l.kind === "sku" ? l.productId : undefined,
                    productKind: l.kind === "sku" ? l.productKind : undefined,
                    amount: l.price * l.quantity,
                    department:
                      l.kind === "sku"
                        ? getProductById(l.productId)?.department
                        : undefined,
                  })),
                  subtotal: subtotal(),
                });
                const selected = shippingMethodId === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-sm border-2 p-4 transition-colors ${
                      selected
                        ? "border-gold-400 bg-gold-400/15"
                        : "border-ink/15 bg-paper-soft hover:border-ink/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      checked={selected}
                      onChange={() => setShippingMethodId(m.id)}
                      className="mt-1 accent-[#caa969]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{m.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-60">
                        {m.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        selected ? "text-gold-400" : "text-ink"
                      }`}
                    >
                      {quote.free ? "Gratis" : formatCOP(quote.price)}
                    </span>
                  </label>
                );
              })}
              {shippingHint ? (
                <p className="pt-1 text-xs text-ink-60">{shippingHint}</p>
              ) : null}

              {needsAddress ? (
                <div className="mt-2 space-y-4 border-t-2 border-gold-400/30 pt-4">
                  {needsLocality ? (
                    <div>
                      <Label htmlFor="locality">Localidad (Bogotá)</Label>
                      <select
                        id="locality"
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        className="flex h-12 w-full rounded-sm border-2 border-ink/20 bg-white px-4 text-sm text-ink focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/40"
                      >
                        <option value="">Selecciona localidad…</option>
                        {BOGOTA_LOCALITIES.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs leading-relaxed text-ink-60">
                        Usamos la localidad para despachar desde el hub más cercano
                        (Fontibón o Bonanza).
                      </p>
                    </div>
                  ) : null}

                  {needsNationalCity ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="city">Ciudad</Label>
                        <Input
                          id="city"
                          value={city === "Bogotá" ? "" : city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Medellín, Cali…"
                        />
                      </div>
                      <div>
                        <Label htmlFor="department">Departamento (opcional)</Label>
                        <Input
                          id="department"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Antioquia…"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <Label htmlFor="address">Dirección de entrega</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Calle, número, barrio, referencias"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal">
                      Código postal
                      {needsNationalCity ? " (requerido)" : " (opcional)"}
                    </Label>
                    <Input
                      id="postal"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="110111"
                      required={needsNationalCity}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border-2 border-gold-400/40 bg-white">
            <div className="border-b border-gold-400/30 bg-ink px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">
                Resumen del pedido
              </p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-60">Subtotal</span>
                <span className="font-semibold text-ink">{formatCOP(subtotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-60">
                  Envío{shippingMeta ? ` · ${shippingMeta.name}` : ""}
                </span>
                <span className="font-semibold text-ink">
                  {shippingQuote
                    ? shippingQuote.free
                      ? "Gratis"
                      : formatCOP(shippingQuote.price)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between border-t-2 border-gold-400/30 pt-3 font-display text-xl text-ink">
                <span>Total</span>
                <span className="text-gold-400">{formatCOP(total)}</span>
              </div>
              <p className="text-xs leading-relaxed text-ink-60">
                Al confirmar se abre el pago seguro. Puedes pagar con{" "}
                <span className="font-medium text-ink">tarjeta débito o crédito</span>,{" "}
                <span className="font-medium text-ink">PSE</span>,{" "}
                <span className="font-medium text-ink">Nequi</span>,{" "}
                <span className="font-medium text-ink">Bancolombia</span> u otros medios
                disponibles.
              </p>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button className="w-full" size="lg" disabled={placing} onClick={placeOrder}>
                {placing ? placingStep || "Procesando…" : "Confirmar pedido"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </Section>
  );
}
