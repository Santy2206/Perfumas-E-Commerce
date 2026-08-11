"use client";

import Link from "next/link";
import { useState } from "react";
import { getProductById } from "../../lib/catalog";
import { BOTTLES, FRAGRANCES } from "../../lib/mock-data";
import {
  productKindLabel,
  type FavoriteItem,
} from "../../lib/favorites";
import { useCartStore } from "../../store/useCartStore";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export function FavoriteItemCard({
  item,
  onRemove,
  removing,
}: {
  item: FavoriteItem;
  onRemove: () => void;
  removing?: boolean;
}) {
  const addSku = useCartStore((s) => s.addSku);
  const [cartMsg, setCartMsg] = useState<string | null>(null);

  const addProductToCart = (productId: string, grams?: number) => {
    const product = getProductById(productId);
    if (!product) {
      setCartMsg("No encontramos este producto en el catálogo.");
      return;
    }
    const isEssence = product.metadata?.product_kind === "essence";
    const min = product.minQty ?? (isEssence ? 30 : 1);
    const qty = isEssence ? Math.max(min, grams ?? min) : 1;
    const result = addSku(product, qty);
    if (!result.ok) {
      setCartMsg(result.error);
      return;
    }
    setCartMsg(
      isEssence
        ? `Aceite añadido (${qty} g). Puedes ajustar gramos en el carrito.`
        : "Añadido al carrito."
    );
  };

  if (item.kind === "custom_build") {
    const fragrance = FRAGRANCES.find((f) => f.id === item.build.fragranceId);
    const bottle = BOTTLES.find((b) => b.id === item.build.bottleId);
    const href = `/crear?fragrance=${encodeURIComponent(item.build.fragranceId)}&bottle=${encodeURIComponent(item.build.bottleId)}`;
    return (
      <div className="rounded-sm border border-gold-400/25 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Badge variant="outline">{productKindLabel("custom_build")}</Badge>
            <p className="mt-2 font-display text-lg text-ink">{item.title}</p>
            <p className="text-xs text-ink-60">
              {fragrance?.contratipo || item.build.fragranceId}
              {bottle ? ` · ${bottle.name}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={removing}
            onClick={onRemove}
          >
            Quitar
          </Button>
        </div>
        <Button asChild size="sm" className="w-full">
          <Link href={href}>Continuar creación</Link>
        </Button>
      </div>
    );
  }

  const product = getProductById(item.productId);
  const title = product?.title || item.title || item.productId;
  const kind =
    item.productKind ||
    (typeof product?.metadata?.product_kind === "string"
      ? product.metadata.product_kind
      : undefined);
  const subtitle =
    kind === "bottle"
      ? "envases"
      : kind === "essence"
        ? "esencias"
        : kind === "prepared_replica"
          ? "réplicas preparadas"
          : product?.category || null;

  return (
    <div className="rounded-sm border border-gold-400/25 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge variant="outline">{productKindLabel(kind)}</Badge>
          <p className="mt-2 font-display text-lg text-ink">{title}</p>
          {subtitle && <p className="text-xs text-ink-60">{subtitle}</p>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={removing}
          onClick={onRemove}
        >
          Quitar
        </Button>
      </div>

      {cartMsg && <p className="text-xs text-gold-400">{cartMsg}</p>}

      {kind === "essence" && (
        <div className="flex flex-col gap-2">
          <Button asChild size="sm" className="w-full">
            <Link href={`/crear?fragrance=${encodeURIComponent(item.productId)}`}>
              Continuar con creación
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link
              href={`/tienda/insumos?cat=esencias&essence=${encodeURIComponent(item.productId)}`}
            >
              Comprar aceite
            </Link>
          </Button>
        </div>
      )}

      {kind === "bottle" && (
        <Button asChild size="sm" className="w-full">
          <Link href={`/crear?bottle=${encodeURIComponent(item.productId)}`}>
            Seleccionar para una creación
          </Link>
        </Button>
      )}

      {(kind === "prepared_replica" ||
        kind === "alcohol" ||
        kind === "pheromone" ||
        (!kind && Boolean(product))) && (
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => addProductToCart(item.productId)}
        >
          Añadir al carrito
        </Button>
      )}

      {!kind && !product && (
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href="/tienda">Ver en tienda</Link>
        </Button>
      )}
    </div>
  );
}
