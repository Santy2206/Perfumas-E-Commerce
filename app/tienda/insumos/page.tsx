import { Suspense } from "react";
import { listCatalogProducts } from "../../../lib/medusa-catalog";
import { InsumosBrowser } from "../../../components/shop/InsumosBrowser";
import { Section } from "../../../components/layout/Section";

export const metadata = { title: "Insumos" };
export const revalidate = 120;

export default async function InsumosPage({
  searchParams,
}: {
  searchParams?: Promise<{ wholesale?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const wholesale = sp.wholesale === "1";
  const { products, source } = await listCatalogProducts({ department: "insumos" });
  const sourceLabel =
    source === "medusa"
      ? "Catálogo en vivo"
      : "Catálogo local (Medusa no disponible)";

  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <Suspense fallback={<p className="text-ink-60">Cargando insumos…</p>}>
          <InsumosBrowser
            products={products}
            wholesale={wholesale}
            sourceLabel={sourceLabel}
          />
        </Suspense>
      </div>
    </Section>
  );
}
