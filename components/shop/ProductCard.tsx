"use client";

import Link from "next/link";
import { formatCOP, cn } from "../../lib/utils";
import type { CatalogProduct } from "../../lib/catalog-types";
import { bulkDiscountPct, bulkDiscountedUnitPrice } from "../../lib/bulk-discount";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useCartStore } from "../../store/useCartStore";
import { useState } from "react";
import { LikeButton } from "../favorites/LikeButton";
import { AddToListButton } from "../favorites/AddToListButton";
import { GramsQuantityInput } from "./GramsQuantityInput";

export function ProductCard({
  product,
  wholesale = false,
  /** create = essence inspiration (no $/g); buy = add to cart with price */
  intent,
  highlighted = false,
  /** list = compact row, no product image (used by the Insumos list view) */
  layout = "grid",
}: {
  product: CatalogProduct;
  wholesale?: boolean;
  intent?: "create" | "buy";
  highlighted?: boolean;
  layout?: "grid" | "list";
}) {
  const addSku = useCartStore((s) => s.addSku);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const kind = product.metadata?.product_kind;
  const isEssence = kind === "essence";
  const mode = intent ?? (isEssence ? "create" : "buy");
  const sellByGram = isEssence && mode === "buy" && !wholesale;
  const minQty =
    product.minQty ?? (sellByGram ? 30 : wholesale ? (product.minQty ?? 1) : 1);
  const [grams, setGrams] = useState(minQty);

  const price =
    wholesale && product.wholesalePrice != null
      ? product.wholesalePrice
      : product.price;

  // Bulk discount only applies to retail essences sold by weight.
  const discountPct = sellByGram ? bulkDiscountPct(grams) : 0;
  const unitPrice = sellByGram ? bulkDiscountedUnitPrice(price, grams) : price;
  const lineTotal = unitPrice * grams;
  const originalLineTotal = price * grams;

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

  const priceBlock = showPrice && !sellByGram ? (
    <p className="mt-3 font-semibold text-ink">
      {formatCOP(price)}
      {isEssence ? " / gramo" : ""}
    </p>
  ) : isEssence && !sellByGram ? (
    <p className="mt-3 text-xs text-ink-60">
      Prepara tu perfume personalizado con esta esencia
    </p>
  ) : null;

  const gramsBlock = sellByGram && (
    <div className="mt-3 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-ink">
          Total {formatCOP(lineTotal)}
          {discountPct > 0 && (
            <span className="ml-1 text-xs font-normal text-ink-60 line-through">
              {formatCOP(originalLineTotal)}
            </span>
          )}
        </p>
        {discountPct > 0 && (
          <Badge>-{Math.round(discountPct * 100)}% dcto.</Badge>
        )}
      </div>
      <GramsQuantityInput value={grams} min={minQty} onChange={setGrams} />
      <p className="text-xs text-ink-60">mín. {minQty} g</p>
    </div>
  );

  const addButton = isEssence && mode === "create" ? (
    <Button asChild className="w-full" size="sm">
      <Link href={`/crear?fragrance=${product.id}`}>Preparar con esta</Link>
    </Button>
  ) : (
    <Button className="w-full" size="sm" onClick={onAdd}>
      {added ? "Agregado ✓" : "Agregar"}
    </Button>
  );

  if (layout === "list") {
    return (
      <div
        id={`product-${product.id}`}
        className={cn(
          "flex flex-col gap-3 border-b border-ink/10 py-4 scroll-mt-28 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
          highlighted && "bg-gold-400/5 ring-2 ring-gold-400/50"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{product.category}</Badge>
            {wholesale && <Badge variant="b2b">Mayorista</Badge>}
          </div>
          <Link
            href={`/producto/${product.handle}`}
            className="font-display text-base text-ink hover:text-gold-400"
            title={product.title}
          >
            {product.title}
          </Link>
          {product.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-60">
              {product.description}
            </p>
          )}
          {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
          {priceBlock}
          {gramsBlock}
          <LikeButton
            productId={product.id}
            productKind={typeof kind === "string" ? kind : undefined}
            title={product.title}
            handle={product.handle}
          />
          <AddToListButton target={listTarget} />
          <div className="w-full sm:w-auto">{addButton}</div>
        </div>
      </div>
    );
  }

  return (
    <Card
      id={`product-${product.id}`}
      className={cn(
        "flex flex-col scroll-mt-28",
        highlighted && "ring-2 ring-gold-400/70",
      )}
    >
      <CardHeader>
        <div
          className={cn(
            "group/image relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-sm",
            "bg-paper-soft",
          )}
        >
          {product.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.title}
                className={cn(
                  "h-full w-full object-contain p-2 transition-opacity duration-300",
                  product.hoverImageUrl && "group-hover/image:opacity-0",
                )}
              />
              {product.hoverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.hoverImageUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-contain p-2 opacity-0 transition-opacity duration-300 group-hover/image:opacity-100"
                />
              )}
            </>
          ) : (
            <span className="font-display text-3xl text-gold-400/50">
              {product.title.charAt(0)}
            </span>
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
        <CardTitle className="min-h-[2.75rem] leading-snug">
          <Link
            href={`/producto/${product.handle}`}
            className="line-clamp-2 hover:text-gold-400"
            title={product.title}
          >
            {product.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {product.description && (
          <p className="text-xs text-ink-60 line-clamp-2">
            {product.description}
          </p>
        )}
        {priceBlock}
        {gramsBlock}
        {showPrice && wholesale && product.minQty ? (
          <p className="text-xs text-ink-60 mt-1">Mín. {product.minQty} uds</p>
        ) : null}
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <AddToListButton target={listTarget} />
        {addButton}
      </CardFooter>
    </Card>
  );
}
