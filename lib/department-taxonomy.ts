/**
 * Taxonomy helpers for Hogar / Accesorios filters (from product titles).
 */

import { normalizeText } from "./house-groups";

export type PriceBand = "all" | "lt10" | "10to30" | "30to60" | "gt60";

export const PRICE_BANDS: { id: PriceBand; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "lt10", label: "Hasta $10.000" },
  { id: "10to30", label: "$10.000 – $30.000" },
  { id: "30to60", label: "$30.000 – $60.000" },
  { id: "gt60", label: "Más de $60.000" },
];

export function matchesPriceBand(price: number, band: PriceBand): boolean {
  switch (band) {
    case "lt10":
      return price < 10000;
    case "10to30":
      return price >= 10000 && price < 30000;
    case "30to60":
      return price >= 30000 && price < 60000;
    case "gt60":
      return price >= 60000;
    default:
      return true;
  }
}

export type HogarKind =
  | "splash"
  | "crema"
  | "aromatizantes"
  | "aseo"
  | "empaques"
  | "cuidado"
  | "otro";

export const HOGAR_KINDS: { id: HogarKind | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "splash", label: "Splash" },
  { id: "crema", label: "Crema" },
  { id: "aromatizantes", label: "Aromatizantes" },
  { id: "aseo", label: "Productos de aseo" },
  { id: "empaques", label: "Envases y empaques" },
  { id: "cuidado", label: "Cuidado personal" },
];

export function classifyHogar(title: string, category?: string): HogarKind {
  const t = normalizeText(title);
  const c = normalizeText(category || "");

  // Kids / perfume SKUs often live in the aseo Excel sheet — route them out of aseo.
  if (/splash/.test(t)) return "splash";
  if (/perfume\s*(caja|tubo)|perfume.*(nino|nina)|(nino|nina).*perfume/.test(t)) {
    return "cuidado";
  }
  if (/crema/.test(t) && !/envase crema/.test(t)) return "crema";

  if (
    /jabon|vinagre|desmanch|suavizante|limpia pisos|desengrasante|lavaloza|lavadora/.test(t) ||
    (c === "aseo" && !/perfume|splash|nino|nina/.test(t))
  ) {
    return "aseo";
  }
  if (
    /agua de linos|esencial ambiental|aromat|ambient|gotero/.test(t) ||
    c === "ambientales"
  ) {
    return "aromatizantes";
  }
  if (
    /valvula|envase|caja |bala plastica|empaque/.test(t) ||
    c === "empaques"
  ) {
    return "empaques";
  }
  if (/desodorante|perfume caja|perfume tubo/.test(t) || c === "cuidado") {
    return "cuidado";
  }
  return "otro";
}

export type AccesorioKind =
  | "anillo"
  | "arete"
  | "candonga"
  | "collar"
  | "pearcing"
  | "pulsera"
  | "topo"
  | "set"
  | "tobillera"
  | "marroquineria"
  | "otro";

export const ACCESORIO_KINDS: { id: AccesorioKind | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "anillo", label: "Anillos" },
  { id: "arete", label: "Aretes" },
  { id: "candonga", label: "Candongas" },
  { id: "collar", label: "Collares / cadenas" },
  { id: "pearcing", label: "Piercings" },
  { id: "pulsera", label: "Pulseras / manillas" },
  { id: "topo", label: "Topos / earcuffs" },
  { id: "set", label: "Dúos / tríos" },
  { id: "tobillera", label: "Tobilleras" },
  { id: "marroquineria", label: "Marroquinería" },
];

export function classifyAccesorio(title: string, category?: string): AccesorioKind {
  const t = normalizeText(title);
  const c = normalizeText(category || "");

  // Excel sheet category is the source of truth for bags/belts vs jewelry.
  if (c === "marroquineria") return "marroquineria";
  if (
    /cosmetiqu|cartuchera|billetera|cinturon|monedero|maletin|portadocumentos/.test(t)
  ) {
    return "marroquineria";
  }

  if (/anillo|argolla/.test(t)) return "anillo";
  if (/candonga/.test(t)) return "candonga";
  if (/arete/.test(t)) return "arete";
  if (/pearcing|piercing|simulador expansion/.test(t)) return "pearcing";
  if (/topo|earcut/.test(t)) return "topo";
  if (/duo |trio |relicario/.test(t)) return "set";
  if (/cadena|collar/.test(t)) return "collar";
  if (/pulsera|manilla/.test(t)) return "pulsera";
  if (/tobillera/.test(t)) return "tobillera";
  return "otro";
}

export type AccesorioMaterial =
  | "acero"
  | "covergold"
  | "rodio"
  | "plata"
  | "cuero"
  | "sintetico"
  | "vinilo"
  | "metal"
  | "otro";

export const ACCESORIO_MATERIALS: {
  id: AccesorioMaterial | "all";
  label: string;
}[] = [
  { id: "all", label: "Todos los materiales" },
  { id: "acero", label: "Acero" },
  { id: "covergold", label: "Covergold" },
  { id: "rodio", label: "Rodio" },
  { id: "plata", label: "Plata" },
  { id: "cuero", label: "Cuero" },
  { id: "sintetico", label: "Sintético" },
  { id: "vinilo", label: "Vinilo" },
  { id: "metal", label: "Metal" },
];

export function classifyMaterial(title: string): AccesorioMaterial {
  const t = normalizeText(title);
  if (/covergold/.test(t)) return "covergold";
  if (/rodio|rodinado/.test(t)) return "rodio";
  if (/plata/.test(t)) return "plata";
  if (/acero/.test(t)) return "acero";
  if (/cuero/.test(t)) return "cuero";
  if (/sintetic/.test(t)) return "sintetico";
  if (/vinilo/.test(t)) return "vinilo";
  if (/metal/.test(t)) return "metal";
  return "otro";
}
