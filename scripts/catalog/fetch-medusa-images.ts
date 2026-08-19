/**
 * Fetch handle → thumbnail URL map from the live Medusa Admin API.
 * Used by `catalog:import` to attach real product images (already
 * uploaded to Supabase via upload-product-images.ts) onto the
 * generated catalog data, without needing them in the Excel.
 *
 * Requires the same env vars as sync-medusa.ts:
 *   MEDUSA_BACKEND_URL (or NEXT_PUBLIC_MEDUSA_BACKEND_URL)
 *   MEDUSA_ADMIN_API_TOKEN
 */

function backendUrl(): string {
  return (
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    "http://localhost:9000"
  ).replace(/\/$/, "");
}

function adminAuthHeader(): string {
  const token =
    process.env.MEDUSA_ADMIN_API_TOKEN || process.env.MEDUSA_ADMIN_TOKEN;
  if (!token) {
    throw new Error(
      "Set MEDUSA_ADMIN_API_TOKEN to fetch product images from Medusa.",
    );
  }
  // Medusa v2 secret API keys (sk_...) use Basic auth; JWTs use Bearer.
  if (token.startsWith("sk_")) {
    return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
  }
  return `Bearer ${token}`;
}

export async function fetchMedusaThumbnails(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const limit = 100;
  let offset = 0;

  for (;;) {
    const res = await fetch(
      `${backendUrl()}/admin/products?limit=${limit}&offset=${offset}&fields=handle,thumbnail`,
      { headers: { Authorization: adminAuthHeader() } },
    );
    if (!res.ok) {
      throw new Error(
        `Fetching product thumbnails failed: ${res.status} ${await res.text()}`,
      );
    }
    const data = (await res.json()) as {
      products: { handle: string; thumbnail?: string | null }[];
      count?: number;
    };

    for (const p of data.products || []) {
      if (p.handle && p.thumbnail) map.set(p.handle, p.thumbnail);
    }

    offset += limit;
    if (!data.products?.length || offset >= (data.count ?? offset)) break;
  }

  return map;
}
