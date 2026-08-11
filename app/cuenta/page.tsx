"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { AccountAccessPanel } from "../../components/account/AccountAccessPanel";
import { AccountDangerZone } from "../../components/account/AccountDangerZone";
import { Section } from "../../components/layout/Section";
import {
  needsProfileCompletion,
  repairCustomerEmail,
  startGoogleLogin,
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
  const itemCount = useCartStore((s) => s.lines.length);

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
  const [cedula, setCedula] = useState("");
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
    setCedula(customer.cedula || "");
    setShowCompleteModal(needsProfileCompletion(customer));
  }, [customer]);

  useEffect(() => {
    if (!customer || customer.email) return;
    let cancelled = false;
    void repairCustomerEmail().then((next) => {
      if (!cancelled && next) setCustomer(next);
    });
    return () => {
      cancelled = true;
    };
  }, [customer, setCustomer]);

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
  const cedulaLocked = Boolean(customer?.cedula);

  const resetProfileFields = () => {
    if (!customer) return;
    setFirstName(customer.first_name || "");
    setLastName(customer.last_name || "");
    setPhone(customer.phone || "");
    setBirthday(customer.birthday || "");
    setCedula(customer.cedula || "");
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
    const lockedCedula = Boolean(customer?.cedula);
    if (!phone.trim()) {
      setProfileError("El teléfono es obligatorio.");
      return;
    }
    if (!lockedBirthday && !birthday) {
      setProfileError("El cumpleaños es obligatorio.");
      return;
    }
    if (!lockedCedula && !cedula.trim()) {
      setProfileError("La cédula es obligatoria.");
      return;
    }
    setSaving(true);
    const result = await updateCustomerProfile({
      firstName,
      lastName,
      phone,
      ...(lockedBirthday ? {} : { birthday }),
      ...(lockedCedula ? {} : { cedula }),
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
      <Section tone="light" className="min-h-[50vh]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
          <p className="text-sm text-ink-60">Cargando cuenta…</p>
        </div>
      </Section>
    );
  }

  if (!customer) {
    return (
      <Section tone="light" className="min-h-[50vh]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
          <header className="mb-8 border-b-2 border-gold-400/40 pb-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
              Perfumas
            </p>
            <h1 className="font-display text-3xl text-ink sm:text-4xl">Mi cuenta</h1>
            <p className="mt-2 text-sm text-ink-60">
              Inicia sesión para ver tu historial y volver a pedir con un clic.
            </p>
          </header>
          <div className="overflow-hidden rounded-sm border-2 border-ink/10 bg-white p-5 shadow-[0_2px_0_0_rgba(202,169,105,0.2)] sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/cuenta/login">Iniciar sesión</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/cuenta/registro">Crear cuenta</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-ink-60">
              ¿Eres emprendedor?{" "}
              <Link
                href="/mayoristas"
                className="font-semibold text-ink underline decoration-gold-400 underline-offset-4 hover:text-gold-400"
              >
                Portal mayoristas
              </Link>
            </p>
          </div>
        </div>
      </Section>
    );
  }

  const displayEmail = customer.email || "—";
  const { active: activeOrders, history: historyOrders } = splitAccountOrders(orders);

  const renderOrderList = (
    list: AccountOrder[],
    opts: { empty: string; showReorder: boolean }
  ) => (
    <div className="space-y-2.5">
      {ordersLoading && (
        <p className="text-sm text-ink-60">Cargando pedidos…</p>
      )}
      {ordersError && <p className="text-sm text-red-600">{ordersError}</p>}
      {!ordersLoading && !ordersError && list.length === 0 && (
        <p className="rounded-sm border border-dashed border-ink/15 bg-paper-soft px-3 py-4 text-sm text-ink-60">
          {opts.empty}
        </p>
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
            className="space-y-2 rounded-sm border-2 border-ink/10 bg-paper-soft p-3.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  Pedido #{order.display_id ?? order.id.slice(-6)}
                </p>
                <p className="text-xs text-ink-60">{created}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gold-400">
                  {orderStatusLabel(order)}
                </p>
              </div>
              <p className="text-sm font-semibold text-gold-400">
                {formatCOP(order.total ?? 0)}
              </p>
            </div>

            <ul className="space-y-1.5 border-t border-ink/10 pt-2">
              {(order.items || []).map((item, idx) => {
                const lineKey = `${orderKey}-${item.id || idx}`;
                return (
                  <li
                    key={lineKey}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-ink">
                      {item.title || "Artículo"}{" "}
                      <span className="text-ink-60">× {item.quantity || 1}</span>
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
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <header className="mb-6 border-b-2 border-gold-400/40 pb-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
            Perfumas
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl text-ink sm:text-4xl">Mi cuenta</h1>
              <p className="mt-1 text-sm text-ink-60">
                {[customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
                  displayEmail}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              {loggingOut ? "Cerrando…" : "Cerrar sesión"}
            </Button>
          </div>
        </header>

        {showCompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-sm border-2 border-ink/10 bg-white shadow-xl">
              <div className="border-b border-gold-400/30 bg-ink px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">
                  Perfil incompleto
                </p>
              </div>
              <div className="p-5">
                <h2 className="mb-2 font-display text-2xl text-ink">Completa tu perfil</h2>
                <p className="mb-5 text-sm text-ink-60">
                  Para continuar, necesitamos tu teléfono, cédula y cumpleaños.
                </p>
                <form
                  onSubmit={(e) => void saveProfile(e, true)}
                  className="space-y-4"
                >
                  <div>
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
                  {!cedulaLocked ? (
                    <div>
                      <Label htmlFor="modal-cedula">Cédula</Label>
                      <Input
                        id="modal-cedula"
                        type="text"
                        inputMode="numeric"
                        required
                        value={cedula}
                        onChange={(e) =>
                          setCedula(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="1234567890"
                      />
                    </div>
                  ) : null}
                  {!birthdayLocked ? (
                    <div>
                      <Label htmlFor="modal-birthday">Cumpleaños</Label>
                      <Input
                        id="modal-birthday"
                        type="date"
                        required
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                      />
                    </div>
                  ) : null}
                  {profileError && (
                    <p className="text-sm text-red-600">{profileError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Guardando…" : "Guardar y continuar"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {/* Quick strip: cart */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border-2 border-gold-400/40 bg-white px-4 py-3 shadow-[0_2px_0_0_rgba(202,169,105,0.2)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-400">
                Carrito actual
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                {itemCount} artículo{itemCount === 1 ? "" : "s"}
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/carrito">Ver carrito</Link>
            </Button>
          </div>

          {/* Profile */}
          <section
            id="detalles"
            className="overflow-hidden rounded-sm border-2 border-ink/10 bg-white shadow-[0_2px_0_0_rgba(202,169,105,0.2)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-400/30 bg-ink px-4 py-2.5 sm:px-5">
              <h2 className="font-display text-lg text-white">Perfil</h2>
              {!editingProfile ? (
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
              ) : null}
            </div>
            <div className="p-4 sm:p-5">
              {!editingProfile ? (
                <div className="space-y-4">
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-sm border border-ink/10 bg-paper-soft px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-60">
                        Nombre
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">
                        {[customer.first_name, customer.last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </dd>
                    </div>
                    <div className="rounded-sm border border-ink/10 bg-paper-soft px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-60">
                        Correo
                      </dt>
                      <dd className="mt-1 truncate text-sm font-semibold text-ink">
                        {displayEmail}
                      </dd>
                    </div>
                    <div className="rounded-sm border border-ink/10 bg-paper-soft px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-60">
                        Teléfono
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">
                        {customer.phone || "—"}
                      </dd>
                    </div>
                    <div className="rounded-sm border border-ink/10 bg-paper-soft px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-60">
                        Cédula
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">
                        {customer.cedula || "—"}
                      </dd>
                    </div>
                    <div className="rounded-sm border border-ink/10 bg-paper-soft px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-60">
                        Cumpleaños
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">
                        {formatBirthdayDisplay(customer.birthday)}
                      </dd>
                    </div>
                  </dl>
                  {profileMsg && (
                    <p className="text-sm font-medium text-gold-400">{profileMsg}</p>
                  )}
                  {!customer.email && (
                    <div className="space-y-2 rounded-sm border border-red-400/30 bg-red-50 p-3">
                      <p className="text-sm text-red-700">
                        No pudimos leer tu correo. Repara la cuenta con Google
                        o crea una contraseña abajo si ya tienes correo válido.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loggingOut}
                        onClick={() => {
                          void startGoogleLogin().then((result) => {
                            if (
                              result.ok &&
                              "redirect" in result &&
                              typeof result.redirect === "string"
                            ) {
                              window.location.href = result.redirect;
                              return;
                            }
                            if (!result.ok) setProfileError(result.error);
                          });
                        }}
                      >
                        Reparar con Google
                      </Button>
                    </div>
                  )}
                  <AccountAccessPanel />
                </div>
              ) : (
                <form onSubmit={(e) => void saveProfile(e)} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Correo</Label>
                    <p className="text-sm font-semibold text-ink">{displayEmail}</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="3001234567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cedula">Cédula</Label>
                    {cedulaLocked ? (
                      <p className="text-sm font-semibold text-ink">
                        {customer.cedula}
                        <span className="mt-1 block text-xs font-normal text-ink-60">
                          No se puede cambiar después de guardarla.
                        </span>
                      </p>
                    ) : (
                      <Input
                        id="cedula"
                        type="text"
                        inputMode="numeric"
                        required
                        value={cedula}
                        onChange={(e) =>
                          setCedula(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="1234567890"
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="birthday">Cumpleaños</Label>
                    {birthdayLocked ? (
                      <p className="text-sm font-semibold text-ink">
                        {formatBirthdayDisplay(customer.birthday)}
                        <span className="mt-1 block text-xs font-normal text-ink-60">
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
                    <p className="text-sm text-red-600">{profileError}</p>
                  )}
                  {profileMsg && (
                    <p className="text-sm font-medium text-gold-400">{profileMsg}</p>
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
                  </div>
                </form>
              )}
            </div>
          </section>

          {b2bProfile && (
            <section className="overflow-hidden rounded-sm border-2 border-ink/10 bg-white">
              <div className="border-b border-gold-400/30 bg-ink px-4 py-2.5 sm:px-5">
                <h2 className="font-display text-lg text-white">Mayorista</h2>
              </div>
              <div className="space-y-3 p-4 text-sm sm:p-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    <span className="text-ink-60">Negocio:</span>{" "}
                    <span className="font-semibold text-ink">
                      {b2bProfile.businessName}
                    </span>
                  </p>
                  <p>
                    <span className="text-ink-60">NIT:</span>{" "}
                    <span className="font-semibold text-ink">{b2bProfile.nit}</span>
                  </p>
                </div>
                <p className="flex items-center gap-2">
                  Estado:{" "}
                  <Badge
                    variant={b2bProfile.status === "approved" ? "b2b" : "secondary"}
                  >
                    {b2bProfile.status === "approved"
                      ? "Mayorista activo"
                      : "Pendiente"}
                  </Badge>
                </p>
                <div className="flex flex-wrap gap-2">
                  {isB2B && (
                    <Button asChild size="sm">
                      <Link href="/mayoristas/insumos">Catálogo mayorista</Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setB2BSession(null)}
                  >
                    Salir del portal mayorista
                  </Button>
                </div>
              </div>
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <section
              id="pedidos"
              className="overflow-hidden rounded-sm border-2 border-ink/10 bg-white"
            >
              <div className="border-b border-gold-400/30 bg-ink px-4 py-2.5">
                <h2 className="font-display text-lg text-white">Pedidos</h2>
                <p className="mt-0.5 text-[11px] text-gold-400/90">
                  En empaque, envío o listos para recoger
                </p>
              </div>
              <div className="space-y-3 p-3.5">
                {reorderMsg && (
                  <p className="text-sm font-medium text-gold-400">
                    {reorderMsg}{" "}
                    <Link href="/carrito" className="underline hover:text-ink">
                      Ir al carrito
                    </Link>
                  </p>
                )}
                {renderOrderList(activeOrders as AccountOrder[], {
                  empty: "No tienes pedidos en proceso ahora.",
                  showReorder: false,
                })}
              </div>
            </section>

            <section
              id="historial"
              className="overflow-hidden rounded-sm border-2 border-ink/10 bg-white"
            >
              <div className="border-b border-gold-400/30 bg-ink px-4 py-2.5">
                <h2 className="font-display text-lg text-white">Historial</h2>
                <p className="mt-0.5 text-[11px] text-gold-400/90">
                  Entregados o ya recogidos
                </p>
              </div>
              <div className="space-y-3 p-3.5">
                {renderOrderList(historyOrders as AccountOrder[], {
                  empty: "Aún no tienes compras completadas.",
                  showReorder: true,
                })}
              </div>
            </section>
          </div>

          <section
            id="zona-peligrosa"
            className="overflow-hidden rounded-sm border-2 border-red-600/25 bg-white"
          >
            <div className="border-b border-red-600/20 bg-ink px-4 py-2.5 sm:px-5">
              <h2 className="font-display text-lg text-white">Zona peligrosa</h2>
            </div>
            <div className="p-4 sm:p-5">
              <AccountDangerZone />
            </div>
          </section>
        </div>
      </div>
    </Section>
  );
}
