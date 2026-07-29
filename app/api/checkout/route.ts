import { NextResponse } from "next/server";
import { computeBuildPrice } from "../../../lib/build-pricing";
import type { BuildPayload } from "../../../lib/build-pricing";
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
};

type CheckoutBody = {
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
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
  let cartId = cartSummary.id;

  // Ensure SKU lines exist on the Medusa cart
  for (const line of body.lines) {
    if (line.kind !== "sku" || !line.variantId) continue;
    const already = cartSummary.items.some(
      (i) => i.id === line.medusaLineId || i.variant_id === line.variantId
    );
    if (!already) {
      const updated = await addVariantToMedusaCart(
        cartId,
        line.variantId,
        line.quantity,
        { handle: line.title, wholesale: Boolean(line.isWholesale) }
      );
      if (updated) cartSummary = updated;
    }
  }

  // Custom builds: call backend route if any build lines
  for (const line of body.lines) {
    if (line.kind !== "build" || !line.build) continue;
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
  }

  const { first_name, last_name } = splitName(body.customer.name);
  const address = {
    first_name,
    last_name,
    address_1: body.customer.address || "Recogida en tienda",
    city: body.customer.city || "Bogotá",
    country_code: "co",
    phone: body.customer.phone,
  };

  await medusa.store.cart.update(cartId, {
    email: body.customer.email,
    shipping_address: address,
    billing_address: address,
    metadata: {
      payment_provider_local: body.paymentProviderId,
      is_b2b: Boolean(body.isB2B),
    },
  });

  const shippingOptions = await listShippingOptionsForCart(cartId);
  const optionId = matchShippingOptionId(
    shippingOptions,
    body.shippingMethodId
  );
  if (optionId) {
    await medusa.store.cart.addShippingMethod(cartId, { option_id: optionId });
  }

  const { cart } = await medusa.store.cart.retrieve(cartId, {
    fields: "*payment_collection,*payment_collection.payment_sessions",
  });

  const { payment_providers } = await medusa.store.payment.listPaymentProviders({
    region_id: regionId,
  });
  const wantWompi = body.paymentProviderId === "wompi";
  const providerId =
    (wantWompi &&
      payment_providers?.find((p) => p.id.includes("wompi"))?.id) ||
    payment_providers?.find((p) => p.id.includes("system"))?.id ||
    payment_providers?.[0]?.id ||
    "pp_system_default";

  await medusa.store.payment.initiatePaymentSession(cart, {
    provider_id: providerId,
  });

  const result = await medusa.store.cart.complete(cartId);
  if (result.type === "order" && result.order) {
    return {
      orderId: result.order.id,
      displayId: result.order.display_id,
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
 * Creates an order. Prefer Medusa complete-cart; fall back to local in-memory order.
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

  try {
    const medusaOrder = await completeMedusaCheckout(body);
    if (medusaOrder) {
      const wompi =
        body.paymentProviderId === "wompi" && isWompiConfigured()
          ? buildWompiCheckoutReference({
              orderId: medusaOrder.orderId,
              amountInCents: Math.round(body.total),
              customerEmail: body.customer.email,
            })
          : null;
      return NextResponse.json({
        orderId: medusaOrder.orderId,
        displayId: medusaOrder.displayId,
        source: "medusa",
        payment:
          body.paymentProviderId === "wompi"
            ? wompi
              ? { mode: "wompi_widget", wompi }
              : {
                  mode: "system_pending",
                  message:
                    "Pedido creado con pago sistema. Configura WOMPI_* para el widget; confirma en Admin.",
                }
            : { mode: "manual_or_system" },
      });
    }
  } catch (error) {
    console.warn("[checkout] Medusa complete failed, using local fallback:", error);
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
  };

  const g = globalThis as unknown as { __perfumasOrders?: typeof order[] };
  if (!g.__perfumasOrders) g.__perfumasOrders = [];
  g.__perfumasOrders.push(order);

  return NextResponse.json({
    orderId,
    order,
    source: "local_fallback",
    warning: "Pedido local — Medusa no disponible o checkout incompleto",
  });
}

export async function GET() {
  const g = globalThis as unknown as { __perfumasOrders?: unknown[] };
  return NextResponse.json({ orders: g.__perfumasOrders ?? [] });
}
