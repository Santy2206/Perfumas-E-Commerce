"use client";

import Link from "next/link";
import { formatCOP, cn } from "../../lib/utils";
import type { CatalogProduct } from "../../lib/catalog-types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { useCartStore } from "../../store/useCartStore";
import { useState } from "react";
import { LikeButton } from "../favorites/LikeButton";
import { AddToListButton } from "../favorites/AddToListButton";

export function ProductCard({
  product,
  wholesale = false,
  /** create = essence inspiration (no $/g); buy = add to cart with price */
  intent,
  highlighted = false,
}: {
  product: CatalogProduct;
  wholesale?: boolean;
  intent?: "create" | "buy";
  highlighted?: boolean;
}) {
  const addSku = useCartStore((s) => s.addSku);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const kind = product.metadata?.product_kind;
  const isEssence = kind === "essence";
  const mode = intent ?? (isEssence ? "create" : "buy");
  const sellByGram = isEssence && mode === "buy" && !wholesale;
  const minQty = product.minQty ?? (sellByGram ? 30 : wholesale ? product.minQty ?? 1 : 1);
  const [grams, setGrams] = useState(minQty);

  const price =
    wholesale && product.wholesalePrice != null ? product.wholesalePrice : product.price;

  const onAdd = () => {
    const qty = sellByGram ? grams : wholesale ? minQty : 1;
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

  const showPrice = mode === "buy";
  const listTarget = {
    type: "sku" as const,
    productId: product.id,
    productKind: typeof kind === "string" ? kind : undefined,
    title: product.title,
    handle: product.handle,
  };

  return (
    <Card
      id={`product-${product.id}`}
      className={cn(
        "flex flex-col scroll-mt-28",
        highlighted && "ring-2 ring-gold-400/70"
      )}
    >
      <CardHeader>
        <div className="group/image relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-wine-900">
          {product.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.title}
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-300",
                  product.hoverImageUrl && "group-hover/image:opacity-0"
                )}
              />
              {product.hoverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.hoverImageUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover/image:opacity-100"
                />
              )}
            </>
          ) : (
            <span className="font-display text-3xl text-gold-400/40">{product.title.charAt(0)}</span>
          )}
          <LikeButton
            productId={product.id}
            productKind={typeof kind === "string" ? kind : undefined}
            title={product.title}
            handle={product.handle}
            className="absolute right-2 top-2"
          />
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
        {product.description && (
          <p className="text-xs text-bone-60 line-clamp-2">{product.description}</p>
        )}
        {showPrice ? (
          <p className="mt-3 font-semibold text-bone">
            {formatCOP(price)}
            {isEssence ? " / gramo" : ""}
          </p>
        ) : isEssence ? (
          <p className="mt-3 text-xs text-bone-60">
            Crea tu perfume personalizado con esta esencia
          </p>
        ) : null}
        {sellByGram && (
          <div className="mt-3 space-y-1">
            <label className="flex items-center gap-2 text-xs text-bone-60">
              <span className="uppercase tracking-widest text-gold-400">Gramos</span>
              <input
                type="number"
                min={minQty}
                step={1}
                value={grams}
                onChange={(e) =>
                  setGrams(Math.max(minQty, Number(e.target.value) || minQty))
                }
                className="h-9 w-20 rounded-sm border border-gold-400/30 bg-white/5 px-2 text-bone"
              />
            </label>
            <p className="text-xs text-bone-60">
              mín. {minQty} g · total {formatCOP(price * grams)}
            </p>
          </div>
        )}
        {showPrice && wholesale && product.minQty ? (
          <p className="text-xs text-bone-60 mt-1">Mín. {product.minQty} uds</p>
        ) : null}
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <AddToListButton target={listTarget} />
        {isEssence && mode === "create" ? (
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
