/**
 * Map parsed Excel rows → seed products + builder slices.
 */

import type { ParsedCatalog } from "./parse-xlsx";
import {
  DEFAULT_MOQ,
  ESSENCE_MOQ_G,
  GIFT_WRAP_FEE,
  OLFACTIVE_GROUPS,
  WHOLESALE_FALLBACK,
  classifySplashRow,
  detectBottleTier,
  detectCapacityMl,
  detectClosure,
  mapOlfactiveGroup,
  toHandle,
} from "./sheet-maps";
import {
  applyOlfactiveOverrides,
  syncEssenceCatalogFromFragrances,
} from "./olfactive-overrides";

export type SeedVariant = {
  title: string;
  sku: string;
  prices: { amount: number; currency_code: string }[];
  metadata?: Record<string, unknown>;
};

export type SeedProduct = {
  handle: string;
  title: string;
  description?: string;
  collection: string;
  status: "published";
  metadata: Record<string, unknown>;
  variants: SeedVariant[];
};

export type BuilderFragrance = {
  id: string;
  contratipo: string;
  house: string;
  gender: "dama" | "caballero" | "unisex";
  group: string;
  pricePerGram: number;
  imageUrl?: string;
};

export type BuilderBottle = {
  id: string;
  name: string;
  qualityTier: "AAA" | "AA" | "Generico";
  capacityMl: number;
  closure: "Agrafe" | "Rosca";
  price: number;
  matchesFragranceIds?: string[];
};

export type BuilderAlcohol = {
  id: string;
  name: string;
  unit: string;
  price: number;
};

export type CatalogProductOut = {
  id: string;
  handle: string;
  title: string;
  description?: string;
  department: "perfumeria" | "insumos" | "hogar" | "accesorios";
  category: string;
  price: number;
  wholesalePrice?: number;
  minQty?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
};

export type MappedCatalog = {
  seedProducts: SeedProduct[];
  fragrances: BuilderFragrance[];
  bottles: BuilderBottle[];
  alcoholOptions: BuilderAlcohol[];
  catalogProducts: CatalogProductOut[];
  pheromones: CatalogProductOut[];
  giftWrapFee: number;
  olfactiveGroups: typeof OLFACTIVE_GROUPS;
  summary: Record<string, number>;
};

function wholesaleOf(retail: number, explicit?: number): number {
  if (explicit != null && explicit > 0 && explicit < retail) return explicit;
  return Math.round(retail * (1 - WHOLESALE_FALLBACK));
}

function seedFromCatalog(p: CatalogProductOut): SeedProduct {
  return {
    handle: p.handle,
    title: p.title,
    description: p.description,
    collection: p.department,
    status: "published",
    metadata: {
      department: p.department,
      category: p.category,
      ...(p.metadata ?? {}),
      tags: p.tags ?? [],
    },
    variants: [
      {
        title: "Default",
        sku: p.id,
        prices: [{ amount: p.price, currency_code: "cop" }],
        metadata: {
          wholesale_price: p.wholesalePrice ?? wholesaleOf(p.price),
          min_qty: p.minQty ?? DEFAULT_MOQ,
        },
      },
    ],
  };
}

function ensureUniqueHandle(base: string, used: Set<string>): string {
  const h = base || "producto";
  if (!used.has(h)) {
    used.add(h);
    return h;
  }
  let i = 2;
  while (used.has(`${h}-${i}`)) i++;
  const next = `${h}-${i}`;
  used.add(next);
  return next;
}

function ensureUniqueId(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let i = 2;
  while (used.has(`${base}-${i}`)) i++;
  const next = `${base}-${i}`;
  used.add(next);
  return next;
}

function matchFragranceIds(
  bottleName: string,
  fragrances: BuilderFragrance[],
): string[] {
  const key = bottleName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const hits: string[] = [];
  for (const f of fragrances) {
    const c = f.contratipo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    if (c.length >= 4 && key.includes(c)) hits.push(f.id);
  }
  return hits;
}

const FALLBACK_ALCOHOL: BuilderAlcohol[] = [
  {
    id: "alc-30",
    name: "Alcohol Desodorizado (válvula spray)",
    unit: "30 ml",
    price: 1600,
  },
  {
    id: "alc-60",
    name: "Alcohol Desodorizado (válvula spray)",
    unit: "60 ml",
    price: 2200,
  },
  {
    id: "alc-125",
    name: "Alcohol Desodorizado (válvula spray)",
    unit: "125 ml",
    price: 3500,
  },
];

const STATIC_PHEROMONES: CatalogProductOut[] = [
  {
    id: "ph-femenina",
    handle: "feromona-femenina",
    title: "Feromona Femenina",
    description: "Aditivo de feromonas para fragancias dama.",
    department: "insumos",
    category: "feromonas",
    price: 5000,
    wholesalePrice: Math.round(5000 * (1 - WHOLESALE_FALLBACK)),
    minQty: DEFAULT_MOQ,
    metadata: { product_kind: "pheromone" },
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
    wholesalePrice: Math.round(5000 * (1 - WHOLESALE_FALLBACK)),
    minQty: DEFAULT_MOQ,
    metadata: { product_kind: "pheromone" },
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
    wholesalePrice: Math.round(5500 * (1 - WHOLESALE_FALLBACK)),
    minQty: DEFAULT_MOQ,
    metadata: { product_kind: "pheromone" },
    tags: ["insumo", "feromona"],
  },
];

export function mapParsedCatalog(
  parsed: ParsedCatalog,
  opts?: { imageByHandle?: Map<string, string> },
): MappedCatalog {
  const imageByHandle = opts?.imageByHandle;
  const handles = new Set<string>();
  const fragrances: BuilderFragrance[] = [];
  const catalogProducts: CatalogProductOut[] = [];

  for (const e of parsed.essences) {
    const genderLetter = e.gender === "dama" ? "M" : "H";
    const id = `ess-${e.code}-${genderLetter}`;
    const group = mapOlfactiveGroup(e.groupLabel);
    const handle = ensureUniqueHandle(
      toHandle(`${e.contratipo}-${e.gender}`),
      handles,
    );
    const imageUrl = imageByHandle?.get(handle);
    const wholesale = wholesaleOf(e.pricePerGram, e.wholesalePerGram);
    fragrances.push({
      id,
      contratipo: e.contratipo,
      house: e.house,
      gender: e.gender,
      group,
      pricePerGram: e.pricePerGram,
      imageUrl,
    });
    catalogProducts.push({
      id,
      handle,
      title: e.contratipo,
      description: `Esencia inspirada en ${e.house}. Precio por gramo sin envase.`,
      department: "insumos",
      category: "esencias",
      price: e.pricePerGram,
      wholesalePrice: wholesale,
      minQty: ESSENCE_MOQ_G,
      metadata: {
        house: e.house,
        gender: e.gender,
        group,
        price_per_gram: e.pricePerGram,
        product_kind: "essence",
        excel_code: e.code,
      },
      tags: ["fragancia", "esencia", "insumo", e.gender],
    });
  }

  // Reclassify groups + mark unisex from Clasificacion_Perfumes_Familia_Olfativa
  applyOlfactiveOverrides(fragrances);
  syncEssenceCatalogFromFragrances(fragrances, catalogProducts);

  // Builder bottles for /crear step 2 = Réplicas PREPARADAS (UNITARIO), not empty Env Per.
  // Excel codes can repeat across rows — IDs must be unique for React keys + cart lines.
  const bottles: BuilderBottle[] = [];
  const bottleIds = new Set<string>();
  for (const r of parsed.preparedReplicas) {
    const qualityTier = detectBottleTier(r.name);
    const capacityMl = detectCapacityMl(r.name);
    const closure = detectClosure(r.name);
    const matchesFragranceIds = matchFragranceIds(r.name, fragrances);
    const id = ensureUniqueId(`rep-${r.code}-${capacityMl}`, bottleIds);
    bottles.push({
      id,
      name: r.name,
      qualityTier,
      capacityMl,
      closure,
      price: r.price, // UNITARIO — perfume preparado
      matchesFragranceIds: matchesFragranceIds.length
        ? matchesFragranceIds
        : undefined,
    });
  }

  // Empty bottles (Env Per) stay in insumos shop only — not in /crear bottle picker.
  for (const b of parsed.bottles) {
    const id = `b-${b.code}`;
    const handle = ensureUniqueHandle(toHandle(b.name) || id, handles);
    const qualityTier = detectBottleTier(b.name);
    const capacityMl = detectCapacityMl(b.name);
    const closure = detectClosure(b.name);
    const matchesFragranceIds = matchFragranceIds(b.name, fragrances);
    catalogProducts.push({
      id,
      handle,
      title: b.name,
      description: `Envase vacío ${qualityTier} · ${capacityMl} ml · cierre ${closure}`,
      department: "insumos",
      category: "envases",
      price: b.price,
      wholesalePrice: wholesaleOf(b.price, b.wholesalePrice),
      minQty: DEFAULT_MOQ,
      metadata: {
        quality_tier: qualityTier,
        capacity_ml: capacityMl,
        closure,
        matches_fragrance_ids: matchesFragranceIds,
        product_kind: "bottle",
        excel_code: b.code,
      },
      tags: ["envase", "insumo", qualityTier],
    });
  }

  const replicaIds = new Set<string>();
  for (const r of parsed.preparedReplicas) {
    const qualityTier = detectBottleTier(r.name);
    const capacityMl = detectCapacityMl(r.name);
    const id = ensureUniqueId(`rep-${r.code}-${capacityMl}`, replicaIds);
    const handle = ensureUniqueHandle(toHandle(r.name) || id, handles);
    catalogProducts.push({
      id,
      handle,
      title: r.name,
      description: "Réplica preparada lista para usar (precio unitario).",
      department: "perfumeria",
      category: "replicas-preparadas",
      price: r.price,
      wholesalePrice: wholesaleOf(r.price, r.wholesalePrice),
      minQty: DEFAULT_MOQ,
      metadata: {
        product_kind: "prepared_replica",
        quality_tier: qualityTier,
        capacity_ml: capacityMl,
        closure: detectClosure(r.name),
        excel_code: r.code,
        refill_price: r.refillPrice,
        bottle_price: r.bottlePrice,
        matches_fragrance_ids: matchFragranceIds(r.name, fragrances),
      },
      tags: ["perfumeria", "replica", "preparada", qualityTier],
    });
  }

  const alcoholOptions: BuilderAlcohol[] = [];
  const alcoholSeen = new Set<string>();

  for (const row of parsed.splashEtc) {
    const klass = classifySplashRow(row.name);
    const id = `sku-${row.sheet}-${row.code}`.replace(/\s+/g, "-");
    const handle = ensureUniqueHandle(toHandle(row.name) || id, handles);
    if (klass.product_kind === "alcohol") {
      const unitMatch = row.name.match(/(\d+\s*ml)/i);
      const unit = unitMatch ? unitMatch[1].replace(/\s+/g, " ") : "unidad";
      const alcId = `alc-${toHandle(unit)}`;
      if (!alcoholSeen.has(unit.toLowerCase())) {
        alcoholSeen.add(unit.toLowerCase());
        alcoholOptions.push({
          id: alcId,
          name: "Alcohol Desodorizado",
          unit,
          price: row.price,
        });
      }
    }
    catalogProducts.push({
      id,
      handle,
      title: row.name,
      department: klass.department,
      category: klass.category,
      price: row.price,
      wholesalePrice: wholesaleOf(row.price, row.wholesalePrice),
      minQty: DEFAULT_MOQ,
      metadata: { product_kind: klass.product_kind, excel_code: row.code },
      tags: [klass.category, klass.department],
    });
  }

  if (!alcoholOptions.length) {
    alcoholOptions.push(...FALLBACK_ALCOHOL);
    for (const a of FALLBACK_ALCOHOL) {
      const handle = ensureUniqueHandle(
        toHandle(`${a.name}-${a.unit}`),
        handles,
      );
      catalogProducts.push({
        id: a.id,
        handle,
        title: `${a.name} ${a.unit}`,
        description: "Alcohol desodorizado especializado para perfumería.",
        department: "insumos",
        category: "alcohol",
        price: a.price,
        wholesalePrice: wholesaleOf(a.price),
        minQty: DEFAULT_MOQ,
        metadata: { unit: a.unit, product_kind: "alcohol" },
        tags: ["alcohol", "insumo"],
      });
    }
  } else {
    // Ensure alcohol builder options also exist as catalog rows (may already)
    for (const a of alcoholOptions) {
      if (catalogProducts.some((p) => p.id === a.id)) continue;
      const handle = ensureUniqueHandle(
        toHandle(`${a.name}-${a.unit}`),
        handles,
      );
      catalogProducts.push({
        id: a.id,
        handle,
        title: `${a.name} ${a.unit}`,
        description: "Alcohol desodorizado especializado para perfumería.",
        department: "insumos",
        category: "alcohol",
        price: a.price,
        wholesalePrice: wholesaleOf(a.price),
        minQty: DEFAULT_MOQ,
        metadata: { unit: a.unit, product_kind: "alcohol" },
        tags: ["alcohol", "insumo"],
      });
    }
  }

  for (const row of parsed.bisuteria) {
    const id = `bis-${row.code}`;
    const handle = ensureUniqueHandle(toHandle(row.name) || id, handles);
    catalogProducts.push({
      id,
      handle,
      title: row.name,
      department: "accesorios",
      category: "bisuteria",
      price: row.price,
      wholesalePrice: wholesaleOf(row.price, row.wholesalePrice),
      minQty: DEFAULT_MOQ,
      metadata: { product_kind: "accessory", excel_code: row.code },
      tags: ["bisuteria", "accesorios"],
    });
  }

  for (const row of parsed.accesorios) {
    const id = `acc-${row.code}`;
    const handle = ensureUniqueHandle(toHandle(row.name) || id, handles);
    catalogProducts.push({
      id,
      handle,
      title: row.name,
      department: "accesorios",
      category: "marroquineria",
      price: row.price,
      wholesalePrice: wholesaleOf(row.price, row.wholesalePrice),
      minQty: DEFAULT_MOQ,
      metadata: { product_kind: "accessory", excel_code: row.code },
      tags: ["accesorios"],
    });
  }

  for (const row of [...parsed.plasticPackaging, ...parsed.aseo]) {
    const id = `hog-${row.sheet}-${row.code}`;
    const handle = ensureUniqueHandle(toHandle(row.name) || id, handles);
    catalogProducts.push({
      id,
      handle,
      title: row.name,
      department: "hogar",
      category: row.sheet === "aseo" ? "aseo" : "empaques",
      price: row.price,
      wholesalePrice: wholesaleOf(row.price, row.wholesalePrice),
      minQty: DEFAULT_MOQ,
      metadata: { product_kind: "home_care", excel_code: row.code },
      tags: ["hogar", row.sheet],
    });
  }

  const pheromones = [...STATIC_PHEROMONES];
  for (const ph of pheromones) {
    if (!handles.has(ph.handle)) handles.add(ph.handle);
    if (!catalogProducts.some((p) => p.id === ph.id)) {
      catalogProducts.push(ph);
    }
  }

  const seedProducts = catalogProducts.map(seedFromCatalog);

  return {
    seedProducts,
    fragrances,
    bottles,
    alcoholOptions,
    catalogProducts,
    pheromones,
    giftWrapFee: GIFT_WRAP_FEE,
    olfactiveGroups: OLFACTIVE_GROUPS,
    summary: {
      essences: fragrances.length,
      bottles: bottles.length,
      preparedReplicas: parsed.preparedReplicas.length,
      alcohol: alcoholOptions.length,
      catalogProducts: catalogProducts.length,
      seedProducts: seedProducts.length,
    },
  };
}
