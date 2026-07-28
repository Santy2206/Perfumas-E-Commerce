import { DepartmentGrid } from "../../../components/shop/DepartmentGrid";

export const metadata = { title: "Hogar y cuidado" };

export default function HogarPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <DepartmentGrid department="hogar" />
    </div>
  );
}
