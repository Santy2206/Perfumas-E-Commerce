import { listCatalogProducts } from "../../../lib/medusa-catalog";
import { PerfumeriaBrowser } from "../../../components/shop/PerfumeriaBrowser";
import { Section } from "../../../components/layout/Section";

export const metadata = { title: "Preparadas" };
export const revalidate = 120;

export default async function PerfumeriaPage() {
  const [{ products: replicas, source }, { products: essences }] = await Promise.all([
    listCatalogProducts({
      department: "perfumeria",
      productKind: "prepared_replica",
    }),
    listCatalogProducts({
      department: "insumos",
      productKind: "essence",
    }),
  ]);

  const sourceLabel =
    source === "medusa"
      ? "Catálogo en vivo"
      : "Catálogo local (Medusa no disponible)";

  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <PerfumeriaBrowser
          replicas={replicas}
          essences={essences}
          sourceLabel={sourceLabel}
        />
      </div>
    </Section>
  );
}
