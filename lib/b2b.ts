/**
 * Server + client helpers for wholesale (emprendedores) access.
 */

export type B2BStatusResponse = {
  ok?: boolean;
  approved?: boolean;
  status?: "approved" | "pending" | "rejected" | "none" | string;
  customer_id?: string;
  email?: string | null;
  business_name?: string | null;
  nit?: string | null;
  phone?: string | null;
  city?: string | null;
  message?: string;
  error?: string;
};

export async function fetchB2BStatus(
  customerId: string
): Promise<B2BStatusResponse> {
  const id = customerId.trim();
  if (!id) return { ok: false, approved: false, error: "customerId required" };

  const res = await fetch(
    `/api/b2b/status?customerId=${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );
  return (await res.json().catch(() => ({}))) as B2BStatusResponse;
}

/** Server-side check (checkout API). */
export async function verifyB2BApprovedServer(
  customerId: string
): Promise<{ approved: boolean; message?: string }> {
  const base = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(/\/$/, "");
  if (!base) return { approved: false, message: "Medusa no configurada" };

  const headers: Record<string, string> = { Accept: "application/json" };
  const pub = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim();
  if (pub) headers["x-publishable-api-key"] = pub;

  try {
    const res = await fetch(
      `${base}/store/perfumas/b2b/status?customer_id=${encodeURIComponent(customerId)}`,
      { headers, cache: "no-store" }
    );
    const data = (await res.json().catch(() => ({}))) as B2BStatusResponse;
    if (!res.ok) {
      return {
        approved: false,
        message: data.message || data.error || "No se pudo verificar mayorista",
      };
    }
    return {
      approved: Boolean(data.approved),
      message: data.approved
        ? undefined
        : "Cuenta mayorista no aprobada (grupo emprendedores)",
    };
  } catch (error) {
    return {
      approved: false,
      message: error instanceof Error ? error.message : "Error verificando B2B",
    };
  }
}
