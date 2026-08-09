"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { completeGoogleCallback } from "../../../../lib/auth";
import { useCustomerStore } from "../../../../store/useCustomerStore";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const setCustomer = useCustomerStore((s) => s.setCustomer);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    if (typeof window === "undefined") return {};
    return Object.fromEntries(new URLSearchParams(window.location.search).entries());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await completeGoogleCallback(queryParams);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCustomer(result.customer);
      router.replace("/cuenta");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [queryParams, router, setCustomer]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-8">
        <h1 className="font-display text-2xl text-bone mb-3">No pudimos entrar</h1>
        <p className="text-sm text-bone-60 mb-6">{error}</p>
        <Button asChild>
          <Link href="/cuenta/login">Volver a iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-8">
      <h1 className="font-display text-2xl text-bone mb-3">Conectando con Google…</h1>
      <p className="text-sm text-bone-60">Un momento mientras validamos tu cuenta.</p>
    </div>
  );
}
