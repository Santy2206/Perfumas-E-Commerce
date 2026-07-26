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
 * These four values are Perfumas' real internal "Grupo Olfativo"
 * classification (from PRECIOS_FRAGANCIAS_2026.xlsx, sheets "MUJER
 * G.O" / "HOMBRE G.O") — NOT the classic Michael Edwards wheel labels.
 * There is no standalone "Floral" group in the current data; florals
 * live inside "Intermedios" alongside other blended profiles. See the
 * note in mock-data.ts before relabeling these.
 */
export type OlfactiveGroup =
  | "citricas-frescas" // "Cítricas y Frescas"
  | "maderas-orientales" // "Maderas y Orientales"
  | "intermedios" // "Intermedios"
  | "dulces"; // "Dulces"

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
