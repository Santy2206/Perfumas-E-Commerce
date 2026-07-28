import { NextResponse } from "next/server";
import { CATALOG_PRODUCTS } from "../../../lib/catalog";
import type { Department } from "../../../lib/catalog-types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") as Department | null;
  const handle = searchParams.get("handle");

  if (handle) {
    const product = CATALOG_PRODUCTS.find((p) => p.handle === handle);
    if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ product });
  }

  let products = CATALOG_PRODUCTS;
  if (department) {
    products = products.filter((p) => p.department === department);
  }

  return NextResponse.json({ products, count: products.length });
}
