"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { completeGoogleCallback } from "../../../../lib/auth";
import { useCustomerStore } from "../../../../store/useCustomerStore";

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setCustomer = useCustomerStore((s) => s.setCustomer);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const queryParams = Object.fromEntries(searchParams.entries());

    const run = async () => {
      const result = await completeGoogleCallback(queryParams);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCustomer(result.customer);
      const { useFavoritesStore } = await import(
        "../../../../store/useFavoritesStore"
      );
      await useFavoritesStore.getState().hydrate();
      router.replace("/cuenta");
    };

    void run();
  }, [router, searchParams, setCustomer]);

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

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-8">
          <p className="text-sm text-bone-60">Conectando con Google…</p>
        </div>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  );
}
