import { NextResponse } from "next/server";
import {
  listShippingOrders,
  updateShippingOrder,
  type ShippingOrderRow,
} from "../../../../lib/shipping/medusa-shipping";
import {
  customerPaidEmailHtml,
  sendShippingEmail,
} from "../../../../lib/shipping/email";
import {
  createEnviaBooking,
  createPiboxBooking,
} from "../../../../lib/shipping/provider";
import type { DispatchHub } from "../../../../lib/shipping/hub-routing";
import { registerEnviaTrackingWebhook } from "../../../../lib/shipping/providers/envia";

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

function customerName(order: ShippingOrderRow): string {
  const first = order.shipping_address?.first_name?.trim() || "";
  const last = order.shipping_address?.last_name?.trim() || "";
  const full = `${first} ${last}`.trim();
  return full || order.email || "Cliente Perfumas";
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
    action?: string;
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

  if (body.action === "register_envia_webhook") {
    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://tienda.perfumas.com.co";
    const url = `${site}/api/shipping/envia/webhook`;
    const result = await registerEnviaTrackingWebhook(url);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  if (!body.orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  if (body.action === "create_envia") {
    const found = await listShippingOrders({ orderId: body.orderId });
    const order = found.orders[0];
    if (!found.ok || !order) {
      return NextResponse.json(
        { ok: false, message: found.message || "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const meta = order.metadata || {};
    const hub = (meta.shipping_hub as DispatchHub | undefined) || "fontibon";
    const method = String(meta.shipping_method_id || "");
    if (meta.shipping_status === "pickup_ready") {
      return NextResponse.json(
        { ok: false, message: "Pedido de recogida — no requiere Envia" },
        { status: 400 }
      );
    }
    if (method === "delivery-bogota") {
      return NextResponse.json(
        {
          ok: false,
          message: "Domicilio Bogotá usa Picap, no Envia nacional",
        },
        { status: 400 }
      );
    }
    if (meta.envia_shipment_id || meta.tracking_number) {
      return NextResponse.json(
        {
          ok: false,
          message: `Ya hay guía: ${String(meta.tracking_number || meta.envia_shipment_id)}`,
        },
        { status: 409 }
      );
    }

    const address = order.shipping_address?.address_1?.trim() || "";
    if (!address) {
      return NextResponse.json(
        { ok: false, message: "El pedido no tiene dirección de envío" },
        { status: 400 }
      );
    }

    const declaredValueCents =
      typeof order.total === "number" && order.total > 0
        ? Math.round(order.total)
        : 5_000_000;

    const shipment = await createEnviaBooking({
      orderId: order.id,
      reference: String(order.display_id || order.id),
      hub,
      customer: {
        name: customerName(order),
        email: order.email || "",
        phone:
          order.shipping_address?.phone ||
          String(meta.customer_phone || ""),
        address,
        city: order.shipping_address?.city || "Bogotá",
        locality:
          (meta.shipping_locality as string | null | undefined) ||
          order.shipping_address?.province ||
          null,
        department:
          (meta.shipping_department as string | null | undefined) ||
          order.shipping_address?.province ||
          null,
        postalCode:
          order.shipping_address?.postal_code ||
          (meta.shipping_postal_code as string | null | undefined) ||
          null,
      },
      declaredValueCents,
      indications: (order.items || [])
        .map((i) => `${i.quantity || 1}× ${i.title || "item"}`)
        .join(", ")
        .slice(0, 280),
    });

    if (!shipment.ok) {
      return NextResponse.json(
        { ok: false, message: shipment.message || "Envia falló" },
        { status: 502 }
      );
    }

    const updated = await updateShippingOrder({
      orderId: order.id,
      trackingNumber: shipment.trackingNumber || undefined,
      labelUrl: shipment.labelUrl || undefined,
      shippingStatus: "label_created",
      shippingProvider: "envia",
      enviaShipmentId: shipment.externalId || undefined,
      extraMetadata: {
        envia_message: shipment.message || null,
      },
    });

    if (updated.ok && order.email && shipment.trackingNumber) {
      await sendShippingEmail({
        to: order.email,
        subject: `Tu envío Perfumas — ${order.display_id || order.id}`,
        html: customerPaidEmailHtml({
          orderId: String(order.display_id || order.id),
          hubLabel: String(meta.shipping_hub_label || "Fontibón"),
          isPickup: false,
          trackingNumber: shipment.trackingNumber,
          labelUrl: shipment.labelUrl,
        }),
      });
    }

    return NextResponse.json(
      {
        ok: updated.ok,
        message: updated.ok
          ? shipment.message
          : updated.message || "No se pudo guardar metadata",
        shipment,
      },
      { status: updated.ok ? 200 : 502 }
    );
  }

  if (body.action === "create_pibox") {
    const found = await listShippingOrders({ orderId: body.orderId });
    const order = found.orders[0];
    if (!found.ok || !order) {
      return NextResponse.json(
        { ok: false, message: found.message || "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const meta = order.metadata || {};
    const hub = (meta.shipping_hub as DispatchHub | undefined) || "fontibon";
    if (meta.shipping_status === "pickup_ready") {
      return NextResponse.json(
        { ok: false, message: "Pedido de recogida — no requiere Picap" },
        { status: 400 }
      );
    }
    if (meta.pibox_shipment_id) {
      return NextResponse.json(
        {
          ok: false,
          message: `Ya existe booking Picap: ${String(meta.pibox_shipment_id)}`,
        },
        { status: 409 }
      );
    }

    const address = order.shipping_address?.address_1?.trim() || "";
    if (!address) {
      return NextResponse.json(
        { ok: false, message: "El pedido no tiene dirección de envío" },
        { status: 400 }
      );
    }

    // Medusa COP totals are typically already in centavos (same as Wompi).
    const declaredValueCents =
      typeof order.total === "number" && order.total > 0
        ? Math.round(order.total)
        : 5_000_000;

    const shipment = await createPiboxBooking({
      orderId: order.id,
      reference: String(order.display_id || order.id),
      hub,
      customer: {
        name: customerName(order),
        email: order.email || "",
        phone:
          order.shipping_address?.phone ||
          String(meta.customer_phone || ""),
        address,
        city: order.shipping_address?.city || "Bogotá",
        locality:
          (meta.shipping_locality as string | null | undefined) ||
          order.shipping_address?.province ||
          null,
        department:
          (meta.shipping_department as string | null | undefined) || null,
        postalCode:
          order.shipping_address?.postal_code ||
          (meta.shipping_postal_code as string | null | undefined) ||
          null,
      },
      declaredValueCents,
      indications: (order.items || [])
        .map((i) => `${i.quantity || 1}× ${i.title || "item"}`)
        .join(", ")
        .slice(0, 280),
    });

    if (!shipment.ok) {
      return NextResponse.json(
        { ok: false, message: shipment.message || "Picap falló" },
        { status: 502 }
      );
    }

    const updated = await updateShippingOrder({
      orderId: order.id,
      trackingNumber: shipment.trackingNumber || undefined,
      labelUrl: shipment.labelUrl || undefined,
      shippingStatus: "label_created",
      shippingProvider: "pibox",
      piboxShipmentId: shipment.externalId || undefined,
      piboxPackageId: shipment.packageId || undefined,
      pickupValidationCode: shipment.pickupValidationCode ?? null,
    });

    if (updated.ok && order.email && shipment.trackingNumber) {
      await sendShippingEmail({
        to: order.email,
        subject: `Tu envío Perfumas — ${order.display_id || order.id}`,
        html: customerPaidEmailHtml({
          orderId: String(order.display_id || order.id),
          hubLabel: String(meta.shipping_hub_label || "Perfumas"),
          isPickup: false,
          trackingNumber: shipment.trackingNumber,
          labelUrl: shipment.labelUrl,
        }),
      });
    }

    return NextResponse.json(
      {
        ok: updated.ok,
        message: updated.ok
          ? shipment.message
          : updated.message || "No se pudo guardar metadata",
        shipment,
      },
      { status: updated.ok ? 200 : 502 }
    );
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
