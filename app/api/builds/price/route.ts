import { NextResponse } from "next/server";
import { computeBuildPrice, type BuildPayload } from "../../../../lib/build-pricing";

/**
 * Server-side custom build pricing + add-to-cart payload.
 * Mirrors Medusa POST /store/builds/add-to-cart when backend is online.
 */
export async function POST(req: Request) {
  let payload: BuildPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = computeBuildPrice(payload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  if (medusaUrl) {
    try {
      const res = await fetch(`${medusaUrl}/store/builds/add-to-cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
            ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
            : {}),
        },
        body: JSON.stringify({ ...payload, serverPrice: result.total, metadata: result.metadata }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ ...result, medusa: data });
      }
    } catch {
      // fall through to local pricing response
    }
  }

  return NextResponse.json(result);
}
