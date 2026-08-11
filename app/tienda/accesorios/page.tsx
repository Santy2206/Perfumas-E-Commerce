import { listCatalogProducts } from "../../../lib/medusa-catalog";
import { AccesoriosBrowser } from "../../../components/shop/AccesoriosBrowser";
import { Section } from "../../../components/layout/Section";

export const metadata = { title: "Accesorios" };
export const revalidate = 120;

export default async function AccesoriosPage() {
  const { products, source } = await listCatalogProducts({
    department: "accesorios",
  });
  const sourceLabel =
    source === "medusa"
      ? "Catálogo en vivo"
      : "Catálogo local (Medusa no disponible)";

  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <AccesoriosBrowser products={products} sourceLabel={sourceLabel} />
      </div>
    </Section>
  );
}
