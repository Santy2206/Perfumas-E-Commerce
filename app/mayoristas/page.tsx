"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { useCartStore } from "../../store/useCartStore";

export default function MayoristasPage() {
  const isB2B = useCartStore((s) => s.isB2B);
  const b2bProfile = useCartStore((s) => s.b2bProfile);
  const setB2BSession = useCartStore((s) => s.setB2BSession);

  if (isB2B && b2bProfile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <Badge variant="b2b" className="mb-4">Cuenta aprobada</Badge>
        <h1 className="font-display text-3xl text-bone mb-2">Hola, {b2bProfile.businessName}</h1>
        <p className="text-bone-60 mb-8">
          Estás viendo precios mayoristas. Compra insumos con cantidades mínimas (MOQ).
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/mayoristas/insumos">Ver catálogo de insumos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/carrito">Ir al carrito</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setB2BSession(null)}
          >
            Cerrar sesión mayorista
          </Button>
        </div>
      </div>
    );
  }

  if (b2bProfile?.status === "pending") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">Pendiente de aprobación</Badge>
        <h1 className="font-display text-2xl text-bone mb-4">Solicitud recibida</h1>
        <p className="text-bone-60 mb-6">
          Revisaremos el NIT de <strong className="text-bone">{b2bProfile.businessName}</strong> y te
          avisaremos por correo/WhatsApp. Mientras tanto puedes comprar a precios de venta al público.
        </p>
        <Button variant="outline" onClick={() => setB2BSession(null)}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-400 mb-3">Portal B2B</p>
          <h1 className="font-display text-3xl text-bone mb-4">Mayoristas / Emprendedores</h1>
          <p className="text-bone-60 mb-6">
            Accede a precios especiales en esencias, envases, alcohol y feromonas. Tras el registro,
            el equipo Perfumas aprueba tu cuenta (revisión de NIT) y te asigna al grupo{" "}
            <em>emprendedores</em>.
          </p>
          <ul className="space-y-2 text-sm text-bone-60 mb-8">
            <li>· Descuento mayorista (~20% sobre lista retail por defecto)</li>
            <li>· Cantidades mínimas (MOQ) por producto</li>
            <li>· Mismo carrito unificado con retail</li>
          </ul>
          <Card>
            <CardHeader>
              <CardTitle>¿Ya tienes cuenta?</CardTitle>
              <CardDescription>Demo: inicia sesión con un NIT aprobado de prueba.</CardDescription>
            </CardHeader>
            <CardContent>
              <DemoLogin />
            </CardContent>
          </Card>
        </div>
        <B2BRegisterForm />
      </div>
    </div>
  );
}

function DemoLogin() {
  const setB2BSession = useCartStore((s) => s.setB2BSession);
  const [email, setEmail] = useState("mayorista@perfumas.com.co");
  const [nit, setNit] = useState("900123456-1");

  return (
    <div className="space-y-3">
      <div>
        <Label>Correo</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label>NIT</Label>
        <Input value={nit} onChange={(e) => setNit(e.target.value)} />
      </div>
      <Button
        className="w-full"
        onClick={() =>
          setB2BSession({
            businessName: "Emprendedor Demo SAS",
            nit,
            phone: "3503370279",
            city: "Bogotá",
            email,
            status: "approved",
          })
        }
      >
        Entrar (demo aprobada)
      </Button>
    </div>
  );
}

function B2BRegisterForm() {
  const setB2BSession = useCartStore((s) => s.setB2BSession);
  const [businessName, setBusinessName] = useState("");
  const [nit, setNit] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Bogotá");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/b2b/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, nit, phone, city, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Error al registrar");
        return;
      }
      setB2BSession({
        businessName,
        nit,
        phone,
        city,
        email,
        status: data.status ?? "pending",
      });
    } catch {
      setMsg("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitar acceso mayorista</CardTitle>
        <CardDescription>Registro con revisión manual de NIT.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="biz">Razón social / negocio</Label>
            <Input id="biz" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nit">NIT</Label>
            <Input id="nit" required value={nit} onChange={(e) => setNit(e.target.value)} placeholder="900123456-1" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {msg && <p className="text-sm text-red-300">{msg}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando…" : "Enviar solicitud"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
