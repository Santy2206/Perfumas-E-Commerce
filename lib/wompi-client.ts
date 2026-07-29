/**
 * Browser-only Wompi Widget helpers (preload + open).
 */

const WOMPI_SCRIPT = "https://checkout.wompi.co/widget.js";

declare global {
  interface Window {
    WidgetCheckout?: new (config: Record<string, unknown>) => {
      open: (cb: (result: { transaction?: { status?: string; id?: string } }) => void) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Start downloading the widget ASAP (safe to call many times). */
export function preloadWompiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.WidgetCheckout) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WOMPI_SCRIPT}"]`
    );
    if (existing) {
      if (window.WidgetCheckout) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          scriptPromise = null;
          reject(new Error("Wompi script error"));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = WOMPI_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("No se pudo cargar Wompi"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export type WompiWidgetPayload = {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  customerEmail: string;
  redirectUrl: string;
  integrity: string | null;
};

export async function openWompiWidget(wompi: WompiWidgetPayload) {
  if (!wompi.integrity) {
    throw new Error("Falta firma de integridad Wompi");
  }
  await preloadWompiScript();
  if (!window.WidgetCheckout) {
    throw new Error("WidgetCheckout no disponible");
  }
  const checkout = new window.WidgetCheckout({
    currency: wompi.currency,
    amountInCents: wompi.amountInCents,
    reference: wompi.reference,
    publicKey: wompi.publicKey,
    signature: { integrity: wompi.integrity },
    redirectUrl: wompi.redirectUrl,
    customerData: { email: wompi.customerEmail },
  });
  return new Promise<{ status?: string; id?: string }>((resolve) => {
    checkout.open((result) => {
      resolve(result.transaction || {});
    });
  });
}
