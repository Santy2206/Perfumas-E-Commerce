import Link from "next/link";
import { DEPARTMENTS } from "../../lib/catalog";
import { Card, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export const metadata = { title: "Tienda" };

export default function TiendaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-2">Tienda</h1>
      <p className="text-sm text-bone-60 mb-10">Elige un departamento para explorar el catálogo.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {DEPARTMENTS.map((d) => (
          <Link key={d.id} href={d.href}>
            <Card className="h-full hover:border-gold-400/50 transition-colors">
              <CardHeader>
                <CardTitle>{d.label}</CardTitle>
                <CardDescription>{d.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
