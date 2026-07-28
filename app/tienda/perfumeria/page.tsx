import { DepartmentGrid } from "../../../components/shop/DepartmentGrid";

export const metadata = { title: "Perfumería" };

export default function PerfumeriaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <DepartmentGrid department="perfumeria" />
    </div>
  );
}
