"use client";

import Link from "next/link";
import { useCartStore } from "../../store/useCartStore";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function CuentaPage() {
  const isB2B = useCartStore((s) => s.isB2B);
  const b2bProfile = useCartStore((s) => s.b2bProfile);
  const setB2BSession = useCartStore((s) => s.setB2BSession);
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-8">Mi cuenta</h1>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-bone-60">
            {b2bProfile ? (
              <>
                <p>
                  <span className="text-bone">Negocio:</span> {b2bProfile.businessName}
                </p>
                <p>
                  <span className="text-bone">NIT:</span> {b2bProfile.nit}
                </p>
                <p>
                  <span className="text-bone">Correo:</span> {b2bProfile.email}
                </p>
                <p className="flex items-center gap-2">
                  Estado:{" "}
                  <Badge variant={b2bProfile.status === "approved" ? "b2b" : "secondary"}>
                    {b2bProfile.status === "approved" ? "Mayorista activo" : "Pendiente"}
                  </Badge>
                </p>
                {isB2B && (
                  <Button asChild size="sm">
                    <Link href="/mayoristas/insumos">Catálogo mayorista</Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setB2BSession(null)}>
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <>
                <p>No has iniciado sesión.</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href="/mayoristas">Portal mayoristas</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/crear">Crear fragancia</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carrito actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-bone-60 mb-3">{itemCount()} artículo(s) en el carrito</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/carrito">Ver carrito</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-bone-60">
              El historial de pedidos aparece aquí cuando Medusa Customer Auth está conectado.
              Mientras tanto, guarda el número de pedido que recibes al checkout.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
