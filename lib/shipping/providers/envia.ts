import { HUB_ADDRESSES, normalizeKey, type DispatchHub } from "../hub-routing";
import type { CreateShipmentInput, CreateShipmentResult, ShippingStatus } from "../types";

/**
 * Envia.com multi-carrier API (national Colombia).
 * Docs: https://docs.envia.com/
 *
 * Env:
 *   ENVIA_TOKEN                 — Bearer API key (production or sandbox)
 *   ENVIA_API_URL               — default https://api.envia.com
 *   ENVIA_QUERIES_URL           — default https://queries.envia.com
 *   ENVIA_DEFAULT_CARRIERS      — comma list to try, e.g. coordinadora,servientrega
 *   ENVIA_ORIGIN_*              — Fontibón warehouse address overrides
 */

type EnviaAddress = {
  name: string;
  company?: string;
  phone: string;
  email?: string;
  street: string;
  number?: string;
  district?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
};

type EnviaRateRow = {
  carrier?: string;
  service?: string;
  serviceDescription?: string;
  totalPrice?: number | string;
  currency?: string;
  deliveryEstimate?: string;
};

type EnviaGenerateRow = {
  carrier?: string;
  service?: string;
  shipmentId?: number | string;
  trackingNumber?: string;
  trackUrl?: string;
  label?: string;
  totalPrice?: number;
  currency?: string;
};

/** Colombia department / city → Envia state code (ISO-ish). Override via ENVIA_STATE_MAP JSON if needed. */
const DEFAULT_STATE_MAP: Record<string, string> = {
  bogota: "DC",
  "bogota dc": "DC",
  "bogota d c": "DC",
  cundinamarca: "CUN",
  antioquia: "ANT",
  valle: "VAC",
  "valle del cauca": "VAC",
  atlantico: "ATL",
  bolivar: "BOL",
  santander: "SAN",
  "norte de santander": "NSA",
  tolima: "TOL",
  risaralda: "RIS",
  caldas: "CAL",
  quindio: "QUI",
  magdalena: "MAG",
  cesar: "CES",
  cordoba: "COR",
  sucre: "SUC",
  narino: "NAR",
  cauca: "CAU",
  huila: "HUI",
  meta: "MET",
  boyaca: "BOY",
  "la guajira": "LAG",
  guajira: "LAG",
  choco: "CHO",
  caqueta: "CAQ",
  putumayo: "PUT",
  arauca: "ARA",
  casanare: "CAS",
  vichada: "VID",
  guaviare: "GUV",
  guainia: "GUA",
  vaupes: "VAU",
  amazonas: "AMA",
  "san andres": "SAP",
  "san andres y providencia": "SAP",
};

export function isEnviaConfigured(): boolean {
  return Boolean(process.env.ENVIA_TOKEN?.trim());
}

function apiBase() {
  return (
    process.env.ENVIA_API_URL?.replace(/\/$/, "") || "https://api.envia.com"
  );
}

function queriesBase() {
  return (
    process.env.ENVIA_QUERIES_URL?.replace(/\/$/, "") ||
    "https://queries.envia.com"
  );
}

function token() {
  return process.env.ENVIA_TOKEN?.trim() || "";
}

function carriersToTry(): string[] {
  const raw =
    process.env.ENVIA_DEFAULT_CARRIERS?.trim() ||
    "coordinadora,servientrega,interrapidisimo,envia,tcc";
  return raw
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

function phoneDigits(phone?: string | null): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length > 10) digits = digits.slice(2);
  if (digits.length < 7) return "3000000000";
  return digits;
}

function resolveStateCode(
  department?: string | null,
  city?: string | null
): string {
  const custom = process.env.ENVIA_ORIGIN_STATE?.trim();
  let map = DEFAULT_STATE_MAP;
  try {
    const raw = process.env.ENVIA_STATE_MAP?.trim();
    if (raw) map = { ...DEFAULT_STATE_MAP, ...JSON.parse(raw) };
  } catch {
    /* ignore bad JSON */
  }
  const deptKey = normalizeKey(department || "");
  if (deptKey && map[deptKey]) return map[deptKey];
  const cityKey = normalizeKey(city || "");
  if (cityKey && map[cityKey]) return map[cityKey];
  if (cityKey.includes("bogota")) return "DC";
  // Fallback: first 3 letters upper — Ops should set shipping_department
  if (deptKey) return deptKey.slice(0, 3).toUpperCase();
  return custom || "DC";
}

function originAddress(hub: DispatchHub): EnviaAddress {
  const hubInfo = HUB_ADDRESSES[hub] || HUB_ADDRESSES.fontibon;
  return {
    name: process.env.ENVIA_ORIGIN_NAME?.trim() || "Perfumas",
    company: process.env.ENVIA_ORIGIN_COMPANY?.trim() || "Perfumas",
    phone: phoneDigits(process.env.ENVIA_ORIGIN_PHONE || "3000000000"),
    email: process.env.ENVIA_ORIGIN_EMAIL?.trim() || "pedidos@perfumas.com.co",
    street:
      process.env.ENVIA_ORIGIN_STREET?.trim() || hubInfo.address.split(",")[0],
    number: process.env.ENVIA_ORIGIN_NUMBER?.trim() || "S/N",
    district: process.env.ENVIA_ORIGIN_DISTRICT?.trim() || hubInfo.label,
    city: process.env.ENVIA_ORIGIN_CITY?.trim() || "Bogota",
    state: process.env.ENVIA_ORIGIN_STATE?.trim() || "DC",
    country: "CO",
    postalCode: process.env.ENVIA_ORIGIN_POSTAL_CODE?.trim() || "110911",
  };
}

function destinationAddress(input: CreateShipmentInput): EnviaAddress {
  const street = input.customer.address.trim();
  return {
    name: input.customer.name || "Cliente",
    phone: phoneDigits(input.customer.phone),
    email: input.customer.email || undefined,
    street: street || "Direccion no indicada",
    number: "S/N",
    district: input.customer.locality || undefined,
    city: (input.customer.city || "Bogota").trim(),
    state: resolveStateCode(
      input.customer.department,
      input.customer.city
    ),
    country: "CO",
    postalCode: (input.customer.postalCode || "000000").trim() || "000000",
  };
}

function packagePayload(input: CreateShipmentInput) {
  const weight = Math.max(0.2, Number(input.weightKg) || 0.5);
  const declared =
    typeof input.declaredValueCents === "number" && input.declaredValueCents > 0
      ? Math.round(input.declaredValueCents / 100)
      : 50000;
  return {
    type: "box",
    content: "Perfumeria / fragancias",
    amount: 1,
    declaredValue: declared,
    weight,
    weightUnit: "KG",
    lengthUnit: "CM",
    dimensions: {
      length: Number(process.env.ENVIA_PKG_LENGTH || 25),
      width: Number(process.env.ENVIA_PKG_WIDTH || 15),
      height: Number(process.env.ENVIA_PKG_HEIGHT || 10),
    },
  };
}

async function enviaFetch<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; json: T; raw: string }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const raw = await res.text();
  let json = {} as T;
  try {
    json = JSON.parse(raw) as T;
  } catch {
    /* non-json */
  }
  return { ok: res.ok, status: res.status, json, raw };
}

export async function listEnviaCarriersCO(): Promise<string[]> {
  if (!isEnviaConfigured()) return [];
  const { ok, json } = await enviaFetch<{ data?: Array<{ carrier?: string }> }>(
    `${queriesBase()}/carrier?country_code=CO`
  );
  if (!ok || !Array.isArray(json.data)) return carriersToTry();
  return json.data
    .map((c) => String(c.carrier || "").toLowerCase())
    .filter(Boolean);
}

type PricedRate = {
  carrier: string;
  service: string;
  serviceDescription?: string;
  totalPrice: number;
};

function parseRatePrice(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

async function quoteCarrierRates(
  origin: EnviaAddress,
  destination: EnviaAddress,
  pkg: ReturnType<typeof packagePayload>,
  carrier: string
): Promise<PricedRate[]> {
  const { ok, json } = await enviaFetch<{
    data?: EnviaRateRow[];
    meta?: string;
    error?: { message?: string };
  }>(`${apiBase()}/ship/rate/`, {
    method: "POST",
    body: JSON.stringify({
      origin,
      destination,
      packages: [pkg],
      shipment: { type: 1, carrier },
    }),
  });
  if (!ok || !Array.isArray(json.data)) return [];

  const priced: PricedRate[] = [];
  for (const row of json.data) {
    const service = row.service?.trim();
    if (!service) continue;
    const totalPrice = parseRatePrice(row.totalPrice);
    if (totalPrice == null) continue;
    priced.push({
      carrier: (row.carrier || carrier).toLowerCase(),
      service,
      serviceDescription: row.serviceDescription,
      totalPrice,
    });
  }
  return priced;
}

/**
 * Quote all carriers, pick cheapest rate, then generate that label.
 * If generate fails for the cheapest, tries the next cheapest.
 */
export async function createEnviaShipment(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  if (!isEnviaConfigured()) {
    return {
      ok: false,
      provider: "envia",
      status: "pending_dispatch",
      message: "Envia no configurada (ENVIA_TOKEN)",
    };
  }

  const origin = originAddress(input.hub);
  const destination = destinationAddress(input);
  if (!destination.postalCode || destination.postalCode === "000000") {
    return {
      ok: false,
      provider: "envia",
      status: "pending_dispatch",
      message:
        "Falta código postal del destino. Pídelo en checkout o edita el pedido.",
    };
  }

  const pkg = packagePayload(input);
  let carriers = carriersToTry();
  try {
    const live = await listEnviaCarriersCO();
    if (live.length) {
      const set = new Set(live);
      carriers = [
        ...carriers.filter((c) => set.has(c)),
        ...live.filter((c) => !carriers.includes(c)),
      ];
    }
  } catch {
    /* keep defaults */
  }

  const quoteErrors: string[] = [];
  const quoteResults = await Promise.all(
    carriers.map(async (carrier) => {
      try {
        const rates = await quoteCarrierRates(origin, destination, pkg, carrier);
        if (!rates.length) quoteErrors.push(`${carrier}: sin tarifa`);
        return rates;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "error";
        quoteErrors.push(`${carrier}: ${msg}`);
        return [] as PricedRate[];
      }
    })
  );

  const ranked = quoteResults
    .flat()
    .sort((a, b) => a.totalPrice - b.totalPrice);

  if (!ranked.length) {
    return {
      ok: false,
      provider: "envia",
      status: "pending_dispatch",
      message: `Envia sin tarifas: ${quoteErrors.slice(0, 4).join(" | ") || "ningún carrier respondió"}`,
    };
  }

  const generateErrors: string[] = [];
  for (const rate of ranked) {
    try {
      const { ok, json, status, raw } = await enviaFetch<{
        data?: EnviaGenerateRow[];
        error?: { message?: string };
      }>(`${apiBase()}/ship/generate/`, {
        method: "POST",
        body: JSON.stringify({
          origin,
          destination,
          packages: [pkg],
          shipment: {
            type: 1,
            carrier: rate.carrier,
            service: rate.service,
          },
          settings: {
            currency: "COP",
            printFormat: "PDF",
            printSize: "STOCK_4X6",
            comments: `Pedido ${input.reference}`,
          },
        }),
      });

      const row = json.data?.[0];
      if (!ok || !row?.trackingNumber) {
        const msg =
          json.error?.message ||
          raw.slice(0, 180) ||
          `HTTP ${status}`;
        generateErrors.push(`${rate.carrier}/${rate.service}: ${msg}`);
        continue;
      }

      const priceLabel = Math.round(rate.totalPrice).toLocaleString("es-CO");
      return {
        ok: true,
        provider: "envia",
        status: "label_created",
        trackingNumber: row.trackingNumber,
        labelUrl: row.label || row.trackUrl || null,
        externalId: row.shipmentId != null ? String(row.shipmentId) : null,
        message: `Envia · ${rate.carrier} · ${rate.serviceDescription || rate.service} · $${priceLabel} (más económico)`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "error";
      generateErrors.push(`${rate.carrier}/${rate.service}: ${msg}`);
    }
  }

  return {
    ok: false,
    provider: "envia",
    status: "pending_dispatch",
    message: `Envia cotizó pero no pudo generar: ${generateErrors.slice(0, 4).join(" | ")}`,
  };
}

/** Map Envia tracking webhook status → our ShippingStatus */
export function mapEnviaTrackingStatus(
  status?: string | null
): ShippingStatus | null {
  const s = String(status || "")
    .toLowerCase()
    .trim();
  if (!s) return null;
  if (
    s.includes("deliver") ||
    s.includes("entreg") ||
    s === "delivered" ||
    s === "entregado"
  ) {
    return "delivered";
  }
  if (
    s.includes("transit") ||
    s.includes("tránsito") ||
    s.includes("transito") ||
    s.includes("picked") ||
    s.includes("recolect") ||
    s.includes("en camino") ||
    s.includes("out for delivery")
  ) {
    return "in_transit";
  }
  if (
    s.includes("fail") ||
    s.includes("return") ||
    s.includes("cancel") ||
    s.includes("exception") ||
    s.includes("devuelto")
  ) {
    return "failed";
  }
  if (
    s.includes("label") ||
    s.includes("created") ||
    s.includes("cread") ||
    s.includes("ready")
  ) {
    return "label_created";
  }
  return "in_transit";
}

/** Register tracking webhook (type_id 3) against production Queries API. */
export async function registerEnviaTrackingWebhook(
  url: string
): Promise<{ ok: boolean; id?: number; message?: string }> {
  if (!isEnviaConfigured()) {
    return { ok: false, message: "ENVIA_TOKEN missing" };
  }
  const { ok, json, raw, status } = await enviaFetch<{
    meta?: string;
    data?: { id?: number };
    error?: { message?: string };
  }>(`${queriesBase()}/webhooks`, {
    method: "POST",
    body: JSON.stringify({
      type_id: 3,
      url,
      active: 1,
    }),
  });
  if (!ok) {
    return {
      ok: false,
      message: json.error?.message || raw.slice(0, 200) || `HTTP ${status}`,
    };
  }
  return { ok: true, id: json.data?.id, message: json.meta };
}
