import { NextResponse } from "next/server";
import { computeBuildPrice } from "../../../lib/build-pricing";
import type { BuildPayload } from "../../../lib/build-pricing";
import { verifyB2BApprovedServer } from "../../../lib/b2b";
import { isMedusaConfigured, medusa } from "../../../lib/medusa";
import {
  ensureMedusaCart,
  getColombiaRegionId,
  listShippingOptionsForCart,
  matchShippingOptionId,
  addVariantToMedusaCart,
} from "../../../lib/medusa-cart";
import {
  buildWompiCheckoutReference,
  isWompiConfigured,
} from "../../../lib/wompi";
import { resolveDispatchHub } from "../../../lib/shipping/hub-routing";
import { getShippingQuote } from "../../../lib/shipping/pricing";
import { getProductById } from "../../../lib/catalog";

function allowLocalCheckoutFallback() {
  if (process.env.ALLOW_LOCAL_CHECKOUT_FALLBACK === "true") return true;
  if (process.env.ALLOW_LOCAL_CHECKOUT_FALLBACK === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/** Prefer Medusa order total (pesos). Guard against minor-unit totals. */
function amountPesosFromOrder(
  orderTotal: number | null | undefined,
  fallbackPesos: number
) {
  if (typeof orderTotal !== "number" || !Number.isFinite(orderTotal) || orderTotal <= 0) {
    return Math.round(fallbackPesos);
  }
  if (fallbackPesos > 0 && orderTotal >= fallbackPesos * 50) {
    return Math.round(orderTotal / 100);
  }
  return Math.round(orderTotal);
}

type CheckoutLine = {
  id: string;
  kind: "build" | "sku";
  title: string;
  price: number;
  quantity: number;
  build?: BuildPayload;
  productId?: string;
  variantId?: string;
  medusaLineId?: string;
  isWholesale?: boolean;
  productKind?: string;
};

type CheckoutBody = {
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    locality?: string;
    department?: string;
    postalCode?: string;
  };
  shippingMethodId: string;
  paymentProviderId: string;
  isB2B?: boolean;
  customerId?: string | null;
  medusaCartId?: string | null;
  lines: CheckoutLine[];
  subtotal: number;
  shippingPrice: number;
  total: number;
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first_name = parts[0] || "Cliente";
  const last_name = parts.slice(1).join(" ") || "Perfumas";
  return { first_name, last_name };
}

async function completeMedusaCheckout(body: CheckoutBody) {
  if (!isMedusaConfigured()) return null;

  const regionId = await getColombiaRegionId();
  if (!regionId) return null;

  let cartSummary = await ensureMedusaCart(body.medusaCartId, {
    customerId: body.customerId,
    wholesale: Boolean(body.isB2B),
  });
  if (!cartSummary) return null;
  const cartId = cartSummary.id;

  // Ensure SKU lines exist on the Medusa cart (parallel)
  const skuAdds = body.lines
    .filter((line) => line.kind === "sku" && line.variantId)
    .filter(
      (line) =>
        !cartSummary.items.some(
          (i) => i.id === line.medusaLineId || i.variant_id === line.variantId
        )
    )
    .map((line) =>
      addVariantToMedusaCart(cartId, line.variantId!, line.quantity, {
        handle: line.title,
        wholesale: Boolean(line.isWholesale),
      })
    );
  if (skuAdds.length) {
    await Promise.all(skuAdds);
  }

  // Custom builds in parallel
  const buildAdds = body.lines
    .filter((line) => line.kind === "build" && line.build)
    .map(async (line) => {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/builds/add-to-cart`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
                ? {
                    "x-publishable-api-key":
                      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
                  }
                : {}),
            },
            body: JSON.stringify({
              ...line.build,
              cart_id: cartId,
              serverPrice: line.price,
              quantity: line.quantity,
              title: line.title,
            }),
          }
        );
      } catch {
        // build may still be local-only
      }
    });
  if (buildAdds.length) {
    await Promise.all(buildAdds);
  }

  // Reject carts that already contain underpriced custom builds (direct API abuse).
  const cartBeforeShip = await medusa.store.cart.retrieve(cartId, {
    fields: "+items,*items.metadata",
  });
  for (const item of cartBeforeShip.cart?.items || []) {
    const meta = (item.metadata || {}) as Record<string, unknown>;
    if (meta.type !== "custom_build") continue;
    const fragranceId = String(meta.fragrance_id || "");
    const bottleId = String(meta.bottle_id || "");
    if (!fragranceId || !bottleId) {
      throw new Error(
        "El carrito tiene una fragancia personalizada inválida. Vuelve a agregarla."
      );
    }
    const pheromoneIds = Array.isArray(meta.pheromone_ids)
      ? meta.pheromone_ids.map(String)
      : [];
    const priced = computeBuildPrice({
      fragranceId,
      bottleId,
      pheromoneIds,
      giftWrap: Boolean(meta.gift_wrap),
      alcoholId:
        meta.alcohol_id != null ? String(meta.alcohol_id) : undefined,
    });
    if (!priced.ok) {
      throw new Error(priced.error);
    }
    const unit = Number(item.unit_price ?? 0);
    if (unit !== priced.total) {
      throw new Error(
        `Precio de fragancia personalizada inválido en el carrito (esperado ${priced.total}, en carrito ${unit}). Vuelve a agregar la fragancia.`
      );
    }
  }

  const hub = resolveDispatchHub({
    shippingMethodId: body.shippingMethodId,
    city: body.customer.city,
    locality: body.customer.locality,
  });

  const { first_name, last_name } = splitName(body.customer.name);
  const address = {
    first_name,
    last_name,
    address_1: body.customer.address || "Recogida en tienda",
    city: body.customer.city || "Bogotá",
    province: body.customer.locality || body.customer.department || undefined,
    postal_code: body.customer.postalCode || undefined,
    country_code: "co",
    phone: body.customer.phone,
  };

  await medusa.store.cart.update(cartId, {
    email: body.customer.email,
    shipping_address: address,
    billing_address: address,
    metadata: {
      payment_provider_local: body.paymentProviderId,
      payment_status: "awaiting_wompi",
      is_b2b: Boolean(body.isB2B),
      shipping_method_id: body.shippingMethodId,
      shipping_locality: body.customer.locality || null,
      shipping_department: body.customer.department || null,
      shipping_postal_code: body.customer.postalCode || null,
      shipping_hub: hub.hub,
      shipping_hub_label: hub.label,
      shipping_hub_address: hub.address,
      shipping_hub_reason: hub.reason,
      // Do not show in Ops until Wompi captures (webhook → pending_dispatch).
      shipping_status: "awaiting_payment",
      shipping_provider: hub.mode === "pickup" ? "none" : "manual_pibox",
      customer_name: body.customer.name,
      customer_phone: body.customer.phone,
    },
  });

  const shippingOptions = await listShippingOptionsForCart(cartId);
  const shippingQuote = getShippingQuote({
    methodId: body.shippingMethodId,
    lines: body.lines.map((l) => ({
      kind: l.kind,
      productId: l.productId,
      productKind: l.productKind,
      amount: l.price * l.quantity,
      department: l.productId
        ? getProductById(l.productId)?.department
        : undefined,
    })),
    subtotal: body.lines.reduce((s, l) => s + l.price * l.quantity, 0),
  });
  const optionId = matchShippingOptionId(
    shippingOptions,
    body.shippingMethodId,
    { preferFree: shippingQuote.free }
  );
  if (optionId) {
    await medusa.store.cart.addShippingMethod(cartId, { option_id: optionId });
  }

  const [{ cart }, { payment_providers }] = await Promise.all([
    medusa.store.cart.retrieve(cartId, {
      fields: "*payment_collection,*payment_collection.payment_sessions",
    }),
    medusa.store.payment.listPaymentProviders({
      region_id: regionId,
    }),
  ]);

  const wantWompi = body.paymentProviderId === "wompi";
  const providerId =
    (wantWompi &&
      payment_providers?.find((p: { id: string }) =>
        p.id.includes("wompi")
      )?.id) ||
    payment_providers?.find((p: { id: string }) =>
      p.id.includes("system")
    )?.id ||
    payment_providers?.[0]?.id ||
    "pp_system_default";

  await medusa.store.payment.initiatePaymentSession(cart, {
    provider_id: providerId,
  });

  const result = await medusa.store.cart.complete(cartId);
  if (result.type === "order" && result.order) {
    const order = result.order as {
      id: string;
      display_id?: number | string;
      total?: number | null;
    };
    return {
      orderId: order.id,
      displayId: order.display_id,
      totalPesos: amountPesosFromOrder(order.total, body.total),
      source: "medusa" as const,
    };
  }
  if (result.type === "cart") {
    throw new Error(
      "El carrito no se pudo completar. Revisa envío y pago e intenta de nuevo."
    );
  }
  return null;
}

/**
 * Creates an order. Prefer Medusa complete-cart.
 * Local in-memory fallback is disabled in production.
 */
export async function POST(req: Request) {
  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.lines?.length) {
    return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
  }
  if (!body.customer?.email || !body.customer?.name) {
    return NextResponse.json(
      { error: "Datos de cliente incompletos" },
      { status: 400 }
    );
  }

  if (
    body.shippingMethodId === "delivery-bogota" &&
    !body.customer.locality?.trim()
  ) {
    return NextResponse.json(
      { error: "Selecciona la localidad de Bogotá para el domicilio." },
      { status: 400 }
    );
  }
  if (
    body.shippingMethodId === "delivery-nacional" &&
    !body.customer.city?.trim()
  ) {
    return NextResponse.json(
      { error: "Indica la ciudad de destino para el envío nacional." },
      { status: 400 }
    );
  }
  if (
    body.shippingMethodId === "delivery-nacional" &&
    !body.customer.postalCode?.trim()
  ) {
    return NextResponse.json(
      { error: "Indica el código postal para el envío nacional." },
      { status: 400 }
    );
  }

  const wantsWholesale =
    Boolean(body.isB2B) || body.lines.some((l) => l.isWholesale);
  if (wantsWholesale) {
    if (!body.customerId?.trim()) {
      return NextResponse.json(
        {
          error:
            "Para precios mayoristas inicia sesión con una cuenta aprobada en emprendedores.",
        },
        { status: 403 }
      );
    }
    const b2b = await verifyB2BApprovedServer(body.customerId);
    if (!b2b.approved) {
      return NextResponse.json(
        { error: b2b.message || "Cuenta mayorista no aprobada" },
        { status: 403 }
      );
    }
  }

  for (const line of body.lines) {
    if (line.kind === "build" && line.build) {
      const priced = computeBuildPrice(line.build);
      if (!priced.ok) {
        return NextResponse.json({ error: priced.error }, { status: 400 });
      }
      if (priced.total !== line.price) {
        return NextResponse.json(
          {
            error: `Precio de fragancia personalizada desactualizado (esperado ${priced.total}, recibido ${line.price})`,
            correctedPrice: priced.total,
          },
          { status: 409 }
        );
      }
    }
  }

  const computedSubtotal = body.lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  );
  const shippingQuote = getShippingQuote({
    methodId: body.shippingMethodId,
    lines: body.lines.map((l) => ({
      kind: l.kind,
      productId: l.productId,
      productKind: l.productKind,
      amount: l.price * l.quantity,
      department: l.productId
        ? getProductById(l.productId)?.department
        : undefined,
    })),
    subtotal: computedSubtotal,
  });
  if (
    typeof body.shippingPrice === "number" &&
    body.shippingPrice !== shippingQuote.price
  ) {
    return NextResponse.json(
      {
        error: `Precio de envío desactualizado (esperado ${shippingQuote.price}, recibido ${body.shippingPrice})`,
        correctedShippingPrice: shippingQuote.price,
        shippingReason: shippingQuote.reason,
      },
      { status: 409 }
    );
  }
  const expectedTotal = computedSubtotal + shippingQuote.price;
  if (typeof body.total === "number" && body.total !== expectedTotal) {
    return NextResponse.json(
      {
        error: `Total desactualizado (esperado ${expectedTotal}, recibido ${body.total})`,
        correctedTotal: expectedTotal,
      },
      { status: 409 }
    );
  }
  // Prefer server totals for payment
  body.subtotal = computedSubtotal;
  body.shippingPrice = shippingQuote.price;
  body.total = expectedTotal;

  try {
    const medusaOrder = await completeMedusaCheckout(body);
    if (medusaOrder) {
      const amountPesos = medusaOrder.totalPesos ?? body.total;
      const wompi =
        body.paymentProviderId === "wompi" && isWompiConfigured()
          ? buildWompiCheckoutReference({
              orderId: medusaOrder.orderId,
              amountPesos,
              customerEmail: body.customer.email,
            })
          : null;
      return NextResponse.json({
        orderId: medusaOrder.orderId,
        displayId: medusaOrder.displayId,
        source: "medusa",
        amountPesos,
        paymentProviderId: body.paymentProviderId,
        payment:
          body.paymentProviderId === "wompi"
            ? wompi
              ? {
                  mode: wompi.integrity ? "wompi_widget" : "wompi_needs_integrity",
                  wompi,
                  message: wompi.integrity
                    ? undefined
                    : "Falta WOMPI_INTEGRITY_SECRET en Vercel (Dashboard Wompi → Secretos).",
                }
              : {
                  mode: "system_pending",
                  message:
                    "Pedido creado. Configura NEXT_PUBLIC_WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY en Vercel.",
                }
            : { mode: "manual_or_system" },
      });
    }
  } catch (error) {
    console.warn("[checkout] Medusa complete failed:", error);
    if (!allowLocalCheckoutFallback()) {
      return NextResponse.json(
        {
          error:
            "No pudimos crear el pedido en Medusa. Intenta de nuevo en unos minutos.",
          detail: error instanceof Error ? error.message : undefined,
        },
        { status: 503 }
      );
    }
  }

  if (!allowLocalCheckoutFallback()) {
    return NextResponse.json(
      {
        error:
          "Checkout no disponible: Medusa no respondió. Revisa el backend y vuelve a intentar.",
      },
      { status: 503 }
    );
  }

  const orderId = `PF-${Date.now().toString(36).toUpperCase()}`;
  const fulfillmentNotes = body.lines
    .filter((l) => l.kind === "build" && l.build)
    .map((l) => {
      const priced = computeBuildPrice(l.build!);
      if (!priced.ok) return null;
      return {
        lineId: l.id,
        title: l.title,
        pickList: priced.metadata.build_components,
        label: priced.metadata.label_text,
        giftWrap: priced.metadata.gift_wrap,
      };
    })
    .filter(Boolean);

  const hubFallback = resolveDispatchHub({
    shippingMethodId: body.shippingMethodId,
    city: body.customer.city,
    locality: body.customer.locality,
  });

  const order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    status: "pending_payment",
    customer: body.customer,
    shippingMethodId: body.shippingMethodId,
    paymentProviderId: body.paymentProviderId,
    isB2B: Boolean(body.isB2B),
    lines: body.lines,
    subtotal: body.subtotal,
    shippingPrice: body.shippingPrice,
    total: body.total,
    fulfillment: fulfillmentNotes,
    currency: "COP",
    region: "co",
    source: "local_fallback",
    shipping: {
      hub: hubFallback.hub,
      hubLabel: hubFallback.label,
      reason: hubFallback.reason,
      locality: body.customer.locality || null,
    },
  };

  const g = globalThis as unknown as { __perfumasOrders?: typeof order[] };
  if (!g.__perfumasOrders) g.__perfumasOrders = [];
  g.__perfumasOrders.push(order);

  const wompiFallback =
    body.paymentProviderId === "wompi" && isWompiConfigured()
      ? buildWompiCheckoutReference({
          orderId,
          amountPesos: body.total,
          customerEmail: body.customer.email,
        })
      : null;

  return NextResponse.json({
    orderId,
    order,
    source: "local_fallback",
    paymentProviderId: body.paymentProviderId,
    warning: "Pedido local — Medusa no disponible o checkout incompleto",
    payment:
      body.paymentProviderId === "wompi"
        ? wompiFallback
          ? {
              mode: wompiFallback.integrity
                ? "wompi_widget"
                : "wompi_needs_integrity",
              wompi: wompiFallback,
              message: wompiFallback.integrity
                ? undefined
                : "Falta WOMPI_INTEGRITY_SECRET en Vercel.",
            }
          : {
              mode: "system_pending",
              message: "Configura las keys WOMPI_* en Vercel.",
            }
        : { mode: "manual_or_system" },
  });
}

export async function GET() {
  const g = globalThis as unknown as { __perfumasOrders?: unknown[] };
  return NextResponse.json({ orders: g.__perfumasOrders ?? [] });
}
