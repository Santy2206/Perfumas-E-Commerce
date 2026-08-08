import { NextResponse } from "next/server";
import {
  listShippingOrders,
  updateShippingOrder,
} from "../../../../../lib/shipping/medusa-shipping";
import {
  mapPicapBookingStatus,
  mapPicapPackageStatus,
} from "../../../../../lib/shipping/providers/pibox";

type PicapWebhookBody = {
  event_cd?: number;
  booking_id?: string;
  package_id?: string;
  status_cd?: number;
  created_at?: string;
  relaunched_to_id?: string | null;
};

/**
 * Picap webhook (event_cd 0 = booking, 1 = package).
 * Register in Picap:
 *   POST https://tienda.perfumas.com.co/api/shipping/pibox/webhook
 */
export async function POST(req: Request) {
  let body: PicapWebhookBody;
  try {
    body = (await req.json()) as PicapWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const eventCd = body.event_cd;
  const statusCd =
    typeof body.status_cd === "number" ? body.status_cd : undefined;

  if (statusCd == null) {
    return NextResponse.json(
      { ok: false, message: "status_cd required" },
      { status: 422 }
    );
  }

  let shippingStatus =
    eventCd === 1
      ? mapPicapPackageStatus(statusCd)
      : mapPicapBookingStatus(statusCd);

  if (!shippingStatus) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      message: `Unhandled status_cd ${statusCd}`,
    });
  }

  const bookingId = body.booking_id?.trim();
  const packageId = body.package_id?.trim();

  let orders =
    (
      await (bookingId
        ? listShippingOrders({ piboxShipmentId: bookingId })
        : packageId
          ? listShippingOrders({ piboxPackageId: packageId })
          : Promise.resolve({
              ok: false as const,
              orders: [] as Awaited<
                ReturnType<typeof listShippingOrders>
              >["orders"],
              message: "No booking_id or package_id",
            }))
    ).orders || [];

  if (!orders[0] && body.relaunched_to_id) {
    orders =
      (
        await listShippingOrders({
          piboxShipmentId: body.relaunched_to_id,
        })
      ).orders || [];
  }

  const order = orders[0];
  if (!order) {
    return NextResponse.json(
      {
        ok: false,
        message: `No order for Picap id ${bookingId || packageId || "?"}`,
      },
      { status: 404 }
    );
  }

  const extra: Record<string, unknown> = {
    pibox_last_event_cd: eventCd ?? null,
    pibox_last_status_cd: statusCd,
    pibox_last_event_at: body.created_at || new Date().toISOString(),
  };
  if (body.relaunched_to_id) {
    extra.pibox_shipment_id = body.relaunched_to_id;
    if (bookingId) extra.pibox_original_shipment_id = bookingId;
  }
  if (packageId) extra.pibox_package_id = packageId;

  const updated = await updateShippingOrder({
    orderId: order.id,
    shippingStatus,
    piboxShipmentId: body.relaunched_to_id || bookingId || undefined,
    piboxPackageId: packageId,
    extraMetadata: extra,
  });

  return NextResponse.json({
    ok: updated.ok,
    order_id: order.id,
    shipping_status: shippingStatus,
    message: updated.message,
  });
}
