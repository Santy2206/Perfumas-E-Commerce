import { Suspense } from "react";
import Link from "next/link";
import { listCatalogProducts } from "../../../lib/medusa-catalog";
import { InsumosBrowser } from "../../../components/shop/InsumosBrowser";
import { MayoristasGate } from "../../../components/shop/MayoristasGate";
import { Section } from "../../../components/layout/Section";

export const metadata = { title: "Insumos mayoristas" };

export default async function MayoristasInsumosPage() {
  const { products, source } = await listCatalogProducts({ department: "insumos" });
  const sourceLabel =
    source === "medusa"
      ? "Catálogo en vivo · precios mayoristas"
      : "Catálogo local · precios mayoristas";

  return (
    <MayoristasGate>
      <Section tone="light" className="min-h-[50vh]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
          <Suspense fallback={<p className="text-ink-60">Cargando…</p>}>
            <InsumosBrowser
              products={products}
              wholesale
              sourceLabel={sourceLabel}
            />
          </Suspense>
          <p className="mt-8 text-sm text-ink-60">
            <Link href="/mayoristas" className="underline hover:text-gold-400">
              ← Portal mayoristas
            </Link>
          </p>
        </div>
      </Section>
    </MayoristasGate>
  );
}
