import { DEPARTMENTS, getProductsByDepartment } from "../../lib/catalog";
import type { Department } from "../../lib/catalog-types";
import { ProductCard } from "./ProductCard";

export function DepartmentGrid({
  department,
  wholesale = false,
}: {
  department: Department;
  wholesale?: boolean;
}) {
  const products = getProductsByDepartment(department);
  const meta = DEPARTMENTS.find((d) => d.id === department);

  return (
    <div>
      <h1 className="font-display text-3xl text-bone mb-2">{meta?.label ?? department}</h1>
      <p className="text-sm text-bone-60 mb-8">{meta?.description}</p>
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
