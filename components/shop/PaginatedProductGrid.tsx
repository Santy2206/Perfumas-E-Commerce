"use client";

import { useEffect, useState } from "react";
import type { CatalogProduct } from "../../lib/catalog-types";
import { ProductCard } from "./ProductCard";
import { Button } from "../ui/button";

const PAGE_SIZE = 24;

export function PaginatedProductGrid({
  products,
  wholesale = false,
  intent,
}: {
  products: CatalogProduct[];
  wholesale?: boolean;
  intent?: "create" | "buy";
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [products]);

  const slice = products.slice(0, visible);
  const remaining = products.length - slice.length;

  if (products.length === 0) {
    return <p className="text-bone-60">No hay productos con estos filtros.</p>;
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slice.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            wholesale={wholesale}
            intent={intent}
          />
        ))}
      </div>
      {remaining > 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-xs text-bone-60">
            Mostrando {slice.length} de {products.length}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisible((n) => n + PAGE_SIZE)}
          >
            Cargar más ({Math.min(PAGE_SIZE, remaining)})
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-xs text-bone-60">{products.length} productos</p>
      )}
    </div>
  );
}
