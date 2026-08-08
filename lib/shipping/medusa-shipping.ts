/**
 * Call Medusa shipping hooks / admin APIs from the Next.js storefront.
 */

function medusaBase() {
  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(/\/$/, "") || "";
}

function internalSecret() {
  return (
    process.env.PERFUMAS_INTERNAL_SECRET ||
    process.env.WOMPI_EVENTS_SECRET ||
    ""
  );
}

export type ShippingOrderRow = {
  id: string;
  display_id?: number | string | null;
  email?: string | null;
  created_at?: string;
  total?: number | null;
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

export async function pushShippingMetadata(
  orderId: string,
  metadata: Record<string, unknown>
) {
  const base = medusaBase();
  const secret = internalSecret();
  if (!base || !secret) {
    return { ok: false as const, message: "Missing Medusa URL or internal secret" };
  }

  const res = await fetch(`${base}/hooks/shipping/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-perfumas-internal-secret": secret,
    },
    body: JSON.stringify({ order_id: orderId, metadata }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json, message: String(json.message || "") };
}

export async function listShippingOrders(opts?: {
  hub?: string;
  status?: string;
  orderId?: string;
  piboxShipmentId?: string;
  piboxPackageId?: string;
}) {
  const base = medusaBase();
  const secret = internalSecret();
  if (!base || !secret) {
    return {
      ok: false as const,
      message: "Missing Medusa URL or PERFUMAS_INTERNAL_SECRET",
      orders: [] as ShippingOrderRow[],
    };
  }
  const qs = new URLSearchParams();
  if (opts?.hub) qs.set("hub", opts.hub);
  if (opts?.status) qs.set("status", opts.status);
  if (opts?.orderId) qs.set("order_id", opts.orderId);
  if (opts?.piboxShipmentId) qs.set("pibox_shipment_id", opts.piboxShipmentId);
  if (opts?.piboxPackageId) qs.set("pibox_package_id", opts.piboxPackageId);
  const res = await fetch(`${base}/hooks/shipping/list?${qs}`, {
    headers: {
      "x-perfumas-internal-secret": secret,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    orders?: ShippingOrderRow[];
    message?: string;
  };
  return {
    ok: res.ok,
    orders: json.orders || [],
    message: json.message,
  };
}

export async function updateShippingOrder(input: {
  orderId: string;
  trackingNumber?: string;
  labelUrl?: string;
  shippingStatus?: string;
  shippingProvider?: string;
  piboxShipmentId?: string;
  piboxPackageId?: string;
  pickupValidationCode?: string | null;
  extraMetadata?: Record<string, unknown>;
}) {
  const meta: Record<string, unknown> = {
    shipping_status: input.shippingStatus || "dispatched",
    shipping_updated_at: new Date().toISOString(),
    ...(input.extraMetadata || {}),
  };
  if (input.shippingStatus === "dispatched") {
    meta.shipping_dispatched_at = new Date().toISOString();
  }
  if (input.trackingNumber != null) meta.tracking_number = input.trackingNumber;
  if (input.labelUrl != null) meta.label_url = input.labelUrl;
  if (input.shippingProvider != null) {
    meta.shipping_provider = input.shippingProvider;
  }
  if (input.piboxShipmentId != null) {
    meta.pibox_shipment_id = input.piboxShipmentId;
  }
  if (input.piboxPackageId != null) {
    meta.pibox_package_id = input.piboxPackageId;
  }
  if (input.pickupValidationCode !== undefined) {
    meta.pickup_validation_code = input.pickupValidationCode;
  }
  return pushShippingMetadata(input.orderId, meta);
}
