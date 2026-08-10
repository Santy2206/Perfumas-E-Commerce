/**
 * Unified catalog types spanning all four Perfumas departments.
 * Maps to Medusa product metadata when the backend is connected.
 */

export type Department = "perfumeria" | "insumos" | "hogar" | "accesorios";

export type ProductKind =
  | "essence"
  | "bottle"
  | "alcohol"
  | "pheromone"
  | "prepared_replica"
  | "home_care"
  | "accessory"
  | "custom_build";

export type CatalogProduct = {
  id: string;
  handle: string;
  title: string;
  description?: string;
  department: Department;
  category: string;
  price: number;
  wholesalePrice?: number;
  minQty?: number;
  imageUrl?: string;
  /** Second Medusa gallery image for hover swap */
  hoverImageUrl?: string;
  /** Medusa variant id when product came from Store API */
  variantId?: string;
  metadata?: Record<string, string | number | boolean | string[] | undefined>;
  tags?: string[];
};

export type ShippingMethod = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export type PaymentProvider = {
  id: string;
  name: string;
  description: string;
};
