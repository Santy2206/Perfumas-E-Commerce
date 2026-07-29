/**
 * Full retail catalog spanning all four departments.
 * Used when Medusa is offline and as the seed source for Excel→Medusa import.
 */

import type { CatalogProduct } from "./catalog-types";
import {
  ALCOHOL_OPTIONS,
  BOTTLES,
  CROSS_SELL_PRODUCTS,
  FRAGRANCES,
} from "./mock-data";

const WHOLESALE_DISCOUNT = 0.2; // 20% off retail for emprendedores (default until Excel has columns)
const DEFAULT_MOQ = 6;

function toHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Pheromone add-ons for custom builds + insumos. */
export const PHEROMONES: CatalogProduct[] = [
  {
    id: "ph-femenina",
    handle: "feromona-femenina",
    title: "Feromona Femenina",
    description: "Aditivo de feromonas para fragancias dama.",
    department: "insumos",
    category: "feromonas",
    price: 5000,
    wholesalePrice: Math.round(5000 * (1 - WHOLESALE_DISCOUNT)),
    minQty: DEFAULT_MOQ,
    tags: ["insumo", "feromona"],
  },
  {
    id: "ph-masculina",
    handle: "feromona-masculina",
    title: "Feromona Masculina",
    description: "Aditivo de feromonas para fragancias caballero.",
    department: "insumos",
    category: "feromonas",
    price: 5000,
    wholesalePrice: Math.round(5000 * (1 - WHOLESALE_DISCOUNT)),
    minQty: DEFAULT_MOQ,
    tags: ["insumo", "feromona"],
  },
  {
    id: "ph-unisex",
    handle: "feromona-unisex",
    title: "Feromona Unisex",
    description: "Aditivo de feromonas unisex.",
    department: "insumos",
    category: "feromonas",
    price: 5500,
    wholesalePrice: Math.round(5500 * (1 - WHOLESALE_DISCOUNT)),
    minQty: DEFAULT_MOQ,
    tags: ["insumo", "feromona"],
  },
];

/** Extra home-care SKUs beyond the cross-sell sample. */
const HOME_CARE_EXTRA: CatalogProduct[] = [
  {
    id: "hc-room-spray-lavanda",
    handle: "room-spray-lavanda-125",
    title: "Room Spray Lavanda 125 ml",
    description: "Ambientador en spray para espacios interiores.",
    department: "hogar",
    category: "room-spray",
    price: 12000,
    tags: ["hogar", "ambientales"],
  },
  {
    id: "hc-room-spray-citrico",
    handle: "room-spray-citrico-125",
    title: "Room Spray Cítrico 125 ml",
    description: "Ambientador cítrico fresco para el hogar.",
    department: "hogar",
    category: "room-spray",
    price: 12000,
    tags: ["hogar", "ambientales"],
  },
  {
    id: "hc-humidificador-jazmin",
    handle: "esencia-humidificador-jazmin",
    title: "Esencia Humidificador Jazmín",
    description: "Esencia concentrada para humidificadores.",
    department: "hogar",
    category: "humidificador",
    price: 8000,
    tags: ["hogar", "humidificador"],
  },
  {
    id: "hc-humidificador-vainilla",
    handle: "esencia-humidificador-vainilla",
    title: "Esencia Humidificador Vainilla",
    description: "Esencia concentrada para humidificadores.",
    department: "hogar",
    category: "humidificador",
    price: 8000,
    tags: ["hogar", "humidificador"],
  },
  {
    id: "hc-desodorante-dama",
    handle: "desodorante-dama",
    title: "Desodorante Dama",
    description: "Desodorante con fragancia Perfumas.",
    department: "hogar",
    category: "desodorante",
    price: 15000,
    tags: ["hogar", "cuidado"],
  },
  {
    id: "hc-desodorante-caballero",
    handle: "desodorante-caballero",
    title: "Desodorante Caballero",
    description: "Desodorante con fragancia Perfumas.",
    department: "hogar",
    category: "desodorante",
    price: 15000,
    tags: ["hogar", "cuidado"],
  },
];

const ACCESSORIES_EXTRA: CatalogProduct[] = [
  {
    id: "acc-bolso-tote",
    handle: "bolso-tote-cuero",
    title: "Bolso Tote Cuero",
    description: "Bolso tote en cuero sintético de lujo.",
    department: "accesorios",
    category: "bolsos",
    price: 85000,
    tags: ["accesorios", "moda"],
  },
  {
    id: "acc-cinturon-caballero",
    handle: "cinturon-cuero-caballero",
    title: "Cinturón Cuero Caballero",
    description: "Cinturón de cuero genuino.",
    department: "accesorios",
    category: "cinturones",
    price: 45000,
    tags: ["accesorios", "moda"],
  },
];

function fragranceProducts(): CatalogProduct[] {
  return FRAGRANCES.map((f) => ({
    id: f.id,
    handle: toHandle(f.contratipo),
    title: f.contratipo,
    description: `Fragancia inspirada en ${f.house}. Precio por gramo sin envase.`,
    department: "perfumeria" as const,
    category: f.group,
    price: f.pricePerGram,
    wholesalePrice: Math.round(f.pricePerGram * (1 - WHOLESALE_DISCOUNT)),
    minQty: 30, // grams MOQ for wholesale essences
    imageUrl: f.imageUrl,
    metadata: {
      house: f.house,
      gender: f.gender,
      group: f.group,
      price_per_gram: f.pricePerGram,
      product_kind: "essence",
    },
    tags: ["fragancia", "esencia", f.gender],
  }));
}

function bottleProducts(): CatalogProduct[] {
  return BOTTLES.map((b) => ({
    id: b.id,
    handle: toHandle(b.name),
    title: b.name,
    description: `Envase ${b.qualityTier} · ${b.capacityMl} ml · cierre ${b.closure}`,
    department: "insumos" as const,
    category: "envases",
    price: b.price,
    wholesalePrice: Math.round(b.price * (1 - WHOLESALE_DISCOUNT)),
    minQty: DEFAULT_MOQ,
    imageUrl: b.imageUrl,
    metadata: {
      quality_tier: b.qualityTier,
      capacity_ml: b.capacityMl,
      closure: b.closure,
      matches_fragrance_ids: b.matchesFragranceIds ?? [],
      product_kind: "bottle",
    },
    tags: ["envase", "insumo", b.qualityTier],
  }));
}

function alcoholProducts(): CatalogProduct[] {
  return ALCOHOL_OPTIONS.map((a) => ({
    id: a.id,
    handle: toHandle(`${a.name}-${a.unit}`),
    title: `${a.name} ${a.unit}`,
    description: "Alcohol desodorizado especializado para perfumería.",
    department: "insumos" as const,
    category: "alcohol",
    price: a.price,
    wholesalePrice: Math.round(a.price * (1 - WHOLESALE_DISCOUNT)),
    minQty: DEFAULT_MOQ,
    metadata: { unit: a.unit, product_kind: "alcohol" },
    tags: ["alcohol", "insumo"],
  }));
}

function crossSellProducts(): CatalogProduct[] {
  return CROSS_SELL_PRODUCTS.map((p) => {
    const isHogar = p.category === "ambientales";
    return {
      id: p.id,
      handle: toHandle(p.name),
      title: p.name,
      department: (isHogar ? "hogar" : "accesorios") as CatalogProduct["department"],
      category: p.category,
      price: p.price,
      wholesalePrice: isHogar ? undefined : Math.round(p.price * (1 - WHOLESALE_DISCOUNT)),
      minQty: isHogar ? undefined : DEFAULT_MOQ,
      imageUrl: p.imageUrl,
      tags: [p.category],
    };
  });
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  ...fragranceProducts(),
  ...bottleProducts(),
  ...alcoholProducts(),
  ...PHEROMONES,
  ...crossSellProducts(),
  ...HOME_CARE_EXTRA,
  ...ACCESSORIES_EXTRA,
];

export const DEPARTMENTS: {
  id: CatalogProduct["department"];
  label: string;
  href: string;
  description: string;
}[] = [
  {
    id: "perfumeria",
    label: "Perfumería",
    href: "/tienda/perfumeria",
    description: "Crea tu fragancia personalizada o explora esencias inspiradas.",
  },
  {
    id: "insumos",
    label: "Insumos",
    href: "/tienda/insumos",
    description: "Esencias, envases, alcohol y feromonas para emprendedores.",
  },
  {
    id: "hogar",
    label: "Hogar y cuidado",
    href: "/tienda/hogar",
    description: "Room sprays, agua de linos, humidificadores y desodorantes.",
  },
  {
    id: "accesorios",
    label: "Accesorios",
    href: "/tienda/accesorios",
    description: "Bisutería, bolsos, billeteras y cinturones.",
  },
];

export const SHIPPING_METHODS = [
  {
    id: "pickup-fontibon",
    name: "Recoger en Fontibón",
    description: "Calle 18 #103a-26, Fontibón, Bogotá",
    price: 0,
  },
  {
    id: "pickup-bonanza",
    name: "Recoger en Bonanza",
    description: "Tienda Perfumas Bonanza, Bogotá",
    price: 0,
  },
  {
    id: "delivery-bogota",
    name: "Domicilio Bogotá",
    description: "Entrega en 1–2 días hábiles dentro de Bogotá",
    price: 8000,
  },
  {
    id: "delivery-nacional",
    name: "Envío nacional",
    description: "Envío a ciudades principales de Colombia (2–5 días)",
    price: 18000,
  },
];

export const PAYMENT_PROVIDERS = [
  {
    id: "wompi",
    name: "Wompi",
    description:
      "Tarjeta, PSE, Nequi — completa el pedido en Medusa; confirma pago en Admin / webhook",
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    description: "Próximamente — usa transferencia o Wompi por ahora",
  },
  {
    id: "transfer",
    name: "Transferencia bancaria",
    description: "Pago manual — confirmación por WhatsApp / Admin",
  },
];

export function getProductsByDepartment(department: CatalogProduct["department"]) {
  return CATALOG_PRODUCTS.filter((p) => p.department === department);
}

export function getProductByHandle(handle: string) {
  return CATALOG_PRODUCTS.find((p) => p.handle === handle);
}

export function getProductById(id: string) {
  return CATALOG_PRODUCTS.find((p) => p.id === id);
}

export { WHOLESALE_DISCOUNT, DEFAULT_MOQ };
