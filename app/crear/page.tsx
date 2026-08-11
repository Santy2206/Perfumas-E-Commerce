import { Suspense } from "react";
import CrearClient from "./CrearClient";
import { Section } from "../../components/layout/Section";

export const metadata = { title: "Preparar fragancia" };

export default function CrearPage() {
  return (
    <Suspense
      fallback={
        <Section tone="light" className="min-h-[50vh]">
          <div className="p-10 text-ink-60">Cargando constructor…</div>
        </Section>
      }
    >
      <CrearClient />
    </Suspense>
  );
}
