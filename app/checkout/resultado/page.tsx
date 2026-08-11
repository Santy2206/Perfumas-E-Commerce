"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Section } from "../../../components/layout/Section";
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
  const cartQty = useCartStore((s) =>
    s.lines.reduce((sum, line) => sum + line.quantity, 0)
  );
  const wompiTxnId = search.get("id");
  const ref = search.get("ref");
  const statusHint = search.get("status");

  const [orderId, setOrderId] = useState<string | null>(ref);
  const [status, setStatus] = useState<string | null>(statusHint);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(wompiTxnId));
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      if (raw) {
        const snap = JSON.parse(raw) as LastOrderSnapshot;
        setOrderId((prev) => prev || snap.orderId);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!wompiTxnId) {
      setStatus(statusHint || "CANCELADO");
      setStatusDetail(
        "No se registró un pago. Tu carrito se mantiene — puedes volver a intentar."
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
              "No pudimos confirmar el pago aún. Tu carrito se mantiene por si debes reintentar."
          );
        } else {
          const st = data.status || "UNKNOWN";
          setStatus(st);
          if (data.reference) setOrderId((prev) => prev || data.reference || null);
          if (st === "APPROVED") {
            setPaid(true);
            clearCart();
            try {
              sessionStorage.removeItem(LAST_ORDER_KEY);
            } catch {
              /* ignore */
            }
            setStatusDetail("Pago aprobado. Gracias — procesaremos tu pedido.");
          } else if (st === "DECLINED" || st === "ERROR" || st === "VOIDED") {
            setStatusDetail(
              "El pago no fue aprobado. Tus productos siguen en el carrito para reintentar."
            );
          } else {
            setStatusDetail(
              "Pago en proceso. Si no se aprueba, el carrito se mantiene para que puedas reintentar."
            );
          }
        }
      } catch {
        if (!cancelled) {
          setStatus("PENDIENTE");
          setStatusDetail(
            "No se pudo verificar el pago. Tu carrito se mantiene — reintenta desde el carrito si hace falta."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wompiTxnId, statusHint, clearCart]);

  const failed =
    !paid &&
    (status === "DECLINED" ||
      status === "ERROR" ||
      status === "VOIDED" ||
      status === "CANCELADO" ||
      (!wompiTxnId && !loading));

  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Badge className="mb-4">
          {paid ? "Pago recibido" : failed ? "Pago no completado" : "Pedido registrado"}
        </Badge>
        <h1 className="font-display text-3xl text-ink mb-4">
          {paid
            ? "¡Pago confirmado!"
            : failed
              ? "No se completó el pago"
              : "Estamos confirmando tu pago"}
        </h1>
        {orderId ? (
          <>
            <p className="text-ink-60 mb-2">Referencia de pedido</p>
            <p className="font-mono text-gold-400 mb-6 break-all">{orderId}</p>
          </>
        ) : null}
        {wompiTxnId ? (
          <p className="text-xs text-ink-60 mb-4 font-mono break-all">
            Transacción Wompi: {wompiTxnId}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-ink-60 mb-8">Consultando estado del pago…</p>
        ) : (
          <p className="text-sm text-ink-60 mb-8">
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
          {failed || (!paid && cartQty > 0) ? (
            <>
              <Button asChild>
                <Link href="/checkout">Reintentar pago</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/carrito">Ver carrito</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link href="/tienda">Seguir comprando</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Volver al inicio</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

export default function CheckoutResultadoPage() {
  return (
    <Suspense
      fallback={
        <Section tone="light" className="min-h-[50vh]">
          <div className="mx-auto max-w-lg px-4 py-16 text-center text-ink-60">
            Cargando resultado…
          </div>
        </Section>
      }
    >
      <ResultadoInner />
    </Suspense>
  );
}
