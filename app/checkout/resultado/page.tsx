"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { useCartStore } from "../../../store/useCartStore";

const LAST_ORDER_KEY = "perfumas_last_order";

export type LastOrderSnapshot = {
  orderId: string;
  paymentProviderId: string;
  createdAt: string;
};

function ResultadoInner() {
  const search = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const wompiTxnId = search.get("id");
  const ref = search.get("ref");

  const [orderId, setOrderId] = useState<string | null>(ref);
  const [status, setStatus] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(wompiTxnId));

  useEffect(() => {
    clearCart();
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      if (raw) {
        const snap = JSON.parse(raw) as LastOrderSnapshot;
        setOrderId((prev) => prev || snap.orderId);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on return from Wompi
  }, []);

  useEffect(() => {
    if (!wompiTxnId) {
      setStatusDetail(
        "Si cerraste Wompi sin pagar, el pedido quedó pendiente. Puedes pagar por transferencia o reintentar el checkout."
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/payments/wompi/transaction?id=${encodeURIComponent(wompiTxnId)}`
        );
        const data = (await res.json()) as {
          status?: string;
          reference?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setStatus("PENDIENTE");
          setStatusDetail(
            data.error ||
              "No pudimos consultar Wompi aún. El pedido existe; revisa en unos minutos o WhatsApp."
          );
        } else {
          setStatus(data.status || "UNKNOWN");
          if (data.reference && !orderId) setOrderId(data.reference);
          if (data.status === "APPROVED") {
            setStatusDetail("Pago aprobado. Gracias — procesaremos tu pedido.");
          } else if (data.status === "DECLINED" || data.status === "ERROR") {
            setStatusDetail("El pago no fue aprobado. Puedes reintentar desde el carrito.");
          } else {
            setStatusDetail(
              "Pago en proceso. Wompi a veces tarda unos segundos; te confirmamos por correo/WhatsApp."
            );
          }
        }
      } catch {
        if (!cancelled) {
          setStatus("PENDIENTE");
          setStatusDetail("No se pudo verificar el pago ahora. Guarda tu número de pedido.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wompiTxnId, orderId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Badge className="mb-4">
        {status === "APPROVED" ? "Pago recibido" : "Pedido registrado"}
      </Badge>
      <h1 className="font-display text-3xl text-bone mb-4">
        {status === "APPROVED" ? "¡Pago confirmado!" : "Gracias por tu compra"}
      </h1>
      {orderId ? (
        <>
          <p className="text-bone-60 mb-2">Número de pedido</p>
          <p className="font-mono text-gold-400 mb-6 break-all">{orderId}</p>
        </>
      ) : null}
      {wompiTxnId ? (
        <p className="text-xs text-bone-60 mb-4 font-mono break-all">
          Transacción Wompi: {wompiTxnId}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-bone-60 mb-8">Consultando estado del pago…</p>
      ) : (
        <p className="text-sm text-bone-60 mb-8">
          {status ? (
            <>
              Estado: <span className="text-gold-400">{status}</span>
              {statusDetail ? ` — ${statusDetail}` : null}
            </>
          ) : (
            statusDetail
          )}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/tienda">Seguir comprando</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-bone-60">
          Cargando resultado…
        </div>
      }
    >
      <ResultadoInner />
    </Suspense>
  );
}
