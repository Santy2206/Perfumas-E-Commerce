import { DEPARTMENTS } from "../../lib/catalog";
import { listCatalogProducts } from "../../lib/medusa-catalog";
import type { Department } from "../../lib/catalog-types";
import { PaginatedProductGrid } from "./PaginatedProductGrid";

export async function DepartmentGrid({
  department,
  wholesale = false,
}: {
  department: Department;
  wholesale?: boolean;
}) {
  const { products, source } = await listCatalogProducts({ department });
  const meta = DEPARTMENTS.find((d) => d.id === department);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2">{meta?.label ?? department}</h1>
      <p className="text-sm text-ink-60 mb-2">{meta?.description}</p>
      {source === "medusa" ? (
        <p className="mb-8 text-xs uppercase tracking-widest text-gold-400">Catálogo en vivo</p>
      ) : (
        <p className="mb-8 text-xs uppercase tracking-widest text-ink-60">Catálogo local (Medusa no disponible)</p>
      )}
      {products.length === 0 ? (
        <p className="text-ink-60">Pronto habrá productos en esta categoría.</p>
      ) : (
        <PaginatedProductGrid products={products} wholesale={wholesale} />
      )}
    </div>
  );
}
