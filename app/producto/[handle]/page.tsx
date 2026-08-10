import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogProductByHandle } from "../../../lib/medusa-catalog";
import { formatCOP } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { AddToCartButton } from "../../../components/shop/AddToCartButton";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const { product } = await getCatalogProductByHandle(handle);
  return { title: product?.title ?? "Producto" };
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const { product } = await getCatalogProductByHandle(handle);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div
          className={
            product.imageUrl
              ? "aspect-square rounded-sm bg-white p-4 flex items-center justify-center overflow-hidden border border-gold-400/20"
              : "aspect-square rounded-sm bg-wine-900 flex items-center justify-center overflow-hidden border border-gold-400/20"
          }
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.title}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="font-display text-6xl text-gold-400/40">{product.title.charAt(0)}</span>
          )}
        </div>
        <div>
          <Badge variant="outline" className="mb-4">{product.category}</Badge>
          <h1 className="font-display text-3xl text-bone mb-3">{product.title}</h1>
          {product.description && <p className="text-bone-60 mb-6">{product.description}</p>}
          {product.metadata?.product_kind === "essence" ? (
            <>
              <p className="font-display text-xl text-gold-400 mb-2">
                {formatCOP(product.price)} / gramo
              </p>
              <p className="text-sm text-bone-60 mb-6">
                En el creador el total depende del envase. También puedes comprar el aceite en
                Insumos.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/crear?fragrance=${product.id}`}
                  className="inline-flex h-11 items-center rounded-sm bg-gold-400 px-6 text-sm font-semibold uppercase tracking-widest text-wine-950 hover:bg-gold-100"
                >
                  Crear fragancia con esta esencia
                </Link>
                <AddToCartButton product={product} />
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-2xl text-gold-400 mb-2">{formatCOP(product.price)}</p>
              {product.wholesalePrice != null && (
                <p className="text-sm text-bone-60 mb-6">
                  Precio mayorista: {formatCOP(product.wholesalePrice)}
                  {product.minQty ? ` · mín. ${product.minQty} uds` : ""}
                </p>
              )}
              <AddToCartButton product={product} />
            </>
          )}
          <p className="mt-8">
            <Link href={`/tienda/${product.department}`} className="text-sm text-bone-60 underline hover:text-gold-400">
              ← Volver a {product.department}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
