/**
 * Resolve the Wompi charge amount (COP pesos) from a completed Medusa order.
 *
 * Medusa amounts in this project are whole pesos. Never scale the order total
 * using a client-supplied fallback — that let attackers underpay by submitting
 * a tiny body.total that triggered a divide-by-100 heuristic.
 */
export function amountPesosFromOrder(
  orderTotal: number | null | undefined,
  fallbackPesos: number
): number {
  if (
    typeof orderTotal === "number" &&
    Number.isFinite(orderTotal) &&
    orderTotal > 0
  ) {
    return Math.round(orderTotal);
  }
  return Math.round(fallbackPesos);
}
