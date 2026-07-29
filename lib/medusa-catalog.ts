/**
 * Fetch Medusa Store products and map them into CatalogProduct.
 * Falls back to the local catalog when Medusa is unset or unreachable.
 */

import {
  CATALOG_PRODUCTS,
  getProductByHandle as getLocalProductByHandle,
  getProductsByDepartment as getLocalProductsByDepartment,
} from "./catalog";
import type { CatalogProduct, Department } from "./catalog-types";
import { isMedusaConfigured, medusa } from "./medusa";

const DEPARTMENTS: Department[] = [
  "perfumeria",
  "insumos",
  "hogar",
  "accesorios",
];

type MedusaVariant = {
  id: string;
  sku?: string | null;
  metadata?: Record<string, unknown> | null;
  calculated_price?: {
    calculated_amount?: number | null;
    original_amount?: number | null;
  } | null;
};

type MedusaProduct = {
  id: string;
  handle?: string | null;
  title?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  metadata?: Record<string, unknown> | null;
  collection?: { handle?: string | null; title?: string | null } | null;
  variants?: MedusaVariant[] | null;
  images?: { url?: string | null }[] | null;
};

function isDepartment(value: unknown): value is Department {
  return typeof value === "string" && (DEPARTMENTS as string[]).includes(value);
}

function resolveDepartment(product: MedusaProduct): Department | null {
  const fromMeta = product.metadata?.department;
  if (isDepartment(fromMeta)) return fromMeta;
  const fromCollection = product.collection?.handle;
  if (isDepartment(fromCollection)) return fromCollection;
  return null;
}

function mapMedusaProduct(product: MedusaProduct): CatalogProduct | null {
  const department = resolveDepartment(product);
  if (!department || !product.handle) return null;

  const variant = product.variants?.[0];
  const calculated = variant?.calculated_price?.calculated_amount;
  const price =
    typeof calculated === "number"
      ? calculated
      : typeof product.metadata?.price_per_gram === "number"
        ? product.metadata.price_per_gram
        : 0;

  const wholesaleRaw = variant?.metadata?.wholesale_price;
  const wholesalePrice =
    typeof wholesaleRaw === "number"
      ? wholesaleRaw
      : typeof wholesaleRaw === "string" && wholesaleRaw.trim() !== ""
        ? Number(wholesaleRaw)
        : undefined;

  const minQtyRaw = variant?.metadata?.min_qty;
  const minQty =
    typeof minQtyRaw === "number"
      ? minQtyRaw
      : typeof minQtyRaw === "string" && minQtyRaw.trim() !== ""
        ? Number(minQtyRaw)
        : undefined;

  const local = getLocalProductByHandle(product.handle);
  // Prefer local id for essence → /crear compatibility (f-*); keep Medusa ids in metadata.
  const id = local?.id ?? variant?.sku ?? product.id;

  const category =
    (typeof product.metadata?.category === "string" && product.metadata.category) ||
    (typeof product.metadata?.group === "string" && product.metadata.group) ||
    local?.category ||
    product.collection?.title ||
    department;

  const imageUrl =
    product.thumbnail ||
    product.images?.[0]?.url ||
    local?.imageUrl ||
    undefined;

  const tags = Array.isArray(product.metadata?.tags)
    ? (product.metadata.tags as string[])
    : local?.tags;

  return {
    id,
    handle: product.handle,
    title: product.title || local?.title || product.handle,
    description: product.description || local?.description || undefined,
    department,
    category,
    price,
    wholesalePrice: Number.isFinite(wholesalePrice) ? wholesalePrice : local?.wholesalePrice,
    minQty: Number.isFinite(minQty) ? minQty : local?.minQty,
    imageUrl,
    tags,
    variantId: variant?.id || local?.variantId,
    metadata: {
      ...(local?.metadata || {}),
      ...(product.metadata || {}),
      medusa_product_id: product.id,
      medusa_variant_id: variant?.id,
      product_kind:
        (product.metadata?.product_kind as string | undefined) ||
        local?.metadata?.product_kind,
    },
  };
}

let cachedRegionId: string | null | undefined;

async function getCopRegionId(): Promise<string | null> {
  if (cachedRegionId !== undefined) return cachedRegionId;
  try {
    const { regions } = await medusa.store.region.list({ limit: 20 });
    const co =
      regions?.find((r) => r.currency_code?.toLowerCase() === "cop") ||
      regions?.find((r) => r.name?.toLowerCase() === "colombia") ||
      regions?.[0];
    cachedRegionId = co?.id ?? null;
    return cachedRegionId;
  } catch {
    cachedRegionId = null;
    return null;
  }
}

async function fetchMedusaProducts(): Promise<CatalogProduct[] | null> {
  if (!isMedusaConfigured()) return null;

  try {
    const regionId = await getCopRegionId();
    if (!regionId) return null;

    const { products } = await medusa.store.product.list({
      limit: 100,
      region_id: regionId,
      fields:
        "*variants,*variants.calculated_price,*collection,+metadata,*images",
    });

    if (!products?.length) return null;

    const mapped = (products as MedusaProduct[])
      .map(mapMedusaProduct)
      .filter((p): p is CatalogProduct => p != null);

    return mapped.length ? mapped : null;
  } catch (error) {
    console.warn("[medusa-catalog] falling back to local catalog:", error);
    return null;
  }
}

export async function listCatalogProducts(options?: {
  department?: Department;
}): Promise<{ products: CatalogProduct[]; source: "medusa" | "local" }> {
  const remote = await fetchMedusaProducts();
  const products = remote ?? CATALOG_PRODUCTS;
  const source = remote ? "medusa" : "local";

  if (options?.department) {
    return {
      products: products.filter((p) => p.department === options.department),
      source,
    };
  }
  return { products, source };
}

export async function getCatalogProductByHandle(
  handle: string
): Promise<{ product: CatalogProduct | null; source: "medusa" | "local" }> {
  if (isMedusaConfigured()) {
    try {
      const regionId = await getCopRegionId();
      if (regionId) {
        const { products } = await medusa.store.product.list({
          handle,
          limit: 1,
          region_id: regionId,
          fields:
            "*variants,*variants.calculated_price,*collection,+metadata,*images",
        });
        const mapped = products?.[0]
          ? mapMedusaProduct(products[0] as MedusaProduct)
          : null;
        if (mapped) return { product: mapped, source: "medusa" };
      }
    } catch (error) {
      console.warn("[medusa-catalog] retrieve failed, using local:", error);
    }
  }

  return {
    product: getLocalProductByHandle(handle) ?? null,
    source: "local",
  };
}

/** Sync helpers kept for client/builder code that still uses the local catalog. */
export function getProductsByDepartmentLocal(department: Department) {
  return getLocalProductsByDepartment(department);
}
