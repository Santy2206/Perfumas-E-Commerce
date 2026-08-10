"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  needsProfileCompletion,
  updateCustomerProfile,
} from "../../lib/auth";
import {
  orderStatusLabel,
  splitAccountOrders,
  type AccountOrderLike,
} from "../../lib/account-orders";
import { isMedusaConfigured, medusa } from "../../lib/medusa";
import { reorderLineItem, type ReorderLine } from "../../lib/reorder";
import { formatCOP } from "../../lib/utils";
import { useCartStore } from "../../store/useCartStore";
import { useCustomerStore } from "../../store/useCustomerStore";

type AccountOrder = AccountOrderLike & {
  items?: ReorderLine[] | null;
};

export default function CuentaPage() {
  const customer = useCustomerStore((s) => s.customer);
  const loadingCustomer = useCustomerStore((s) => s.loading);
  const clearCustomer = useCustomerStore((s) => s.clear);
  const setCustomer = useCustomerStore((s) => s.setCustomer);

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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setFirstName(customer.first_name || "");
    setLastName(customer.last_name || "");
    setPhone(customer.phone || "");
    setBirthday(customer.birthday || "");
    setShowCompleteModal(needsProfileCompletion(customer));
  }, [customer]);

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
        limit: 50,
        fields:
          "*items,*items.metadata,*items.product,*items.variant,+metadata,+status,+fulfillment_status",
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

  const birthdayLocked = Boolean(customer?.birthday);

  const resetProfileFields = () => {
    if (!customer) return;
    setFirstName(customer.first_name || "");
    setLastName(customer.last_name || "");
    setPhone(customer.phone || "");
    setBirthday(customer.birthday || "");
    setProfileError(null);
    setProfileMsg(null);
  };

  const cancelEditProfile = () => {
    resetProfileFields();
    setEditingProfile(false);
  };

  const saveProfile = async (e?: FormEvent, fromModal = false) => {
    e?.preventDefault();
    setProfileError(null);
    setProfileMsg(null);
    const lockedBirthday = Boolean(customer?.birthday);
    if (!phone.trim()) {
      setProfileError("El teléfono es obligatorio.");
      return;
    }
    if (!lockedBirthday && !birthday) {
      setProfileError("El cumpleaños es obligatorio.");
      return;
    }
    setSaving(true);
    const result = await updateCustomerProfile({
      firstName,
      lastName,
      phone,
      ...(lockedBirthday ? {} : { birthday }),
    });
    setSaving(false);
    if (!result.ok) {
      setProfileError(result.error);
      return;
    }
    setCustomer(result.customer);
    setProfileMsg("Perfil actualizado.");
    setEditingProfile(false);
    if (fromModal) setShowCompleteModal(false);
  };

  const formatBirthdayDisplay = (value: string | null | undefined) => {
    if (!value) return "—";
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("es-CO", {
      month: "long",
      day: "numeric",
    });
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

  const displayEmail = customer.email || "—";
  const { active: activeOrders, history: historyOrders } = splitAccountOrders(orders);

  const renderOrderList = (
    list: AccountOrder[],
    opts: { empty: string; showReorder: boolean }
  ) => (
    <div className="space-y-4">
      {ordersLoading && (
        <p className="text-sm text-bone-60">Cargando pedidos…</p>
      )}
      {ordersError && <p className="text-sm text-red-300">{ordersError}</p>}
      {!ordersLoading && !ordersError && list.length === 0 && (
        <p className="text-sm text-bone-60">{opts.empty}</p>
      )}
      {list.map((order) => {
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
                <p className="mt-1 text-xs uppercase tracking-widest text-gold-400">
                  {orderStatusLabel(order)}
                </p>
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
                    {opts.showReorder && (
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
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-8">Mi cuenta</h1>

      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-wine-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-gold-400/30 bg-wine-900 p-6 shadow-xl">
            <h2 className="font-display text-2xl text-bone mb-2">Completa tu perfil</h2>
            <p className="text-sm text-bone-60 mb-6">
              Para continuar, necesitamos tu teléfono y cumpleaños.
            </p>
            <form
              onSubmit={(e) => void saveProfile(e, true)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="modal-phone">Teléfono</Label>
                <Input
                  id="modal-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="3001234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-birthday">Cumpleaños</Label>
                <Input
                  id="modal-birthday"
                  type="date"
                  required
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
              {profileError && (
                <p className="text-sm text-red-300">{profileError}</p>
              )}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Guardando…" : "Guardar y continuar"}
              </Button>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        <Card id="detalles">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            {!editingProfile ? (
              <div className="space-y-4">
                <dl className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-bone-60">Nombre:</dt>
                    <dd className="text-bone font-medium">
                      {[customer.first_name, customer.last_name]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-bone-60">Correo:</dt>
                    <dd className="text-bone font-medium">{displayEmail}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-bone-60">Teléfono:</dt>
                    <dd className="text-bone font-medium">
                      {customer.phone || "—"}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-bone-60">Cumpleaños:</dt>
                    <dd className="text-bone font-medium">
                      {formatBirthdayDisplay(customer.birthday)}
                    </dd>
                  </div>
                </dl>
                {profileMsg && (
                  <p className="text-sm text-gold-400">{profileMsg}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      resetProfileFields();
                      setEditingProfile(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loggingOut}
                    onClick={() => void handleLogout()}
                  >
                    {loggingOut ? "Cerrando…" : "Cerrar sesión"}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void saveProfile(e)} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correo</Label>
                  <p className="text-sm text-bone">{displayEmail}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="3001234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Cumpleaños</Label>
                  {birthdayLocked ? (
                    <p className="text-sm text-bone">
                      {formatBirthdayDisplay(customer.birthday)}
                      <span className="mt-1 block text-xs text-bone-60">
                        No se puede cambiar después de guardarlo.
                      </span>
                    </p>
                  ) : (
                    <Input
                      id="birthday"
                      type="date"
                      required
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                    />
                  )}
                </div>
                {profileError && (
                  <p className="text-sm text-red-300">{profileError}</p>
                )}
                {profileMsg && (
                  <p className="text-sm text-gold-400">{profileMsg}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={cancelEditProfile}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loggingOut}
                    onClick={() => void handleLogout()}
                  >
                    {loggingOut ? "Cerrando…" : "Cerrar sesión"}
                  </Button>
                </div>
              </form>
            )}
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

        <Card id="pedidos">
          <CardHeader>
            <CardTitle>Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-bone-60">
              Pedidos en empaque, envío o listos para recoger.
            </p>
            {reorderMsg && (
              <p className="text-sm text-gold-400">
                {reorderMsg}{" "}
                <Link href="/carrito" className="underline hover:text-gold-100">
                  Ir al carrito
                </Link>
              </p>
            )}
            {renderOrderList(activeOrders as AccountOrder[], {
              empty: "No tienes pedidos en proceso ahora.",
              showReorder: false,
            })}
          </CardContent>
        </Card>

        <Card id="historial">
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-bone-60">
              Compras completadas: entregadas o ya recogidas.
            </p>
            {renderOrderList(historyOrders as AccountOrder[], {
              empty: "Aún no tienes compras completadas en el historial.",
              showReorder: true,
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
