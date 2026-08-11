import { listCatalogProducts } from "../../../lib/medusa-catalog";
import { HogarBrowser } from "../../../components/shop/HogarBrowser";
import { Section } from "../../../components/layout/Section";

export const metadata = { title: "Hogar y cuidado" };
export const revalidate = 120;

export default async function HogarPage() {
  const { products, source } = await listCatalogProducts({ department: "hogar" });
  const sourceLabel =
    source === "medusa"
      ? "Catálogo en vivo"
      : "Catálogo local (Medusa no disponible)";

  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <HogarBrowser products={products} sourceLabel={sourceLabel} />
      </div>
    </Section>
  );
}
