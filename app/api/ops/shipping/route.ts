import { NextResponse } from "next/server";
import {
  listShippingOrders,
  updateShippingOrder,
} from "../../../../lib/shipping/medusa-shipping";
import {
  customerPaidEmailHtml,
  sendShippingEmail,
} from "../../../../lib/shipping/email";

function assertOpsAuth(req: Request) {
  const expected =
    process.env.OPS_PANEL_SECRET?.trim() ||
    process.env.PERFUMAS_INTERNAL_SECRET?.trim() ||
    process.env.WOMPI_EVENTS_SECRET?.trim() ||
    "";
  if (!expected) return { ok: false as const, reason: "OPS secret not configured" };
  const header = req.headers.get("x-ops-secret") || "";
  const url = new URL(req.url);
  const q = url.searchParams.get("secret") || "";
  if (header !== expected && q !== expected) {
    return { ok: false as const, reason: "Unauthorized" };
  }
  return { ok: true as const };
}

export async function GET(req: Request) {
  const auth = assertOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.reason }, { status: 401 });
  }
  const url = new URL(req.url);
  const hub = url.searchParams.get("hub") || undefined;
  const status = url.searchParams.get("status") || "pending_dispatch";
  const result = await listShippingOrders({ hub, status });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(req: Request) {
  const auth = assertOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.reason }, { status: 401 });
  }

  let body: {
    orderId?: string;
    trackingNumber?: string;
    labelUrl?: string;
    shippingStatus?: string;
    customerEmail?: string;
    hubLabel?: string;
    displayId?: string | number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const updated = await updateShippingOrder({
    orderId: body.orderId,
    trackingNumber: body.trackingNumber,
    labelUrl: body.labelUrl,
    shippingStatus: body.shippingStatus || "dispatched",
  });

  if (updated.ok && body.customerEmail && body.trackingNumber) {
    await sendShippingEmail({
      to: body.customerEmail,
      subject: `Tu envío Perfumas — ${body.displayId || body.orderId}`,
      html: customerPaidEmailHtml({
        orderId: String(body.displayId || body.orderId),
        hubLabel: body.hubLabel || "Perfumas",
        isPickup: false,
        trackingNumber: body.trackingNumber,
        labelUrl: body.labelUrl,
      }),
    });
  }

  return NextResponse.json(updated, { status: updated.ok ? 200 : 502 });
}
