/**
 * Fetch Medusa Store products and map them into CatalogProduct.
 * Falls back to the local catalog when Medusa is unset or unreachable.
 *
 * Performance: caches catalog responses (Next.js + in-memory TTL) and can
 * scope fetches by collection/department instead of paging the whole store.
 */

import { unstable_cache } from "next/cache";
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

const CATALOG_REVALIDATE_SECONDS = 120;
const MEMORY_TTL_MS = 60_000;

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

type MemoryEntry<T> = { at: number; value: T };

/**
 * Images uploaded while Medusa ran on localhost often bake
 * `http://localhost:9000/static/...` into the DB. Rewrite those to the
 * public storefront backend URL so production can load them.
 */
function publicMedusaAssetUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  const backend =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(/\/$/, "") || "";
  if (!backend) return url;
  try {
    const parsed = new URL(url);
    const isLoopback =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (!isLoopback) return url;
    return `${backend}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

const memoryCache = new Map<string, MemoryEntry<unknown>>();

function memoryGet<T>(key: string): T | undefined {
  const hit = memoryCache.get(key) as MemoryEntry<T> | undefined;
  if (!hit) return undefined;
  if (Date.now() - hit.at > MEMORY_TTL_MS) {
    memoryCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function memorySet<T>(key: string, value: T) {
  memoryCache.set(key, { at: Date.now(), value });
}

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
    publicMedusaAssetUrl(product.thumbnail) ||
    publicMedusaAssetUrl(product.images?.[0]?.url) ||
    local?.imageUrl ||
    undefined;

  const hoverImageUrl =
    publicMedusaAssetUrl(product.images?.[1]?.url) ||
    local?.hoverImageUrl ||
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
    hoverImageUrl,
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
const cachedCollectionIds = new Map<string, string | null>();

async function getCopRegionId(): Promise<string | null> {
  if (cachedRegionId !== undefined) return cachedRegionId;
  try {
    const { regions } = await medusa.store.region.list({ limit: 20 });
    const co =
      regions?.find(
        (r: { id: string; currency_code?: string; name?: string }) =>
          r.currency_code?.toLowerCase() === "cop"
      ) ||
      regions?.find(
        (r: { id: string; currency_code?: string; name?: string }) =>
          r.name?.toLowerCase() === "colombia"
      ) ||
      regions?.[0];
    cachedRegionId = co?.id ?? null;
    return cachedRegionId ?? null;
  } catch {
    cachedRegionId = null;
    return null;
  }
}

async function getCollectionIdByHandle(handle: Department): Promise<string | null> {
  if (cachedCollectionIds.has(handle)) {
    return cachedCollectionIds.get(handle) ?? null;
  }
  try {
    const { collections } = await medusa.store.collection.list({ limit: 50 });
    const match = collections?.find(
      (c: { id: string; handle?: string | null }) => c.handle === handle
    );
    const id = match?.id ?? null;
    cachedCollectionIds.set(handle, id);
    return id;
  } catch {
    cachedCollectionIds.set(handle, null);
    return null;
  }
}

const LIST_FIELDS =
  "*variants,*variants.calculated_price,*collection,+metadata,+thumbnail,*images";

async function pageMedusaProducts(params: {
  regionId: string;
  collectionId?: string | null;
}): Promise<MedusaProduct[]> {
  const all: MedusaProduct[] = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const query: Record<string, unknown> = {
      limit,
      offset,
      region_id: params.regionId,
      fields: LIST_FIELDS,
    };
    if (params.collectionId) {
      query.collection_id = [params.collectionId];
    }

    const { products, count } = await medusa.store.product.list(query);
    if (!products?.length) break;
    all.push(...(products as MedusaProduct[]));
    offset += limit;
    if (all.length >= (count ?? all.length)) break;
  }
  return all;
}

async function fetchMedusaProductsRaw(
  department?: Department
): Promise<CatalogProduct[] | null> {
  if (!isMedusaConfigured()) return null;

  try {
    const regionId = await getCopRegionId();
    if (!regionId) return null;

    let collectionId: string | null = null;
    if (department) {
      collectionId = await getCollectionIdByHandle(department);
    }

    const raw = await pageMedusaProducts({
      regionId,
      collectionId,
    });
    if (!raw.length) return null;

    let mapped = raw
      .map(mapMedusaProduct)
      .filter((p): p is CatalogProduct => p != null);

    // If collection filter returned empty mapping, fall back to full list once.
    if (department && collectionId && mapped.length === 0) {
      const all = await pageMedusaProducts({ regionId });
      mapped = all
        .map(mapMedusaProduct)
        .filter((p): p is CatalogProduct => p != null)
        .filter((p) => p.department === department);
    } else if (department && !collectionId) {
      mapped = mapped.filter((p) => p.department === department);
    }

    return mapped.length ? mapped : null;
  } catch (error) {
    console.warn("[medusa-catalog] falling back to local catalog:", error);
    return null;
  }
}

const getCachedAllProducts = unstable_cache(
  async () => fetchMedusaProductsRaw(),
  ["medusa-catalog-all-v3"],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
);

function getCachedDepartmentProducts(department: Department) {
  return unstable_cache(
    async () => fetchMedusaProductsRaw(department),
    [`medusa-catalog-dept-v3-${department}`],
    { revalidate: CATALOG_REVALIDATE_SECONDS }
  )();
}

async function fetchMedusaProducts(
  department?: Department
): Promise<CatalogProduct[] | null> {
  const memKey = department ? `dept:${department}` : "all";
  const warm = memoryGet<CatalogProduct[] | null>(memKey);
  if (warm !== undefined) return warm;

  const remote = department
    ? await getCachedDepartmentProducts(department)
    : await getCachedAllProducts();

  memorySet(memKey, remote);
  return remote;
}

export async function listCatalogProducts(options?: {
  department?: Department;
  productKind?: string;
}): Promise<{ products: CatalogProduct[]; source: "medusa" | "local" }> {
  const remote = await fetchMedusaProducts(options?.department);
  let products = remote ?? (
    options?.department
      ? getLocalProductsByDepartment(options.department)
      : CATALOG_PRODUCTS
  );
  const source = remote ? "medusa" : "local";

  if (!remote && options?.department) {
    // already department-scoped from local helper
  } else if (options?.department && remote) {
    // already scoped when collection filter worked; keep filter as safety net
    products = products.filter((p) => p.department === options.department);
  }

  if (options?.productKind) {
    products = products.filter(
      (p) => p.metadata?.product_kind === options.productKind
    );
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
          fields: LIST_FIELDS,
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
