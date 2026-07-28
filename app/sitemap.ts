import type { MetadataRoute } from "next";
import { CATALOG_PRODUCTS, DEPARTMENTS } from "../lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://perfumas.com.co";

  const staticRoutes = ["", "/crear", "/tienda", "/mayoristas", "/mayoristas/insumos", "/carrito", "/checkout", "/cuenta", "/faq"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" || path === "/crear" ? 1 : 0.7,
    })
  );

  const departments = DEPARTMENTS.map((d) => ({
    url: `${base}${d.href}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const products = CATALOG_PRODUCTS.map((p) => ({
    url: `${base}/producto/${p.handle}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...departments, ...products];
}
