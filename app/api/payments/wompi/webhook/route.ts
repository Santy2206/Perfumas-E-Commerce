import { NextResponse } from "next/server";
import { isWompiConfigured } from "../../../../../lib/wompi";

/**
 * POST /api/payments/wompi/webhook
 * Receives Wompi transaction events. Marks metadata for ops;
 * full Medusa payment capture should be wired once the Wompi provider module is live.
 */
export async function POST(req: Request) {
  if (!isWompiConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Wompi not configured" },
      { status: 503 }
    );
  }

  let event: Record<string, unknown>;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const g = globalThis as unknown as {
    __perfumasWompiEvents?: Record<string, unknown>[];
  };
  if (!g.__perfumasWompiEvents) g.__perfumasWompiEvents = [];
  g.__perfumasWompiEvents.push({
    receivedAt: new Date().toISOString(),
    event,
  });

  // TODO: verify Wompi signature with WOMPI_PRIVATE_KEY / events secret
  // TODO: mark Medusa payment collection as captured for event.data.transaction

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    configured: isWompiConfigured(),
    message:
      "POST Wompi webhooks here. Until the Medusa Wompi module is registered, checkout completes with system payment and records payment_provider_local=wompi.",
  });
}
