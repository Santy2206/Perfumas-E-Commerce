import { DEPARTMENTS } from "../../lib/catalog";
import { listCatalogProducts } from "../../lib/medusa-catalog";
import type { Department } from "../../lib/catalog-types";
import { ProductCard } from "./ProductCard";

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
      <h1 className="font-display text-3xl text-bone mb-2">{meta?.label ?? department}</h1>
      <p className="text-sm text-bone-60 mb-2">{meta?.description}</p>
      {source === "medusa" ? (
        <p className="mb-8 text-xs uppercase tracking-widest text-gold-400/70">Catálogo en vivo</p>
      ) : (
        <p className="mb-8 text-xs uppercase tracking-widest text-bone-60">Catálogo local (Medusa no disponible)</p>
      )}
      {products.length === 0 ? (
        <p className="text-bone-60">Pronto habrá productos en esta categoría.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} wholesale={wholesale} />
          ))}
        </div>
      )}
    </div>
  );
}
