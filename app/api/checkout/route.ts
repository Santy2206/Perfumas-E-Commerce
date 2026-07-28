import { NextResponse } from "next/server";
import { computeBuildPrice } from "../../../lib/build-pricing";
import type { BuildPayload } from "../../../lib/build-pricing";

type CheckoutLine = {
  id: string;
  kind: "build" | "sku";
  title: string;
  price: number;
  quantity: number;
  build?: BuildPayload;
  productId?: string;
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
  lines: CheckoutLine[];
  subtotal: number;
  shippingPrice: number;
  total: number;
};

/**
 * Creates an order record. When Medusa is configured, this proxies to the
 * backend; otherwise persists a local order JSON for fulfillment review.
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
    return NextResponse.json({ error: "Datos de cliente incompletos" }, { status: 400 });
  }

  // Re-validate custom build prices server-side
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
  };

  // Persist in-memory via global for demo; Medusa path below when configured
  const g = globalThis as unknown as { __perfumasOrders?: typeof order[] };
  if (!g.__perfumasOrders) g.__perfumasOrders = [];
  g.__perfumasOrders.push(order);

  // Attempt Medusa sync (best-effort; never block local order)
  const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  if (medusaUrl) {
    try {
      await fetch(`${medusaUrl}/store/perfumas/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
            ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
            : {}),
        },
        body: JSON.stringify(order),
      });
    } catch {
      // Local order still valid
    }
  }

  return NextResponse.json({ orderId, order });
}

export async function GET() {
  const g = globalThis as unknown as { __perfumasOrders?: unknown[] };
  return NextResponse.json({ orders: g.__perfumasOrders ?? [] });
}
