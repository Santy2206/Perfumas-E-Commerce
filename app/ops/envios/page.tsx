"use client";

import { useCallback, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

type ShippingOrder = {
  id: string;
  display_id?: number;
  email?: string | null;
  created_at?: string;
  shipping_address?: {
    address_1?: string | null;
    city?: string | null;
    phone?: string | null;
    province?: string | null;
  } | null;
  items?: Array<{ title?: string | null; quantity?: number | null }>;
  metadata?: Record<string, unknown> | null;
};

export default function OpsEnviosPage() {
  const [secret, setSecret] = useState("");
  const [hub, setHub] = useState<"all" | "fontibon" | "bonanza">("all");
  const [status, setStatus] = useState("pending_dispatch");
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>({});
  const [labelDraft, setLabelDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ secret, status });
      if (hub !== "all") qs.set("hub", hub);
      const res = await fetch(`/api/ops/shipping?${qs}`, {
        headers: { "x-ops-secret": secret },
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        orders?: ShippingOrder[];
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message || "No se pudo cargar");
        setOrders([]);
        return;
      }
      setOrders(data.orders || []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, [secret, hub, status]);

  const markDispatched = async (order: ShippingOrder) => {
    setError(null);
    const tracking = trackingDraft[order.id]?.trim();
    if (!tracking) {
      setError("Pega el número de tracking de Pibox");
      return;
    }
    const res = await fetch("/api/ops/shipping", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ops-secret": secret,
      },
      body: JSON.stringify({
        orderId: order.id,
        trackingNumber: tracking,
        labelUrl: labelDraft[order.id]?.trim() || undefined,
        shippingStatus: "dispatched",
        customerEmail: order.email,
        hubLabel: String(order.metadata?.shipping_hub_label || ""),
        displayId: order.display_id,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) {
      setError(data.message || "No se pudo actualizar");
      return;
    }
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-2">Ops · Envíos</h1>
      <p className="text-sm text-bone-60 mb-8">
        Pedidos por hub (Fontibón / Bonanza). Pega el tracking de Pibox al despachar.
      </p>

      <section className="mb-8 grid gap-4 rounded-sm border border-gold-400/20 bg-white/5 p-5 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Label htmlFor="secret">Clave ops</Label>
          <Input
            id="secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="OPS_PANEL_SECRET"
          />
        </div>
        <div>
          <Label htmlFor="hub">Hub</Label>
          <select
            id="hub"
            value={hub}
            onChange={(e) => setHub(e.target.value as typeof hub)}
            className="mt-1 flex h-10 w-full rounded-sm border border-gold-400/30 bg-wine-950 px-3 text-sm text-bone"
          >
            <option value="all">Todos</option>
            <option value="fontibon">Fontibón</option>
            <option value="bonanza">Bonanza</option>
          </select>
        </div>
        <div>
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-sm border border-gold-400/30 bg-wine-950 px-3 text-sm text-bone"
          >
            <option value="pending_dispatch">Pendiente</option>
            <option value="label_created">Guía creada</option>
            <option value="dispatched">Despachado</option>
            <option value="pickup_ready">Recogida</option>
          </select>
        </div>
        <div className="sm:col-span-4">
          <Button type="button" onClick={load} disabled={!secret || loading}>
            {loading ? "Cargando…" : "Cargar pedidos"}
          </Button>
        </div>
      </section>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-bone-60">Sin pedidos para este filtro.</p>
        ) : (
          orders.map((o) => {
            const meta = o.metadata || {};
            return (
              <article
                key={o.id}
                className="rounded-sm border border-gold-400/20 bg-white/5 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl text-bone">
                    #{o.display_id ?? o.id}
                  </h2>
                  <p className="text-xs uppercase tracking-widest text-gold-400">
                    {String(meta.shipping_hub_label || meta.shipping_hub || "—")} ·{" "}
                    {String(meta.shipping_status || "—")}
                  </p>
                </div>
                <p className="text-sm text-bone-60">{String(meta.shipping_hub_reason || "")}</p>
                <p className="text-sm text-bone">
                  {o.email} · {o.shipping_address?.phone || String(meta.customer_phone || "")}
                </p>
                <p className="text-sm text-bone-60">
                  {o.shipping_address?.address_1}
                  {o.shipping_address?.city ? ` · ${o.shipping_address.city}` : ""}
                  {o.shipping_address?.province
                    ? ` · ${o.shipping_address.province}`
                    : meta.shipping_locality
                      ? ` · ${String(meta.shipping_locality)}`
                      : ""}
                </p>
                <p className="text-xs text-bone-60">
                  {(o.items || [])
                    .map((i) => `${i.quantity || 1}× ${i.title}`)
                    .join(", ")}
                </p>
                {String(meta.shipping_status) !== "dispatched" ? (
                  <div className="grid gap-3 sm:grid-cols-3 pt-2">
                    <div className="sm:col-span-1">
                      <Label>Tracking Pibox</Label>
                      <Input
                        value={trackingDraft[o.id] || ""}
                        onChange={(e) =>
                          setTrackingDraft((d) => ({ ...d, [o.id]: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Label>URL guía (opcional)</Label>
                      <Input
                        value={labelDraft[o.id] || ""}
                        onChange={(e) =>
                          setLabelDraft((d) => ({ ...d, [o.id]: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" onClick={() => markDispatched(o)}>
                        Marcar despachado
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gold-400">
                    Tracking: {String(meta.tracking_number || "—")}
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
