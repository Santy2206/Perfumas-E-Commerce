import { DepartmentGrid } from "../../../components/shop/DepartmentGrid";

export const metadata = { title: "Insumos" };

export default function InsumosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <DepartmentGrid department="insumos" />
    </div>
  );
}
