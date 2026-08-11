/**
 * Dual-hub dispatch routing for Bogotá / Colombia.
 * Shared stock: hub only chooses which store prepares and hands off to courier.
 */

export type DispatchHub = "fontibon" | "bonanza";

export type HubResolution = {
  hub: DispatchHub;
  mode: "pickup" | "delivery_bogota" | "delivery_nacional";
  label: string;
  address: string;
  reason: string;
};

export const HUB_ADDRESSES: Record<
  DispatchHub,
  { label: string; address: string }
> = {
  fontibon: {
    label: "Fontibón",
    address: "Calle 18 #103a-26, Fontibón, Bogotá",
  },
  bonanza: {
    label: "Bonanza",
    address: "Av. Calle 72 #70-90, Bonanza, Bogotá",
  },
};

/** Official Bogotá localities (selector). */
export const BOGOTA_LOCALITIES = [
  "Antonio Nariño",
  "Barrios Unidos",
  "Bosa",
  "Chapinero",
  "Ciudad Bolívar",
  "Engativá",
  "Fontibón",
  "Kennedy",
  "La Candelaria",
  "Los Mártires",
  "Puente Aranda",
  "Rafael Uribe Uribe",
  "San Cristóbal",
  "Santa Fe",
  "Suba",
  "Sumapaz",
  "Teusaquillo",
  "Tunjuelito",
  "Usaquén",
  "Usme",
] as const;

export type BogotaLocality = (typeof BOGOTA_LOCALITIES)[number];

/** North / northeast → Bonanza */
const BONANZA_LOCALITIES = new Set(
  [
    "chapinero",
    "usaquen",
    "suba",
    "barrios unidos",
    "engativa",
    "teusaquillo",
  ].map(normalizeKey)
);

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBogotaCity(city?: string | null): boolean {
  if (!city) return false;
  const key = normalizeKey(city);
  return (
    key === "bogota" ||
    key === "bogota dc" ||
    key === "bogota d c" ||
    key.startsWith("bogota ")
  );
}

export function resolveDispatchHub(input: {
  shippingMethodId: string;
  city?: string | null;
  locality?: string | null;
}): HubResolution {
  const method = input.shippingMethodId || "";

  if (method === "pickup-fontibon") {
    return {
      hub: "fontibon",
      mode: "pickup",
      ...HUB_ADDRESSES.fontibon,
      reason: "Cliente eligió recogida en Fontibón",
    };
  }
  if (method === "pickup-bonanza") {
    return {
      hub: "bonanza",
      mode: "pickup",
      ...HUB_ADDRESSES.bonanza,
      reason: "Cliente eligió recogida en Bonanza",
    };
  }

  if (method === "delivery-nacional" || !isBogotaCity(input.city)) {
    return {
      hub: "fontibon",
      mode: "delivery_nacional",
      ...HUB_ADDRESSES.fontibon,
      reason: "Envío nacional / fuera de Bogotá → hub Fontibón",
    };
  }

  const localityKey = normalizeKey(input.locality || "");
  if (localityKey && BONANZA_LOCALITIES.has(localityKey)) {
    return {
      hub: "bonanza",
      mode: "delivery_bogota",
      ...HUB_ADDRESSES.bonanza,
      reason: `Localidad ${input.locality} → hub Bonanza (norte/nororiente)`,
    };
  }

  return {
    hub: "fontibon",
    mode: "delivery_bogota",
    ...HUB_ADDRESSES.fontibon,
    reason: localityKey
      ? `Localidad ${input.locality} → hub Fontibón (sur/occidente/default)`
      : "Bogotá sin localidad → hub Fontibón por defecto",
  };
}
