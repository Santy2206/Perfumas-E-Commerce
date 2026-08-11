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
  const [cedula, setCedula] = useState("");
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
    if (!phone.trim() || !birthday || !cedula.trim()) {
      setError("Teléfono, cumpleaños y cédula son obligatorios.");
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
      cedula,
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
        <header className="mb-8 border-b-2 border-gold-400/40 pb-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
            Perfumas
          </p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Crear cuenta</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-60">
            Guarda tus pedidos y vuelve a comprar tus fragancias favoritas.
          </p>
        </header>

        <div className="overflow-hidden rounded-sm border-2 border-ink/10 bg-white shadow-[0_2px_0_0_rgba(202,169,105,0.2)]">
          <div className="border-b border-gold-400/30 bg-ink px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">
              Registro
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
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
              <div>
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
              <div>
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
              <div>
                <Label htmlFor="cedula">Cédula</Label>
                <Input
                  id="cedula"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  value={cedula}
                  onChange={(e) =>
                    setCedula(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="1234567890"
                />
              </div>
              <div>
                <Label htmlFor="birthday">Cumpleaños</Label>
                <Input
                  id="birthday"
                  type="date"
                  required
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
              <div>
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

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Creando…" : "Crear cuenta"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-ink-60">
              <span className="h-px flex-1 bg-ink/15" />
              o
              <span className="h-px flex-1 bg-ink/15" />
            </div>

            <GoogleLoginButton className="w-full" variant="outline" onError={setError} />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-ink-60">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/cuenta/login"
            className="font-semibold text-ink underline decoration-gold-400 underline-offset-4 hover:text-gold-400"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </Section>
  );
}
