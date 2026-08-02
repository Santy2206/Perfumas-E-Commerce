import { NextResponse } from "next/server";
import {
  isWompiConfigured,
  type WompiEventPayload,
  verifyWompiEventSignature,
} from "../../../../../lib/wompi";

/**
 * POST /api/payments/wompi/webhook
 * Public Wompi Events URL. Verifies checksum, then asks Medusa to capture
 * the authorized payment for transaction.reference (Medusa order id).
 */
export async function POST(req: Request) {
  if (!isWompiConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Wompi not configured" },
      { status: 503 }
    );
  }

  let event: WompiEventPayload;
  try {
    event = (await req.json()) as WompiEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const checksum = req.headers.get("x-event-checksum");
  const verified = verifyWompiEventSignature(event, checksum);
  if (!verified.ok) {
    return NextResponse.json(
      { ok: false, message: verified.reason },
      { status: 401 }
    );
  }

  const g = globalThis as unknown as {
    __perfumasWompiEvents?: Record<string, unknown>[];
  };
  if (!g.__perfumasWompiEvents) g.__perfumasWompiEvents = [];
  g.__perfumasWompiEvents.push({
    receivedAt: new Date().toISOString(),
    event,
  });

  const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(
    /\/$/,
    ""
  );
  if (!medusaUrl) {
    return NextResponse.json({
      ok: true,
      verified: true,
      medusa: "skipped",
      message: "Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL",
    });
  }

  try {
    const medusaRes = await fetch(`${medusaUrl}/hooks/wompi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(checksum ? { "X-Event-Checksum": checksum } : {}),
      },
      body: JSON.stringify(event),
      cache: "no-store",
    });
    const medusaJson = (await medusaRes.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!medusaRes.ok) {
      // Non-200 so Wompi retries (up to 3 times / 24h).
      return NextResponse.json(
        {
          ok: false,
          verified: true,
          medusaStatus: medusaRes.status,
          medusa: medusaJson,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      medusaStatus: medusaRes.status,
      medusa: medusaJson,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        verified: true,
        medusa: "error",
        message:
          error instanceof Error ? error.message : "Medusa forward failed",
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isWompiConfigured(),
    eventsSecret: Boolean(process.env.WOMPI_EVENTS_SECRET),
    message:
      "POST Wompi webhooks here. Requires WOMPI_EVENTS_SECRET; forwards to Medusa /hooks/wompi to capture payment.",
  });
}
