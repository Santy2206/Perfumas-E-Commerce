/**
 * Classify store orders for account UI: active (packing/shipping) vs history (completed).
 */

import type { ReorderLine } from "./reorder";
import type { ShippingStatus } from "./shipping/types";

export type AccountOrderLike = {
  id: string;
  display_id?: number | null;
  created_at?: string | null;
  total?: number | null;
  status?: string | null;
  fulfillment_status?: string | null;
  metadata?: Record<string, unknown> | null;
  items?: ReorderLine[] | null;
};

const HISTORY_SHIPPING: ReadonlySet<ShippingStatus> = new Set(["delivered"]);

export function getOrderShippingStatus(
  order: AccountOrderLike
): ShippingStatus | null {
  const raw = order.metadata?.shipping_status;
  if (typeof raw !== "string") return null;
  return raw as ShippingStatus;
}

/** Completed: delivered / fully fulfilled / Medusa completed */
export function isOrderHistory(order: AccountOrderLike): boolean {
  const shipping = getOrderShippingStatus(order);
  if (shipping && HISTORY_SHIPPING.has(shipping)) return true;

  const status = String(order.status || "").toLowerCase();
  if (status === "completed") return true;

  const fulfillment = String(order.fulfillment_status || "").toLowerCase();
  if (fulfillment === "delivered" || fulfillment === "fulfilled") return true;

  return false;
}

/** In progress: packing, shipping, ready for pickup, or not yet classified */
export function isOrderActive(order: AccountOrderLike): boolean {
  return !isOrderHistory(order);
}

export function orderStatusLabel(order: AccountOrderLike): string {
  const shipping = getOrderShippingStatus(order);
  switch (shipping) {
    case "pending_dispatch":
      return "Preparando pedido";
    case "label_created":
      return "Empaque / etiqueta";
    case "dispatched":
      return "Despachado";
    case "in_transit":
      return "En camino";
    case "pickup_ready":
      return "Listo para recoger";
    case "delivered":
      return "Entregado / recogido";
    case "failed":
      return "Incidencia en envío";
    default:
      break;
  }

  const status = String(order.status || "").toLowerCase();
  if (status === "completed") return "Completado";
  if (status === "canceled" || status === "cancelled") return "Cancelado";
  if (status === "pending" || status === "requires_action") return "En proceso";

  return "En proceso";
}

export function splitAccountOrders(orders: AccountOrderLike[]): {
  active: AccountOrderLike[];
  history: AccountOrderLike[];
} {
  const active: AccountOrderLike[] = [];
  const history: AccountOrderLike[] = [];
  for (const order of orders) {
    if (isOrderHistory(order)) history.push(order);
    else active.push(order);
  }
  return { active, history };
}
