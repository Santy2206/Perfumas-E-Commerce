import { NextResponse } from "next/server";

/**
 * Proxy to Medusa B2B approval check.
 * GET /api/b2b/status?customerId=...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId")?.trim() || "";
  if (!customerId) {
    return NextResponse.json(
      { ok: false, approved: false, error: "customerId required" },
      { status: 400 }
    );
  }

  const base = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(/\/$/, "");
  if (!base) {
    return NextResponse.json(
      { ok: false, approved: false, error: "Medusa no configurada" },
      { status: 503 }
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const pub = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim();
  if (pub) headers["x-publishable-api-key"] = pub;

  try {
    const res = await fetch(
      `${base}/store/perfumas/b2b/status?customer_id=${encodeURIComponent(customerId)}`,
      { headers, cache: "no-store" }
    );
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        approved: false,
        error: error instanceof Error ? error.message : "Error de red",
      },
      { status: 502 }
    );
  }
}
