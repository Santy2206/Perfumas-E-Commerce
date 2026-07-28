import Link from "next/link";
import { DEPARTMENTS } from "../lib/catalog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-gold-400 uppercase tracking-[0.3em] text-xs mb-4">Perfumas · Bogotá desde 2015</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-bone mb-6 max-w-3xl mx-auto">
            Crea tu fragancia. Abastece tu negocio. Completa tu ritual.
          </h1>
          <p className="text-bone-60 max-w-2xl mx-auto mb-10 text-base sm:text-lg">
            Perfumería personalizada, insumos para emprendedores, cuidado del hogar y accesorios — todo en un solo lugar.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/crear">Crear mi fragancia →</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/tienda">Explorar tienda</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/mayoristas">Portal mayoristas</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-2xl text-bone mb-8 text-center">Nuestros departamentos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DEPARTMENTS.map((d) => (
              <Link key={d.id} href={d.href}>
                <Card className="h-full transition-colors hover:border-gold-400/50">
                  <CardHeader>
                    <CardTitle>{d.label}</CardTitle>
                    <CardDescription>{d.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xs uppercase tracking-widest text-gold-400">Ver →</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
