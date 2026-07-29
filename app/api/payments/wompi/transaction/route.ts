import { NextResponse } from "next/server";

/**
 * GET /api/payments/wompi/transaction?id=...
 * Looks up a Wompi transaction status (sandbox or production by key prefix).
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ error: "Wompi not configured" }, { status: 503 });
  }

  const base = privateKey.startsWith("prv_test_")
    ? "https://sandbox.wompi.co/v1"
    : "https://production.wompi.co/v1";

  try {
    const res = await fetch(`${base}/transactions/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${privateKey}`,
      },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      data?: {
        id?: string;
        status?: string;
        reference?: string;
        amount_in_cents?: number;
      };
      error?: { reason?: string };
    };
    if (!res.ok) {
      return NextResponse.json(
        {
          error: json.error?.reason || `Wompi ${res.status}`,
        },
        { status: res.status }
      );
    }
    return NextResponse.json({
      id: json.data?.id,
      status: json.data?.status,
      reference: json.data?.reference,
      amountInCents: json.data?.amount_in_cents,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Lookup failed",
      },
      { status: 502 }
    );
  }
}
