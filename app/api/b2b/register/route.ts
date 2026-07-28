import { NextResponse } from "next/server";

type Body = {
  businessName: string;
  nit: string;
  phone: string;
  city: string;
  email: string;
};

/**
 * B2B registration — stores pending applications.
 * When Medusa is connected, creates a customer and leaves group assignment
 * to admin approval (emprendedores customer group).
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.businessName || !body.nit || !body.email || !body.phone) {
    return NextResponse.json({ error: "Completa todos los campos obligatorios" }, { status: 400 });
  }

  const application = {
    id: `b2b-${Date.now()}`,
    ...body,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
    customerGroup: "emprendedores",
  };

  const g = globalThis as unknown as { __perfumasB2B?: typeof application[] };
  if (!g.__perfumasB2B) g.__perfumasB2B = [];
  g.__perfumasB2B.push(application);

  const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  if (medusaUrl) {
    try {
      await fetch(`${medusaUrl}/store/perfumas/b2b/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application),
      });
    } catch {
      // local pending record is enough
    }
  }

  return NextResponse.json({
    ok: true,
    status: "pending",
    message: "Solicitud recibida. Te avisaremos cuando tu cuenta sea aprobada.",
    applicationId: application.id,
  });
}

export async function GET() {
  const g = globalThis as unknown as { __perfumasB2B?: unknown[] };
  return NextResponse.json({ applications: g.__perfumasB2B ?? [] });
}
