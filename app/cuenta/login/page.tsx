"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { GoogleLoginButton } from "../../../components/auth/GoogleLoginButton";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { loginEmail } from "../../../lib/auth";
import { useCustomerStore } from "../../../store/useCustomerStore";

export default function LoginPage() {
  const router = useRouter();
  const customer = useCustomerStore((s) => s.customer);
  const loadingSession = useCustomerStore((s) => s.loading);
  const setCustomer = useCustomerStore((s) => s.setCustomer);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loadingSession && customer) {
      router.replace("/cuenta");
    }
  }, [customer, loadingSession, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await loginEmail(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCustomer(result.customer);
    router.push("/cuenta");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-2">Iniciar sesión</h1>
      <p className="text-sm text-bone-60 mb-8">
        Accede a tu historial de pedidos y vuelve a comprar con un clic.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-bone-60">
        <span className="h-px flex-1 bg-gold-400/20" />
        o
        <span className="h-px flex-1 bg-gold-400/20" />
      </div>

      <GoogleLoginButton className="w-full" onError={setError} />

      <p className="mt-8 text-sm text-bone-60">
        ¿No tienes cuenta?{" "}
        <Link href="/cuenta/registro" className="text-gold-400 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
