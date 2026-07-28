"use client";

import Link from "next/link";
import { formatCOP } from "../../lib/utils";
import type { CatalogProduct } from "../../lib/catalog-types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { useCartStore } from "../../store/useCartStore";
import { useState } from "react";

export function ProductCard({
  product,
  wholesale = false,
}: {
  product: CatalogProduct;
  wholesale?: boolean;
}) {
  const addSku = useCartStore((s) => s.addSku);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const price =
    wholesale && product.wholesalePrice != null ? product.wholesalePrice : product.price;
  const qty = wholesale ? product.minQty ?? 1 : 1;

  const onAdd = () => {
    const result = addSku(product, qty, { wholesale });
    if (!result.ok) {
      setError(result.error);
      setAdded(false);
      return;
    }
    setError(null);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-wine-900">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-3xl text-gold-400/40">{product.title.charAt(0)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="outline">{product.category}</Badge>
          {wholesale && <Badge variant="b2b">Mayorista</Badge>}
        </div>
        <CardTitle>
          <Link href={`/producto/${product.handle}`} className="hover:text-gold-400">
            {product.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {product.description && <p className="text-xs text-bone-60 line-clamp-2">{product.description}</p>}
        <p className="mt-3 font-semibold text-bone">{formatCOP(price)}</p>
        {wholesale && product.minQty ? (
          <p className="text-xs text-bone-60 mt-1">Mín. {product.minQty} uds</p>
        ) : null}
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </CardContent>
      <CardFooter className="gap-2">
        {product.department === "perfumeria" && product.metadata?.product_kind === "essence" ? (
          <Button asChild className="w-full" size="sm">
            <Link href={`/crear?fragrance=${product.id}`}>Crear con esta</Link>
          </Button>
        ) : (
          <Button className="w-full" size="sm" onClick={onAdd}>
            {added ? "Agregado ✓" : "Agregar"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
