/**
 * lib/types.ts
 * Domain types for the Custom Perfume Builder.
 * Mirrors the DB shape described in the architecture doc: components
 * (fragrance, bottle, alcohol) are first-class, independently sellable
 * products; a "build" is a priced composition of them, not a product
 * of its own.
 */

export type Gender = "dama" | "caballero" | "unisex";

/**
 * These four values are Perfumas' internal "Grupo Olfativo" classification
 * (Clasificacion_Perfumes_Familia_Olfativa.xlsx) — NOT the classic Michael
 * Edwards wheel labels. IDs stay stable; UI labels are "Cítricas y Frescas",
 * "Maderas", "Intermedios", "Dulces y árabes". Florals live inside
 * "Intermedios" alongside other blended profiles.
 */
export type OlfactiveGroup =
  | "citricas-frescas" // "Cítricas y Frescas"
  | "maderas-orientales" // "Maderas"
  | "intermedios" // "Intermedios"
  | "dulces"; // "Dulces y árabes"

export type QualityTier = "AAA" | "AA" | "Generico";
export type Closure = "Agrafe" | "Rosca";

export interface Fragrance {
  id: string;
  contratipo: string; // the reference name customers search for
  house: string; // "inspired by" design house
  gender: Gender;
  group: OlfactiveGroup;
  /** COP per gram of oil, no container — from the "Gramo sin envase" column */
  pricePerGram: number;
  /** Path under /public to a product shot; omitted where no photo exists yet. */
  imageUrl?: string;
}

export interface Bottle {
  id: string;
  name: string;
  qualityTier: QualityTier;
  capacityMl: number;
  closure: Closure;
  price: number;
  /**
   * Fragrance ids this bottle is a shape-accurate replica of. Empty/omitted
   * = universal (Genérico bottles, and the Lujo/Cilíndrico fallback used
   * when no fragrance-specific AA replica exists yet).
   * NOTE: in production this link should be a real FK populated at catalog
   * import time — not fuzzy string-matched at request time. Matching by
   * name at runtime is what this mock layer does only because that's all
   * a spreadsheet gives you; don't carry that pattern into the backend.
   */
  matchesFragranceIds?: string[];
  imageUrl?: string;
}

export interface LooseComponent {
  id: string;
  name: string;
  unit: string; // "30 ml", "60 ml", etc.
  price: number;
}

export type CrossSellCategory = "bisuteria" | "accesorios" | "ambientales";

export interface CrossSellProduct {
  id: string;
  name: string;
  category: CrossSellCategory;
  price: number;
  imageUrl?: string;
}

export interface BuilderSelection {
  fragrance: Fragrance | null;
  bottle: Bottle | null;
  labelText: string;
  giftWrap: boolean;
}

export type CartItemType = "build" | "component";

export interface CartItem {
  id: string;
  type: CartItemType;
  price: number;
  quantity: number;
  // type === 'build'
  fragrance?: Fragrance;
  bottle?: Bottle;
  labelText?: string;
  giftWrap?: boolean;
  // type === 'component'
  componentName?: string;
  componentSourceId?: string;
}

export interface FilterState {
  gender: Gender | null;
  group: OlfactiveGroup | null;
  house: string | null;
  search: string;
}

export type BuilderStep = 1 | 2 | 3 | 4;
