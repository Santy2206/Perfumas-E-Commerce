import { HUB_ADDRESSES, normalizeKey, type DispatchHub } from "../hub-routing";
import type { CreateShipmentInput, CreateShipmentResult } from "../types";

const DEFAULT_SERVICE_TYPE_ID = "5c71b03a58b9ba10fa6393cf";
const DEFAULT_SIZE_CD = 1;

const PICAP_CITY_CODES: Record<string, string> = {
  bogota: "bogota",
  "bogota dc": "bogota",
  "bogota d c": "bogota",
  medellin: "medellin",
  barranquilla: "barranquilla",
  cali: "cali",
  bucaramanga: "bucaramanga",
  guatemala: "guatemala",
};

type HubCoords = { lat: number; lon: number };

function piboxConfigured() {
  return Boolean(
    process.env.PIBOX_API_URL?.trim() && process.env.PIBOX_API_KEY?.trim()
  );
}

function parseCoord(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function hubCoords(hub: DispatchHub): HubCoords | null {
  const prefix = hub === "fontibon" ? "PIBOX_FONTIBON" : "PIBOX_BONANZA";
  const lat = parseCoord(process.env[`${prefix}_LAT`]);
  const lon = parseCoord(process.env[`${prefix}_LON`]);
  if (lat == null || lon == null) return null;
  return { lat, lon };
}

function serviceTypeId() {
  return (
    process.env.PIBOX_SERVICE_TYPE_ID?.trim() || DEFAULT_SERVICE_TYPE_ID
  );
}

function defaultSizeCd() {
  const raw = process.env.PIBOX_DEFAULT_SIZE_CD?.trim();
  if (!raw) return DEFAULT_SIZE_CD;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULT_SIZE_CD;
}

function cityCodeForDestination(city?: string | null): string | undefined {
  if (!city) return undefined;
  const key = normalizeKey(city);
  if (PICAP_CITY_CODES[key]) return PICAP_CITY_CODES[key];
  for (const [pattern, code] of Object.entries(PICAP_CITY_CODES)) {
    if (key.startsWith(`${pattern} `) || key === pattern) return code;
  }
  return undefined;
}

function digitsPhone(phone?: string | null): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length > 10) return digits.slice(2);
  return digits || "3000000000";
}

type PicapPackage = {
  id?: string;
  tracking_link?: string | null;
  status_cd?: number;
};

type PicapStop = {
  packages?: PicapPackage[];
};

type PicapBooking = {
  id?: string;
  _id?: string;
  status_cd?: number;
  pickup_validation_code?: string | null;
  stops?: PicapStop[];
  mssg?: string;
};

function bookingId(json: PicapBooking): string | null {
  return json.id || json._id || null;
}

function firstPackage(json: PicapBooking): PicapPackage | null {
  for (const stop of json.stops || []) {
    for (const pkg of stop.packages || []) {
      if (pkg) return pkg;
    }
  }
  return null;
}

/**
 * Create a Picap (Pibox) booking via official API:
 * POST {PIBOX_API_URL}/api/third/bookings?t={PIBOX_API_KEY}
 */
export async function createPiboxShipment(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  if (!piboxConfigured()) {
    return {
      ok: false,
      provider: "pibox",
      status: "pending_dispatch",
      message: "Pibox API no configurada (PIBOX_API_URL / PIBOX_API_KEY)",
    };
  }

  const coords = hubCoords(input.hub);
  if (!coords) {
    const prefix =
      input.hub === "fontibon" ? "PIBOX_FONTIBON" : "PIBOX_BONANZA";
    return {
      ok: false,
      provider: "pibox",
      status: "pending_dispatch",
      message: `Faltan ${prefix}_LAT / ${prefix}_LON`,
    };
  }

  const base = process.env.PIBOX_API_URL!.replace(/\/$/, "");
  const token = process.env.PIBOX_API_KEY!.trim();
  const hubMeta = HUB_ADDRESSES[input.hub];
  const cityCode = cityCodeForDestination(input.customer.city);
  const declaredSubUnits = Math.max(
    10000,
    Math.round(input.declaredValueCents ?? 5000000)
  );

  const stop: Record<string, unknown> = {
    address: input.customer.address,
    secondary_address: [
      input.customer.locality,
      input.customer.department,
    ]
      .filter(Boolean)
      .join(" · ") || undefined,
    customer: {
      name: input.customer.name,
      country_code: "57",
      phone: digitsPhone(input.customer.phone),
      email: input.customer.email || undefined,
    },
    packages: [
      {
        indications:
          input.indications ||
          `Pedido Perfumas ${input.reference}. Hub ${hubMeta.label}.`,
        declared_value: {
          sub_units: declaredSubUnits,
          currency: "COP",
        },
        reference: String(input.reference),
        counter_delivery: false,
        collected_value: null,
        size_cd: defaultSizeCd(),
      },
    ],
  };

  const booking: Record<string, unknown> = {
    address: hubMeta.address,
    secondary_address: `Perfumas ${hubMeta.label}`,
    lat: coords.lat,
    lon: coords.lon,
    requested_service_type_id: serviceTypeId(),
    return_to_origin: false,
    requires_a_driver_with_base_money: false,
    scheduled_at: null,
    stops: [stop],
  };

  if (cityCode) {
    booking.city_code = cityCode;
  }

  try {
    const url = `${base}/api/third/bookings?t=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ booking }),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => ({}))) as PicapBooking;

    if (!res.ok) {
      return {
        ok: false,
        provider: "pibox",
        status: "pending_dispatch",
        message: json.mssg || `Picap HTTP ${res.status}`,
      };
    }

    const externalId = bookingId(json);
    const pkg = firstPackage(json);
    const trackingLink = pkg?.tracking_link || null;

    return {
      ok: true,
      provider: "pibox",
      trackingNumber: trackingLink || externalId,
      labelUrl: trackingLink,
      externalId,
      status: "label_created",
      pickupValidationCode: json.pickup_validation_code || null,
      packageId: pkg?.id || null,
      message: externalId
        ? `Picap booking ${externalId}`
        : "Picap booking creado",
    };
  } catch (error) {
    return {
      ok: false,
      provider: "pibox",
      status: "pending_dispatch",
      message:
        error instanceof Error ? error.message : "Picap request failed",
    };
  }
}

export function isPiboxConfigured() {
  return piboxConfigured();
}

/** Map Picap booking status_cd → our ShippingStatus */
export function mapPicapBookingStatus(
  statusCd: number
): import("../types").ShippingStatus | null {
  switch (statusCd) {
    case 0:
      return "label_created"; // buscando conductor
    case 1:
    case 5:
      return "dispatched";
    case 6:
    case 7:
      return "in_transit";
    case 4:
      return "delivered";
    case 100:
    case 101:
    case 102:
      return "failed";
    case 109:
      return "label_created";
    default:
      return null;
  }
}

/** Map Picap package status_cd → our ShippingStatus */
export function mapPicapPackageStatus(
  statusCd: number
): import("../types").ShippingStatus | null {
  switch (statusCd) {
    case 0:
      return "label_created";
    case 1:
      return "in_transit";
    case 2:
      return "delivered";
    case 3:
    case 4:
    case 5:
      return "failed";
    case 6:
      return "in_transit";
    default:
      return null;
  }
}
