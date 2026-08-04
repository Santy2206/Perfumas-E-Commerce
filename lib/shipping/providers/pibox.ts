import { HUB_ADDRESSES, type DispatchHub } from "../hub-routing";
import type { CreateShipmentInput, CreateShipmentResult } from "../types";

function piboxConfigured() {
  return Boolean(
    process.env.PIBOX_API_URL?.trim() && process.env.PIBOX_API_KEY?.trim()
  );
}

function originIdForHub(hub: DispatchHub): string | undefined {
  if (hub === "fontibon") return process.env.PIBOX_ORIGIN_FONTIBON_ID;
  return process.env.PIBOX_ORIGIN_BONANZA_ID;
}

/**
 * Phase-2 Pibox adapter. When env vars are missing, callers should use manual.
 * Payload follows a conventional REST shape; adjust field names once Pibox
 * delivers official API docs.
 */
export async function createPiboxShipment(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  if (!piboxConfigured()) {
    return {
      ok: false,
      provider: "pibox",
      status: "pending_dispatch",
      message: "Pibox API no configurada",
    };
  }

  const base = process.env.PIBOX_API_URL!.replace(/\/$/, "");
  const originId = originIdForHub(input.hub);
  const hubMeta = HUB_ADDRESSES[input.hub];

  try {
    const res = await fetch(`${base}/shipments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PIBOX_API_KEY}`,
      },
      body: JSON.stringify({
        reference: input.reference,
        origin_id: originId,
        origin: {
          hub: input.hub,
          name: `Perfumas ${hubMeta.label}`,
          address: hubMeta.address,
          city: "Bogotá",
          country: "CO",
        },
        destination: {
          name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone,
          address: input.customer.address,
          city: input.customer.city,
          locality: input.customer.locality,
          department: input.customer.department,
          postal_code: input.customer.postalCode,
          country: "CO",
        },
        weight_kg: input.weightKg ?? 0.5,
        packages: [{ weight_kg: input.weightKg ?? 0.5 }],
      }),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => ({}))) as {
      tracking_number?: string;
      trackingNumber?: string;
      label_url?: string;
      labelUrl?: string;
      id?: string;
      shipment_id?: string;
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        provider: "pibox",
        status: "pending_dispatch",
        message:
          json.message || json.error || `Pibox HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      provider: "pibox",
      trackingNumber: json.tracking_number || json.trackingNumber || null,
      labelUrl: json.label_url || json.labelUrl || null,
      externalId: json.id || json.shipment_id || null,
      status: "label_created",
    };
  } catch (error) {
    return {
      ok: false,
      provider: "pibox",
      status: "pending_dispatch",
      message:
        error instanceof Error ? error.message : "Pibox request failed",
    };
  }
}

export function isPiboxConfigured() {
  return piboxConfigured();
}
