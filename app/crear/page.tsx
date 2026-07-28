import { Suspense } from "react";
import CrearClient from "./CrearClient";

export const metadata = { title: "Crear fragancia" };

export default function CrearPage() {
  return (
    <Suspense fallback={<div className="p-10 text-bone-60">Cargando constructor…</div>}>
      <CrearClient />
    </Suspense>
  );
}
