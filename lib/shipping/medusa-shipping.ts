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
  return { ok: res.ok, status: res.status, json };
}

export async function listShippingOrders(opts?: {
  hub?: string;
  status?: string;
}) {
  const base = medusaBase();
  const secret = internalSecret();
  if (!base || !secret) {
    return {
      ok: false as const,
      message: "Missing Medusa URL or PERFUMAS_INTERNAL_SECRET",
      orders: [] as unknown[],
    };
  }
  const qs = new URLSearchParams();
  if (opts?.hub) qs.set("hub", opts.hub);
  if (opts?.status) qs.set("status", opts.status);
  const res = await fetch(`${base}/hooks/shipping/list?${qs}`, {
    headers: {
      "x-perfumas-internal-secret": secret,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    orders?: unknown[];
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
}) {
  const meta: Record<string, unknown> = {
    shipping_status: input.shippingStatus || "dispatched",
    shipping_dispatched_at: new Date().toISOString(),
  };
  if (input.trackingNumber != null) meta.tracking_number = input.trackingNumber;
  if (input.labelUrl != null) meta.label_url = input.labelUrl;
  return pushShippingMetadata(input.orderId, meta);
}
