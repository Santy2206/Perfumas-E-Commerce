import { NextResponse } from "next/server";

type Body = {
  businessName: string;
  nit: string;
  phone: string;
  city: string;
  email: string;
};

/**
 * B2B registration — creates Medusa customer via backend; Admin assigns emprendedores.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.businessName || !body.nit || !body.email || !body.phone) {
    return NextResponse.json(
      { error: "Completa todos los campos obligatorios" },
      { status: 400 }
    );
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
  let customerId: string | undefined;
  let status: "pending" | "approved" = "pending";

  if (medusaUrl) {
    try {
      const res = await fetch(`${medusaUrl}/store/perfumas/b2b/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
            ? {
                "x-publishable-api-key":
                  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
              }
            : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        customerId = data.customer_id;
        if (data.status === "approved") status = "approved";
      }
    } catch {
      // local pending record is enough
    }
  }

  return NextResponse.json({
    ok: true,
    status,
    message:
      status === "approved"
        ? "Cuenta mayorista lista."
        : "Solicitud recibida. Te avisaremos cuando tu cuenta sea aprobada (Admin → Customers → asignar grupo emprendedores).",
    applicationId: application.id,
    customerId,
  });
}

export async function GET() {
  const g = globalThis as unknown as { __perfumasB2B?: unknown[] };
  return NextResponse.json({ applications: g.__perfumasB2B ?? [] });
}
