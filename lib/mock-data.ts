/**
 * lib/mock-data.ts
 * ---------------------------------------------------------------
 * Every row below is REAL — pulled directly from the two price lists
 * you sent (PRECIOS_FRAGANCIAS_2026.xlsx, PRECIOS_PERFUMAS_2026.xlsx).
 * Nothing here is invented. This is a curated SLICE (10 fragrances,
 * ~15 bottles, a handful of cross-sell items) chosen to exercise every
 * branch of the builder logic — not your full ~940-row catalog.
 *
 * TO GO FROM THIS SLICE TO YOUR FULL CATALOG:
 * This file should not be hand-maintained at full size. Write a one-off
 * script (Node + `xlsx` package, or Python + openpyxl) that reads the
 * same sheets used here and emits objects in this exact shape, then
 * seed them into your Medusa backend instead of importing them here.
 * The four sheets you'll walk are:
 *   - MUJER / HOMBRE            -> Fragrance.pricePerGram (col "Gramo sin envase")
 *   - MUJER G.O / HOMBRE G.O    -> Fragrance.group (col "Grupo Olfativo")
 *   - Env Per                   -> Bottle catalog
 *   - Spla, Crem, Alco, Arom    -> LooseComponent (alcohol) + some cross-sell
 *   - Bisut / Acces y Marro     -> CrossSellProduct
 *
 * ONE FLAG BEFORE YOU USE THIS IN PRODUCTION:
 * "AA" is not a literal label in your spreadsheet. Your real bottle
 * names use: "AAA" (7 items), "GENERICO" (9 items), a large "LUJO" /
 * "CILINDRICO" family (47 items), and ~103 unlabelled "REPLICA" items
 * (the default/standard tier). To match the 3-tier UI you asked for
 * (AAA / AA / Genérico), I mapped:
 *   AAA       -> items literally suffixed "AAA"
 *   AA        -> the standard "REPLICA" bottle for that specific
 *                fragrance, falling back to a "LUJO"/"CILÍNDRICO"
 *                bottle when no fragrance-specific replica exists yet
 *   Genérico  -> items literally named "GENERICO"
 * Please sanity-check that this matches how your team actually thinks
 * about the tiers before it goes live — it's my read of the naming
 * convention, not something confirmed with you.
 *
 * ALSO FLAGGED: you asked for "humidificadores" in the cross-sell mix.
 * I could not find that product line in either spreadsheet (closest is
 * "ESENCIAL AMBIENTAL PANDA GOTERO" and "AGUA DE LINOS SPRAY", both
 * included below). Send pricing when you have it and it slots into
 * CROSS_SELL_PRODUCTS the same way.
 * ---------------------------------------------------------------
 */

import type { Bottle, CrossSellProduct, Fragrance, LooseComponent } from "./types";

export const OLFACTIVE_GROUPS: { id: Fragrance["group"]; label: string }[] = [
  { id: "citricas-frescas", label: "Cítricas y Frescas" },
  { id: "maderas-orientales", label: "Maderas y Orientales" },
  { id: "intermedios", label: "Intermedios" },
  { id: "dulces", label: "Dulces" },
];

/* ---------------- FRAGRANCES (source: MUJER / HOMBRE + *.G.O) --------------- */
export const FRAGRANCES: Fragrance[] = [
  { id: "f-acqua-di-gio", contratipo: "Acqua di Giò", house: "Giorgio Armani", gender: "dama", group: "citricas-frescas", pricePerGram: 410 },
  { id: "f-chanel-5", contratipo: "Chanel Nº 5", house: "Chanel", gender: "dama", group: "maderas-orientales", pricePerGram: 400 },
  { id: "f-coco-mademoiselle", contratipo: "Coco Mademoiselle", house: "Chanel", gender: "dama", group: "intermedios", pricePerGram: 410 },
  { id: "f-la-vie-est-belle", contratipo: "La Vie Est Belle", house: "Lancôme", gender: "dama", group: "dulces", pricePerGram: 400 },
  { id: "f-good-girl", contratipo: "Good Girl", house: "Carolina Herrera", gender: "dama", group: "dulces", pricePerGram: 400 },
  { id: "f-one-million", contratipo: "One Million", house: "Paco Rabanne", gender: "caballero", group: "dulces", pricePerGram: 400 },
  { id: "f-invictus", contratipo: "Invictus", house: "Paco Rabanne", gender: "caballero", group: "citricas-frescas", pricePerGram: 400 },
  { id: "f-eros", contratipo: "Eros", house: "Versace", gender: "caballero", group: "dulces", pricePerGram: 400 },
  { id: "f-fahrenheit", contratipo: "Fahrenheit", house: "Christian Dior", gender: "caballero", group: "maderas-orientales", pricePerGram: 400 },
  { id: "f-legend", contratipo: "Legend", house: "Montblanc", gender: "caballero", group: "intermedios", pricePerGram: 400 },
];

/* ---------------- BOTTLES (source: Env Per) --------------- */
export const BOTTLES: Bottle[] = [
  // AAA — only 2 of our 10 sample fragrances have a real AAA replica today
  { id: "b-1million-aaa", name: "1 Million Réplica Agrafe 100 ml AAA", qualityTier: "AAA", capacityMl: 100, closure: "Agrafe", price: 30000, matchesFragranceIds: ["f-one-million"] },
  { id: "b-eros-aaa", name: "Eros Agrafe 100 ml AAA", qualityTier: "AAA", capacityMl: 100, closure: "Agrafe", price: 30000, matchesFragranceIds: ["f-eros"] },

  // AA — standard shape-matched replica for a given fragrance
  { id: "b-1million-std", name: "1 Million Réplica Agrafe 100 ml", qualityTier: "AA", capacityMl: 100, closure: "Agrafe", price: 22200, matchesFragranceIds: ["f-one-million"] },
  { id: "b-invictus-std", name: "Copa (Invictus) Réplica 100 ml", qualityTier: "AA", capacityMl: 100, closure: "Rosca", price: 11000, matchesFragranceIds: ["f-invictus"] },
  { id: "b-eros-std", name: "Eros Réplica 100 ml", qualityTier: "AA", capacityMl: 100, closure: "Rosca", price: 11600, matchesFragranceIds: ["f-eros"] },
  { id: "b-fahrenheit-std", name: "Fahrenheit Réplica 100 ml", qualityTier: "AA", capacityMl: 100, closure: "Rosca", price: 9000, matchesFragranceIds: ["f-fahrenheit"] },
  { id: "b-chanel5-std", name: "Chanel Nº5 (Canadá) Réplica 100 ml", qualityTier: "AA", capacityMl: 100, closure: "Rosca", price: 9300, matchesFragranceIds: ["f-chanel-5"] },
  { id: "b-goodgirl-std", name: "Good Girl (Tacón) 90 ml", qualityTier: "AA", capacityMl: 90, closure: "Rosca", price: 14500, matchesFragranceIds: ["f-good-girl"] },
  { id: "b-legend-std", name: "Legend Réplica 100 ml", qualityTier: "AA", capacityMl: 100, closure: "Rosca", price: 11700, matchesFragranceIds: ["f-legend"] },

  // AA universal fallback — used when a fragrance has no dedicated replica shape yet
  // (in this sample: Coco Mademoiselle, La Vie Est Belle)
  { id: "b-cilindrico-lujo", name: "Cilíndrico de Lujo 100 ml", qualityTier: "AA", capacityMl: 100, closure: "Rosca", price: 5500 },

  // Genérico — universal, always available regardless of fragrance
  { id: "b-generico-agrafe-100", name: "Genérico Agrafe 100 ml", qualityTier: "Generico", capacityMl: 100, closure: "Agrafe", price: 7500 },
  { id: "b-generico-rosca-100", name: "Genérico Rosca 100 ml", qualityTier: "Generico", capacityMl: 100, closure: "Rosca", price: 4400 },
  { id: "b-generico-rosca-30", name: "Genérico Rosca 30 ml", qualityTier: "Generico", capacityMl: 30, closure: "Rosca", price: 2500 },
];

/* ---------------- LOOSE COMPONENTS (source: Spla, Crem, Alco, Arom) --------------- */
export const ALCOHOL_OPTIONS: LooseComponent[] = [
  { id: "alc-30", name: "Alcohol Desodorizado (válvula spray)", unit: "30 ml", price: 1600 },
  { id: "alc-60", name: "Alcohol Desodorizado (válvula spray)", unit: "60 ml", price: 2200 },
  { id: "alc-125", name: "Alcohol Desodorizado (válvula spray)", unit: "125 ml", price: 3500 },
];

/** Alcohol tier bundled by default into every custom build's total. */
export const DEFAULT_BUILD_ALCOHOL = ALCOHOL_OPTIONS[0];

/** Real price for "CAJA PARA REGALO" — used as the gift-wrap fee. */
export const GIFT_WRAP_FEE = 3000;

/* ---------------- CROSS-SELL (source: Bisut / Acces y Marro / Spla,Crem,Alco,Arom) --------------- */
export const CROSS_SELL_PRODUCTS: CrossSellProduct[] = [
  { id: "cs-anillo-lujo-f", name: "Anillo Acero Lujo (Dama)", category: "bisuteria", price: 10000 },
  { id: "cs-arete-covergold", name: "Arete Covergold Lujo", category: "bisuteria", price: 15000 },
  { id: "cs-argolla-lujo", name: "Argolla Acero Lujo", category: "bisuteria", price: 10000 },
  { id: "cs-billetera-cuero-m", name: "Billetera Cuero Fina (Caballero)", category: "accesorios", price: 30000 },
  { id: "cs-cosmetiquera", name: "Cosmetiquera Tipo Maletín", category: "accesorios", price: 25000 },
  { id: "cs-agua-linos", name: "Agua de Linos Spray 125 ml", category: "ambientales", price: 7000 },
  { id: "cs-esencial-panda", name: "Esencial Ambiental Panda (Gotero)", category: "ambientales", price: 5000 },
];

export const HOUSES: string[] = Array.from(new Set(FRAGRANCES.map((f) => f.house))).sort();
