import { NextResponse } from "next/server";
import {
  isWompiConfigured,
  type WompiEventPayload,
  verifyWompiEventSignature,
} from "../../../../../lib/wompi";
import { buildDispatchForOrder } from "../../../../../lib/shipping/dispatch";
import { pushShippingMetadata } from "../../../../../lib/shipping/medusa-shipping";

type MedusaOrderSnapshot = {
  id: string;
  display_id?: number;
  email?: string | null;
  metadata?: Record<string, unknown> | null;
  shipping_address?: {
    first_name?: string | null;
    last_name?: string | null;
    address_1?: string | null;
    city?: string | null;
    phone?: string | null;
    province?: string | null;
    postal_code?: string | null;
  } | null;
  items?: Array<{ title?: string | null; quantity?: number | null }>;
};

/**
 * POST /api/payments/wompi/webhook
 * Verify → Medusa capture → hub routing + shipping emails → persist metadata.
 */
export async function POST(req: Request) {
  if (!isWompiConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Wompi not configured" },
      { status: 503 }
    );
  }

  let event: WompiEventPayload;
  try {
    event = (await req.json()) as WompiEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const checksum = req.headers.get("x-event-checksum");
  const verified = verifyWompiEventSignature(event, checksum);
  if (!verified.ok) {
    return NextResponse.json(
      { ok: false, message: verified.reason },
      { status: 401 }
    );
  }

  const g = globalThis as unknown as {
    __perfumasWompiEvents?: Record<string, unknown>[];
  };
  if (!g.__perfumasWompiEvents) g.__perfumasWompiEvents = [];
  g.__perfumasWompiEvents.push({
    receivedAt: new Date().toISOString(),
    event,
  });

  const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(
    /\/$/,
    ""
  );
  if (!medusaUrl) {
    return NextResponse.json({
      ok: true,
      verified: true,
      medusa: "skipped",
      message: "Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL",
    });
  }

  try {
    const medusaRes = await fetch(`${medusaUrl}/hooks/wompi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(checksum ? { "X-Event-Checksum": checksum } : {}),
      },
      body: JSON.stringify(event),
      cache: "no-store",
    });
    const medusaJson = (await medusaRes.json().catch(() => ({}))) as {
      ok?: boolean;
      captured?: boolean;
      order?: MedusaOrderSnapshot;
      message?: string;
      [key: string]: unknown;
    };

    if (!medusaRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          verified: true,
          medusaStatus: medusaRes.status,
          medusa: medusaJson,
        },
        { status: 502 }
      );
    }

    let shipping: Record<string, unknown> | null = null;
    if (medusaJson.captured && medusaJson.order) {
      shipping = await runShippingDispatch(medusaJson.order);
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      medusaStatus: medusaRes.status,
      medusa: medusaJson,
      shipping,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        verified: true,
        medusa: "error",
        message:
          error instanceof Error ? error.message : "Medusa forward failed",
      },
      { status: 502 }
    );
  }
}

async function runShippingDispatch(order: MedusaOrderSnapshot) {
  const meta = order.metadata || {};
  const addr = order.shipping_address;
  const customerName =
    (typeof meta.customer_name === "string" && meta.customer_name) ||
    [addr?.first_name, addr?.last_name].filter(Boolean).join(" ") ||
    "Cliente";

  const itemsSummary = (order.items || [])
    .map((i) => `${i.quantity || 1}× ${i.title || "Item"}`)
    .join(", ");

  try {
    const result = await buildDispatchForOrder({
      orderId: order.id,
      displayId: order.display_id,
      shippingMethodId: String(meta.shipping_method_id || "delivery-bogota"),
      customer: {
        name: customerName,
        email: order.email || "",
        phone:
          (typeof meta.customer_phone === "string" && meta.customer_phone) ||
          addr?.phone ||
          "",
        address: addr?.address_1,
        city: addr?.city,
        locality:
          (typeof meta.shipping_locality === "string" &&
            meta.shipping_locality) ||
          addr?.province ||
          null,
        department:
          (typeof meta.shipping_department === "string" &&
            meta.shipping_department) ||
          null,
        postalCode:
          (typeof meta.shipping_postal_code === "string" &&
            meta.shipping_postal_code) ||
          addr?.postal_code ||
          null,
      },
      itemsSummary,
      existingMetadata: meta,
    });

    await pushShippingMetadata(order.id, result.metadata);

    return {
      ok: true,
      hub: result.hub.hub,
      status: result.shipment.status,
      provider: result.shipment.provider,
      trackingNumber: result.shipment.trackingNumber || null,
    };
  } catch (error) {
    console.warn("[wompi-webhook] shipping dispatch failed:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "dispatch failed",
    };
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isWompiConfigured(),
    eventsSecret: Boolean(process.env.WOMPI_EVENTS_SECRET),
    message:
      "POST Wompi webhooks here. Captures payment, assigns Fontibón/Bonanza hub, emails ops/customer.",
  });
}
