import { NextResponse } from "next/server";
import type { Department } from "../../../lib/catalog-types";
import {
  getCatalogProductByHandle,
  listCatalogProducts,
} from "../../../lib/medusa-catalog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") as Department | null;
  const handle = searchParams.get("handle");

  if (handle) {
    const { product, source } = await getCatalogProductByHandle(handle);
    if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ product, source });
  }

  const { products, source } = await listCatalogProducts({
    department: department || undefined,
  });

  return NextResponse.json({ products, count: products.length, source });
}
