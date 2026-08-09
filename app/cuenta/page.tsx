"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { isMedusaConfigured, medusa } from "../../lib/medusa";
import { reorderLineItem, type ReorderLine } from "../../lib/reorder";
import { formatCOP } from "../../lib/utils";
import { useCartStore } from "../../store/useCartStore";
import { useCustomerStore } from "../../store/useCustomerStore";

type AccountOrder = {
  id: string;
  display_id?: number | null;
  created_at?: string | null;
  total?: number | null;
  currency_code?: string | null;
  items?: ReorderLine[] | null;
};

export default function CuentaPage() {
  const customer = useCustomerStore((s) => s.customer);
  const loadingCustomer = useCustomerStore((s) => s.loading);
  const clearCustomer = useCustomerStore((s) => s.clear);

  const isB2B = useCartStore((s) => s.isB2B);
  const b2bProfile = useCartStore((s) => s.b2bProfile);
  const setB2BSession = useCartStore((s) => s.setB2BSession);
  const itemCount = useCartStore((s) =>
    s.lines.reduce((sum, line) => sum + line.quantity, 0)
  );

  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!customer || !isMedusaConfigured()) {
      setOrders([]);
      return;
    }

    let cancelled = false;
    setOrdersLoading(true);
    setOrdersError(null);

    medusa.store.order
      .list({
        limit: 20,
        fields: "*items,*items.metadata,*items.product,*items.variant",
      })
      .then(({ orders: list }) => {
        if (cancelled) return;
        setOrders((list || []) as AccountOrder[]);
      })
      .catch(() => {
        if (cancelled) return;
        setOrdersError("No pudimos cargar tus pedidos.");
        setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customer]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await clearCustomer();
    setLoggingOut(false);
  };

  const handleReorder = async (item: ReorderLine, key: string) => {
    setReorderMsg(null);
    setReorderingId(key);
    const result = await reorderLineItem(item);
    setReorderingId(null);
    if (!result.ok) {
      setReorderMsg(result.error);
      return;
    }
    setReorderMsg(
      result.kind === "build"
        ? "Fragancia añadida al carrito."
        : "Producto añadido al carrito."
    );
  };

  if (loadingCustomer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <p className="text-sm text-bone-60">Cargando cuenta…</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <h1 className="font-display text-3xl text-bone mb-4">Mi cuenta</h1>
        <p className="text-sm text-bone-60 mb-6">
          Inicia sesión para ver tu historial de compras y volver a pedir con un clic.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/cuenta/login">Iniciar sesión</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/cuenta/registro">Crear cuenta</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/mayoristas">Portal mayoristas</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    customer.email;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-8">Mi cuenta</h1>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-bone-60">
            <p>
              <span className="text-bone">Nombre:</span> {displayName}
            </p>
            <p>
              <span className="text-bone">Correo:</span> {customer.email}
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              {loggingOut ? "Cerrando…" : "Cerrar sesión"}
            </Button>
          </CardContent>
        </Card>

        {b2bProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Mayorista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-bone-60">
              <p>
                <span className="text-bone">Negocio:</span> {b2bProfile.businessName}
              </p>
              <p>
                <span className="text-bone">NIT:</span> {b2bProfile.nit}
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
                Salir del portal mayorista
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Carrito actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-bone-60 mb-3">{itemCount} artículo(s) en el carrito</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/carrito">Ver carrito</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reorderMsg && (
              <p className="text-sm text-gold-400">
                {reorderMsg}{" "}
                <Link href="/carrito" className="underline hover:text-gold-100">
                  Ir al carrito
                </Link>
              </p>
            )}

            {ordersLoading && (
              <p className="text-sm text-bone-60">Cargando pedidos…</p>
            )}
            {ordersError && <p className="text-sm text-red-300">{ordersError}</p>}
            {!ordersLoading && !ordersError && orders.length === 0 && (
              <p className="text-sm text-bone-60">
                Aún no tienes pedidos. Cuando compres con tu cuenta, aparecerán aquí.
              </p>
            )}

            {orders.map((order) => {
              const orderKey = order.id;
              const created = order.created_at
                ? new Date(order.created_at).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—";
              return (
                <div
                  key={orderKey}
                  className="border border-gold-400/20 rounded-sm p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-bone font-medium">
                        Pedido #{order.display_id ?? order.id.slice(-6)}
                      </p>
                      <p className="text-xs text-bone-60">{created}</p>
                    </div>
                    <p className="text-sm text-gold-400">
                      {formatCOP(order.total ?? 0)}
                    </p>
                  </div>

                  <ul className="space-y-2">
                    {(order.items || []).map((item, idx) => {
                      const lineKey = `${orderKey}-${item.id || idx}`;
                      return (
                        <li
                          key={lineKey}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-bone-60">
                            {item.title || "Artículo"} × {item.quantity || 1}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reorderingId === lineKey}
                            onClick={() => void handleReorder(item, lineKey)}
                          >
                            {reorderingId === lineKey
                              ? "Añadiendo…"
                              : "Volver a comprar"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
