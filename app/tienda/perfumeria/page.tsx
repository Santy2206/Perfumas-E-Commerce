import { listCatalogProducts } from "../../../lib/medusa-catalog";
import { PerfumeriaBrowser } from "../../../components/shop/PerfumeriaBrowser";

export const metadata = { title: "Perfumería" };

export default async function PerfumeriaPage() {
  const [{ products: replicas, source }, { products: essences }] = await Promise.all([
    listCatalogProducts({ productKind: "prepared_replica" }),
    listCatalogProducts({ productKind: "essence" }),
  ]);

  const sourceLabel =
    source === "medusa"
      ? "Catálogo en vivo"
      : "Catálogo local (Medusa no disponible)";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <PerfumeriaBrowser
        replicas={replicas}
        essences={essences}
        sourceLabel={sourceLabel}
      />
    </div>
  );
}
