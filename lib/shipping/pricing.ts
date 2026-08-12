/**
 * Free-shipping rules for Perfumas.
 *
 * - Pickup (Fontibón / Bonanza): always free
 * - Bogotá / nacional free when:
 *   1. Cart has at least some perfumería (builds or prepared replicas)
 *   2. Hogar / accesorios may mix freely with perfumería
 *   3. Insumos allowed only if perfume amount > insumos amount
 *   4. Cart subtotal meets the threshold
 */

import {
  getProductById,
  getProductKind,
  SHIPPING_METHODS,
} from "../catalog";

export const FREE_SHIPPING_BOGOTA_MIN = 100_000;
export const FREE_SHIPPING_NACIONAL_MIN = 200_000;

export type ShippingQuoteLine = {
  kind: "build" | "sku";
  productId?: string;
  /** Line total (price × quantity) for composition checks */
  amount?: number;
  /**
   * Optional department / productKind hints from the client.
   * When `productId` resolves in the catalog these are ignored — never trust
   * them alone to unlock free shipping.
   */
  department?: string | null;
  productKind?: string | null;
};

export type ShippingQuote = {
  methodId: string;
  basePrice: number;
  price: number;
  free: boolean;
  reason: string;
  qualifiesCart: boolean;
  /** Why the cart composition failed, when qualifiesCart is false */
  disqualifyReason: "no_perfume" | "insumos_exceed" | null;
  threshold: number | null;
  remainingToFree: number | null;
};

export type LineShippingCategory = "perfume" | "insumos" | "companion" | "unknown";

function basePriceForMethod(methodId: string): number {
  return SHIPPING_METHODS.find((m) => m.id === methodId)?.price ?? 0;
}

function resolveDepartment(line: ShippingQuoteLine): string | null {
  if (line.productId) {
    const product = getProductById(line.productId);
    if (product?.department) return product.department;
  }
  return null;
}

function lineAmount(line: ShippingQuoteLine): number {
  return Math.max(0, Math.round(line.amount ?? 0));
}

/**
 * Réplicas preparadas / perfumería / custom builds.
 * Catalog identity wins over client `productKind` / `department` / spoofed `kind`.
 */
export function isPerfumeriaEligibleLine(line: ShippingQuoteLine): boolean {
  if (line.productId) {
    const product = getProductById(line.productId);
    if (product) {
      if (product.department === "perfumeria") return true;
      if (getProductKind(product) === "prepared_replica") return true;
      // Known non-perfume catalog SKU — ignore client perfume flags.
      return false;
    }
    // Unknown productId: do not grant perfume eligibility from client flags.
    return false;
  }

  // Custom builds are not catalog SKUs; only trust kind when there is no productId.
  return line.kind === "build";
}

export function classifyShippingLine(
  line: ShippingQuoteLine
): LineShippingCategory {
  if (isPerfumeriaEligibleLine(line)) return "perfume";

  const department = resolveDepartment(line);
  if (department === "insumos") return "insumos";
  if (department === "hogar" || department === "accesorios") return "companion";

  // Medusa-only SKUs missing from the local catalog: allow insumos hints so
  // free-shipping composition stays conservative (harder to unlock free).
  // Never treat client productKind as perfume (see isPerfumeriaEligibleLine).
  if (
    line.productKind === "essence" ||
    line.productKind === "alcohol" ||
    line.productKind === "bottle" ||
    line.productKind === "pheromone"
  ) {
    return "insumos";
  }

  return "unknown";
}

export type CartComposition = {
  perfumeTotal: number;
  insumosTotal: number;
  companionTotal: number;
  unknownTotal: number;
  qualifies: boolean;
  disqualifyReason: "no_perfume" | "insumos_exceed" | null;
};

export function analyzeCartComposition(
  lines: ShippingQuoteLine[]
): CartComposition {
  let perfumeTotal = 0;
  let insumosTotal = 0;
  let companionTotal = 0;
  let unknownTotal = 0;

  for (const line of lines) {
    const amount = lineAmount(line);
    const category = classifyShippingLine(line);
    if (category === "perfume") perfumeTotal += amount;
    else if (category === "insumos") insumosTotal += amount;
    else if (category === "companion") companionTotal += amount;
    else unknownTotal += amount;
  }

  if (perfumeTotal <= 0) {
    return {
      perfumeTotal,
      insumosTotal,
      companionTotal,
      unknownTotal,
      qualifies: false,
      disqualifyReason: "no_perfume",
    };
  }

  if (insumosTotal > 0 && perfumeTotal <= insumosTotal) {
    return {
      perfumeTotal,
      insumosTotal,
      companionTotal,
      unknownTotal,
      qualifies: false,
      disqualifyReason: "insumos_exceed",
    };
  }

  return {
    perfumeTotal,
    insumosTotal,
    companionTotal,
    unknownTotal,
    qualifies: true,
    disqualifyReason: null,
  };
}

export function cartQualifiesForFreeShipping(
  lines: ShippingQuoteLine[]
): boolean {
  if (!lines.length) return false;
  return analyzeCartComposition(lines).qualifies;
}

function disqualifyMessage(
  reason: CartComposition["disqualifyReason"]
): string {
  if (reason === "insumos_exceed") {
    return "Los insumos igualan o superan el valor en perfumería: no aplica envío gratis";
  }
  return "Envío gratis requiere perfumería (Preparar o Preparadas); hogar/accesorios sí pueden ir juntos";
}

export function getShippingQuote(input: {
  methodId: string;
  lines: ShippingQuoteLine[];
  subtotal: number;
}): ShippingQuote {
  const methodId = input.methodId || "";
  const basePrice = basePriceForMethod(methodId);
  const composition = analyzeCartComposition(input.lines);
  const qualifiesCart = composition.qualifies;
  const subtotal = Math.max(0, Math.round(input.subtotal));

  if (methodId.startsWith("pickup-")) {
    return {
      methodId,
      basePrice: 0,
      price: 0,
      free: true,
      reason: "Recogida en tienda",
      qualifiesCart,
      disqualifyReason: composition.disqualifyReason,
      threshold: null,
      remainingToFree: null,
    };
  }

  if (methodId === "delivery-bogota") {
    const threshold = FREE_SHIPPING_BOGOTA_MIN;
    if (!qualifiesCart) {
      return {
        methodId,
        basePrice,
        price: basePrice,
        free: false,
        reason: disqualifyMessage(composition.disqualifyReason),
        qualifiesCart: false,
        disqualifyReason: composition.disqualifyReason,
        threshold,
        remainingToFree: null,
      };
    }
    if (subtotal >= threshold) {
      return {
        methodId,
        basePrice,
        price: 0,
        free: true,
        reason: `Envío gratis en Bogotá (pedido ≥ ${threshold.toLocaleString("es-CO")})`,
        qualifiesCart: true,
        disqualifyReason: null,
        threshold,
        remainingToFree: 0,
      };
    }
    return {
      methodId,
      basePrice,
      price: basePrice,
      free: false,
      reason: "Umbral de envío gratis en Bogotá aún no alcanzado",
      qualifiesCart: true,
      disqualifyReason: null,
      threshold,
      remainingToFree: threshold - subtotal,
    };
  }

  if (methodId === "delivery-nacional") {
    const threshold = FREE_SHIPPING_NACIONAL_MIN;
    if (!qualifiesCart) {
      return {
        methodId,
        basePrice,
        price: basePrice,
        free: false,
        reason: disqualifyMessage(composition.disqualifyReason),
        qualifiesCart: false,
        disqualifyReason: composition.disqualifyReason,
        threshold,
        remainingToFree: null,
      };
    }
    if (subtotal >= threshold) {
      return {
        methodId,
        basePrice,
        price: 0,
        free: true,
        reason: `Envío gratis nacional vía Envia (pedido ≥ ${threshold.toLocaleString("es-CO")})`,
        qualifiesCart: true,
        disqualifyReason: null,
        threshold,
        remainingToFree: 0,
      };
    }
    return {
      methodId,
      basePrice,
      price: basePrice,
      free: false,
      reason: "Umbral de envío gratis nacional aún no alcanzado",
      qualifiesCart: true,
      disqualifyReason: null,
      threshold,
      remainingToFree: threshold - subtotal,
    };
  }

  return {
    methodId,
    basePrice,
    price: basePrice,
    free: basePrice === 0,
    reason: "Método de envío",
    qualifiesCart,
    disqualifyReason: composition.disqualifyReason,
    threshold: null,
    remainingToFree: null,
  };
}

/** Helper text for cart / checkout under the shipping row. */
export function shippingProgressMessage(quote: ShippingQuote): string | null {
  if (quote.methodId.startsWith("pickup-")) return null;

  if (!quote.qualifiesCart) {
    if (quote.disqualifyReason === "insumos_exceed") {
      return "Los insumos igualan o superan el valor en perfumería: no aplica envío gratis.";
    }
    return "Añade perfumería (Preparar o Preparadas) para poder optar a envío gratis. Hogar y accesorios sí pueden ir juntos.";
  }

  if (quote.free) {
    return quote.reason;
  }

  if (quote.remainingToFree != null && quote.remainingToFree > 0 && quote.threshold) {
    const place =
      quote.methodId === "delivery-nacional" ? "nacional" : "en Bogotá";
    return `Te faltan $${quote.remainingToFree.toLocaleString("es-CO")} para envío gratis ${place}.`;
  }

  return null;
}
