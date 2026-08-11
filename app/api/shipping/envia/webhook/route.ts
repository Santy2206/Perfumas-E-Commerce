import { NextResponse } from "next/server";
import {
  listShippingOrders,
  updateShippingOrder,
} from "../../../../../lib/shipping/medusa-shipping";
import { mapEnviaTrackingStatus } from "../../../../../lib/shipping/providers/envia";

type EnviaWebhookBody = {
  type?: string;
  created_at?: string;
  data?: {
    shipment_id?: number | string;
    tracking_number?: string;
    carrier_name?: string;
    status?: string;
    status_description?: string;
    location?: string;
  };
};

/**
 * Envia tracking webhook (type_id 3).
 * Register in Envia dashboard or via Ops action `register_envia_webhook`:
 *   POST https://tienda.perfumas.com.co/api/shipping/envia/webhook
 */
export async function POST(req: Request) {
  let body: EnviaWebhookBody;
  try {
    body = (await req.json()) as EnviaWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const data = body.data || {};
  const tracking = String(data.tracking_number || "").trim();
  const shipmentId =
    data.shipment_id != null ? String(data.shipment_id).trim() : "";

  if (!tracking && !shipmentId) {
    // Acknowledge unknown shapes so Envia does not retry forever
    return NextResponse.json({
      ok: true,
      ignored: true,
      message: "No tracking_number / shipment_id",
    });
  }

  const shippingStatus = mapEnviaTrackingStatus(data.status);
  if (!shippingStatus) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      message: `Unhandled status ${data.status}`,
    });
  }

  let orders =
    (
      await (tracking
        ? listShippingOrders({ trackingNumber: tracking })
        : listShippingOrders({ enviaShipmentId: shipmentId }))
    ).orders || [];

  if (!orders[0] && shipmentId && tracking) {
    orders = (await listShippingOrders({ enviaShipmentId: shipmentId })).orders || [];
  }

  const order = orders[0];
  if (!order) {
    return NextResponse.json(
      {
        ok: false,
        message: `No order for Envia tracking ${tracking || shipmentId}`,
      },
      { status: 404 }
    );
  }

  const updated = await updateShippingOrder({
    orderId: order.id,
    shippingStatus,
    trackingNumber: tracking || undefined,
    enviaShipmentId: shipmentId || undefined,
    extraMetadata: {
      envia_last_status: data.status || null,
      envia_last_status_description: data.status_description || null,
      envia_last_location: data.location || null,
      envia_carrier: data.carrier_name || null,
      envia_last_event_at: body.created_at || new Date().toISOString(),
      envia_webhook_type: body.type || null,
    },
  });

  return NextResponse.json({
    ok: updated.ok,
    order_id: order.id,
    shipping_status: shippingStatus,
    message: updated.message,
  });
}
