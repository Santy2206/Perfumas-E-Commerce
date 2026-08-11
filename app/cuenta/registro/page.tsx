"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { GoogleLoginButton } from "../../../components/auth/GoogleLoginButton";
import { Section } from "../../../components/layout/Section";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { registerEmail } from "../../../lib/auth";
import { useCustomerStore } from "../../../store/useCustomerStore";

export default function RegisterPage() {
  const router = useRouter();
  const customer = useCustomerStore((s) => s.customer);
  const loadingSession = useCustomerStore((s) => s.loading);
  const setCustomer = useCustomerStore((s) => s.setCustomer);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
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
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!phone.trim() || !birthday) {
      setError("Teléfono y cumpleaños son obligatorios.");
      return;
    }
    setSubmitting(true);
    const result = await registerEmail({
      email,
      password,
      firstName,
      lastName,
      phone,
      birthday,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCustomer(result.customer);
    router.push("/cuenta");
  };

  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-md px-4 py-12 sm:px-8">
        <h1 className="font-display text-3xl text-ink mb-2">Crear cuenta</h1>
        <p className="text-sm text-ink-60 mb-8">
          Guarda tus pedidos y vuelve a comprar tus fragancias favoritas.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
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
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="3001234567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">Cumpleaños</Label>
            <Input
              id="birthday"
              type="date"
              required
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-60">
          <span className="h-px flex-1 bg-gold-400/20" />
          o
          <span className="h-px flex-1 bg-gold-400/20" />
        </div>

        <GoogleLoginButton className="w-full" variant="outline" onError={setError} />

        <p className="mt-8 text-sm text-ink-60">
          ¿Ya tienes cuenta?{" "}
          <Link href="/cuenta/login" className="text-gold-400 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </Section>
  );
}
