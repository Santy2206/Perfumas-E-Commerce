import { resolveDispatchHub } from "./hub-routing";
import { createShipment } from "./provider";
import {
  customerPaidEmailHtml,
  opsDispatchEmailHtml,
  opsEmailForHub,
  sendShippingEmail,
} from "./email";
import type { OrderShippingMetadata, ShippingStatus } from "./types";

export type DispatchOrderInput = {
  orderId: string;
  displayId?: string | number | null;
  shippingMethodId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string | null;
    city?: string | null;
    locality?: string | null;
    department?: string | null;
    postalCode?: string | null;
  };
  itemsSummary?: string;
  /** Existing metadata to merge */
  existingMetadata?: Record<string, unknown> | null;
};

export type DispatchOrderResult = {
  metadata: OrderShippingMetadata & Record<string, unknown>;
  hub: ReturnType<typeof resolveDispatchHub>;
  shipment: Awaited<ReturnType<typeof createShipment>>;
};

const DEFAULT_WEIGHT_KG = 0.5;

export async function buildDispatchForOrder(
  input: DispatchOrderInput
): Promise<DispatchOrderResult> {
  const hub = resolveDispatchHub({
    shippingMethodId: input.shippingMethodId,
    city: input.customer.city,
    locality: input.customer.locality,
  });

  const isPickup = hub.mode === "pickup";
  const shipment = isPickup
    ? {
        ok: true as const,
        provider: "none" as const,
        trackingNumber: null,
        labelUrl: null,
        externalId: null,
        status: "pickup_ready" as ShippingStatus,
        message: "Pedido para recogida en tienda",
      }
    : await createShipment({
        orderId: input.orderId,
        reference: String(input.displayId || input.orderId),
        hub: hub.hub,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone,
          address: input.customer.address || "",
          city: input.customer.city || "Bogotá",
          locality: input.customer.locality,
          department: input.customer.department,
          postalCode: input.customer.postalCode,
        },
        weightKg: DEFAULT_WEIGHT_KG,
      });

  const now = new Date().toISOString();
  const shippingMeta: OrderShippingMetadata = {
    shipping_method_id: input.shippingMethodId,
    shipping_locality: input.customer.locality || null,
    shipping_department: input.customer.department || null,
    shipping_postal_code: input.customer.postalCode || null,
    shipping_hub: hub.hub,
    shipping_hub_label: hub.label,
    shipping_hub_address: hub.address,
    shipping_hub_reason: hub.reason,
    shipping_status: shipment.status,
    shipping_provider: shipment.provider,
    tracking_number: shipment.trackingNumber || null,
    label_url: shipment.labelUrl || null,
    pibox_shipment_id: shipment.externalId || null,
    estimated_weight_kg: DEFAULT_WEIGHT_KG,
    shipping_updated_at: now,
  };

  const metadata = {
    ...(input.existingMetadata || {}),
    ...shippingMeta,
  };

  // Emails (best-effort)
  await sendShippingEmail({
    to: input.customer.email,
    subject: `Pago recibido — pedido ${input.displayId || input.orderId}`,
    html: customerPaidEmailHtml({
      orderId: String(input.displayId || input.orderId),
      hubLabel: hub.label,
      isPickup,
      trackingNumber: shipment.trackingNumber,
      labelUrl: shipment.labelUrl,
    }),
  });

  const opsTo = opsEmailForHub(hub.hub);
  if (opsTo) {
    await sendShippingEmail({
      to: opsTo,
      subject: `[${hub.label}] Despacho ${input.displayId || input.orderId}`,
      html: opsDispatchEmailHtml({
        orderId: String(input.displayId || input.orderId),
        hubLabel: hub.label,
        hubAddress: hub.address,
        reason: hub.reason,
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        customerEmail: input.customer.email,
        address: input.customer.address || hub.address,
        city: input.customer.city || "Bogotá",
        locality: input.customer.locality,
        itemsSummary: input.itemsSummary || "Ver pedido en Admin",
        trackingNumber: shipment.trackingNumber,
        labelUrl: shipment.labelUrl,
      }),
    });
  }

  return { metadata, hub, shipment };
}
