type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Thin Resend wrapper. No-ops (with log) when RESEND_API_KEY is unset
 * so local/dev checkout still works.
 */
export async function sendShippingEmail(
  input: SendEmailInput
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Perfumas <onboarding@resend.dev>";

  if (!apiKey) {
    console.info("[shipping-email] skipped (no RESEND_API_KEY):", input.subject);
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[shipping-email] Resend error:", res.status, body);
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "email failed";
    console.warn("[shipping-email]", message);
    return { ok: false, error: message };
  }
}

export function opsEmailForHub(hub: "fontibon" | "bonanza"): string | null {
  if (hub === "bonanza") {
    return (
      process.env.OPS_EMAIL_BONANZA?.trim() ||
      process.env.OPS_EMAIL?.trim() ||
      null
    );
  }
  return (
    process.env.OPS_EMAIL_FONTIBON?.trim() ||
    process.env.OPS_EMAIL?.trim() ||
    null
  );
}

export function customerPaidEmailHtml(input: {
  orderId: string;
  hubLabel: string;
  isPickup: boolean;
  trackingNumber?: string | null;
  labelUrl?: string | null;
}) {
  const trackingBlock = input.trackingNumber
    ? `<p>Número de rastreo: <strong>${input.trackingNumber}</strong></p>
       ${input.labelUrl ? `<p><a href="${input.labelUrl}">Ver guía</a></p>` : ""}`
    : `<p>Te enviaremos el número de rastreo cuando el pedido salga de ${input.hubLabel}.</p>`;

  return `
    <div style="font-family:Georgia,serif;color:#230a0b;line-height:1.5">
      <h1 style="color:#5c1a1a">Pago recibido — Perfumas</h1>
      <p>Tu pedido <strong>${input.orderId}</strong> fue confirmado.</p>
      <p>${
        input.isPickup
          ? `Puedes recogerlo en <strong>${input.hubLabel}</strong>.`
          : `Lo estamos preparando desde <strong>${input.hubLabel}</strong>.`
      }</p>
      ${trackingBlock}
      <p style="color:#666;font-size:13px">Gracias por comprar en Perfumas.</p>
    </div>
  `;
}

export function opsDispatchEmailHtml(input: {
  orderId: string;
  hubLabel: string;
  hubAddress: string;
  reason: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
  locality?: string | null;
  itemsSummary: string;
  trackingNumber?: string | null;
  labelUrl?: string | null;
}) {
  return `
    <div style="font-family:system-ui,sans-serif;color:#111;line-height:1.5">
      <h2>Despacho ${input.hubLabel}</h2>
      <p><strong>Pedido:</strong> ${input.orderId}</p>
      <p><strong>Hub:</strong> ${input.hubAddress}</p>
      <p><strong>Ruteo:</strong> ${input.reason}</p>
      <hr />
      <p><strong>Cliente:</strong> ${input.customerName}</p>
      <p><strong>Tel:</strong> ${input.customerPhone}</p>
      <p><strong>Email:</strong> ${input.customerEmail}</p>
      <p><strong>Dirección:</strong> ${input.address}</p>
      <p><strong>Ciudad:</strong> ${input.city}${
        input.locality ? ` · ${input.locality}` : ""
      }</p>
      <p><strong>Items:</strong> ${input.itemsSummary}</p>
      ${
        input.trackingNumber
          ? `<p><strong>Tracking:</strong> ${input.trackingNumber}</p>`
          : "<p><em>Crear guía en Pibox y pegar tracking en el panel de envíos.</em></p>"
      }
      ${
        input.labelUrl
          ? `<p><a href="${input.labelUrl}">Abrir guía PDF</a></p>`
          : ""
      }
    </div>
  `;
}
