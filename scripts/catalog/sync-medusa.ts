/**
 * Upsert / prune Medusa products from catalog-seed.json via Admin API.
 *
 * Requires:
 *   MEDUSA_BACKEND_URL (or NEXT_PUBLIC_MEDUSA_BACKEND_URL)
 *   MEDUSA_ADMIN_API_TOKEN  (Bearer token with admin product write access)
 *
 * Usage:
 *   npx tsx scripts/catalog/cli.ts sync [--prune] [--dry-run]
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

type SeedProduct = {
  handle: string;
  title: string;
  description?: string;
  collection: string;
  status?: string;
  metadata?: Record<string, unknown>;
  variants: {
    title: string;
    sku: string;
    prices: { amount: number; currency_code: string }[];
    metadata?: Record<string, unknown>;
  }[];
};

type SeedFile = {
  products: SeedProduct[];
  collections: { handle: string; title: string }[];
};

export type SyncResult = {
  created: number;
  updated: number;
  pruned: number;
  skipped: number;
  dryRun: boolean;
};

function loadSeed(root = process.cwd()): SeedFile {
  const path = resolve(root, "scripts", "output", "catalog-seed.json");
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Run catalog:import first.`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as SeedFile;
}

function backendUrl(): string {
  return (
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    "http://localhost:9000"
  ).replace(/\/$/, "");
}

function adminToken(): string {
  const token = process.env.MEDUSA_ADMIN_API_TOKEN || process.env.MEDUSA_ADMIN_TOKEN;
  if (!token) {
    throw new Error(
      "Set MEDUSA_ADMIN_API_TOKEN (Admin API bearer) to run catalog:sync."
    );
  }
  return token;
}

async function adminFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${backendUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken()}`,
      ...(init?.headers || {}),
    },
  });
  return res;
}

async function listAllProducts(): Promise<
  { id: string; handle: string; status?: string }[]
> {
  const all: { id: string; handle: string; status?: string }[] = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const res = await adminFetch(`/admin/products?limit=${limit}&offset=${offset}`);
    if (!res.ok) {
      throw new Error(`List products failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      products: { id: string; handle: string; status?: string }[];
      count?: number;
    };
    all.push(...(data.products || []));
    if (!data.products?.length || all.length >= (data.count ?? all.length)) break;
    offset += limit;
  }
  return all;
}

async function listCollections(): Promise<Map<string, string>> {
  const res = await adminFetch(`/admin/collections?limit=50`);
  const map = new Map<string, string>();
  if (!res.ok) return map;
  const data = (await res.json()) as {
    collections?: { id: string; handle: string }[];
  };
  for (const c of data.collections || []) {
    map.set(c.handle, c.id);
  }
  return map;
}

export async function syncMedusaCatalog(opts: {
  prune?: boolean;
  dryRun?: boolean;
  root?: string;
}): Promise<SyncResult> {
  const dryRun = Boolean(opts.dryRun);
  const seed = loadSeed(opts.root);
  const existing = await listAllProducts();
  const byHandle = new Map(existing.map((p) => [p.handle, p]));
  const collections = await listCollections();

  let created = 0;
  let updated = 0;
  let pruned = 0;
  let skipped = 0;

  const seedHandles = new Set(seed.products.map((p) => p.handle));

  for (const product of seed.products) {
    const collectionId = collections.get(product.collection);
    const body = {
      title: product.title,
      handle: product.handle,
      description: product.description || "",
      status: "published",
      metadata: product.metadata || {},
      ...(collectionId ? { collection_id: collectionId } : {}),
    };

    const found = byHandle.get(product.handle);
    if (!found) {
      if (dryRun) {
        created++;
        continue;
      }
      const variant = product.variants[0];
      const res = await adminFetch(`/admin/products`, {
        method: "POST",
        body: JSON.stringify({
          ...body,
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: variant?.title || "Default",
              sku: variant?.sku,
              options: { Default: "Default" },
              prices: (variant?.prices || []).map((p) => ({
                amount: p.amount,
                currency_code: p.currency_code.toLowerCase(),
              })),
              metadata: variant?.metadata || {},
              manage_inventory: false,
            },
          ],
        }),
      });
      if (!res.ok) {
        console.warn(`Create ${product.handle} failed:`, res.status, await res.text());
        skipped++;
      } else {
        created++;
      }
      continue;
    }

    if (dryRun) {
      updated++;
      continue;
    }
    const res = await adminFetch(`/admin/products/${found.id}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`Update ${product.handle} failed:`, res.status, await res.text());
      skipped++;
    } else {
      updated++;
    }
  }

  if (opts.prune) {
    for (const p of existing) {
      if (!p.handle || seedHandles.has(p.handle)) continue;
      // Keep system products (custom build)
      if (p.handle === "custom-perfume-build") continue;
      if (dryRun) {
        pruned++;
        continue;
      }
      const res = await adminFetch(`/admin/products/${p.id}`, {
        method: "POST",
        body: JSON.stringify({ status: "draft" }),
      });
      if (res.ok) pruned++;
      else skipped++;
    }
  }

  return { created, updated, pruned, skipped, dryRun };
}
