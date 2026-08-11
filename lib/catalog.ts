/**
 * Full retail catalog spanning all four departments.
 * Sourced from Excel → lib/generated/catalog-data.ts
 */

import type { CatalogProduct, ProductKind } from "./catalog-types";
import {
  CATALOG_PRODUCTS as GENERATED_PRODUCTS,
  PHEROMONES as GENERATED_PHEROMONES,
} from "./generated/catalog-data";

export const WHOLESALE_DISCOUNT = 0.2;
export const DEFAULT_MOQ = 6;

export const PHEROMONES: CatalogProduct[] = GENERATED_PHEROMONES;

export const CATALOG_PRODUCTS: CatalogProduct[] = GENERATED_PRODUCTS;

export const DEPARTMENTS: {
  id: CatalogProduct["department"];
  label: string;
  href: string;
  description: string;
}[] = [
  {
    id: "perfumeria",
    label: "Preparadas",
    href: "/tienda/perfumeria",
    description:
      "Réplicas preparadas listas para llevar, o prepara tu fragancia personalizada.",
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
    description: "Room sprays, agua de linos, aseo y empaques.",
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

export function getProductKind(product: CatalogProduct): ProductKind | undefined {
  const kind = product.metadata?.product_kind;
  return typeof kind === "string" ? (kind as ProductKind) : undefined;
}

export function getProductsByKind(kind: ProductKind) {
  return CATALOG_PRODUCTS.filter((p) => getProductKind(p) === kind);
}
