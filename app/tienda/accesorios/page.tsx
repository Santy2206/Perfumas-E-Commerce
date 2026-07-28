import { DepartmentGrid } from "../../../components/shop/DepartmentGrid";

export const metadata = { title: "Accesorios" };

export default function AccesoriosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <DepartmentGrid department="accesorios" />
    </div>
  );
}
