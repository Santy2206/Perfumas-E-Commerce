"use client";

import Link from "next/link";
import { useCartStore } from "../../store/useCartStore";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export function MayoristasGate({ children }: { children: React.ReactNode }) {
  const isB2B = useCartStore((s) => s.isB2B);

  if (!isB2B) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">
          Acceso restringido
        </Badge>
        <h1 className="font-display text-2xl text-bone mb-4">Inicia sesión mayorista</h1>
        <p className="text-bone-60 mb-6">
          Este catálogo muestra precios y MOQ exclusivos para emprendedores aprobados.
        </p>
        <Button asChild>
          <Link href="/mayoristas">Ir al portal</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
