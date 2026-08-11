"use client";

import { useState } from "react";
import { startGoogleLogin } from "../../lib/auth";
import { useCustomerStore } from "../../store/useCustomerStore";
import { cn } from "../../lib/utils";
import { GoogleGlyph } from "./GoogleGlyph";

type Props = {
  className?: string;
  onError?: (message: string) => void;
  /** Official blue Google button vs outline brand style */
  variant?: "google" | "outline";
};

export function GoogleLoginButton({
  className,
  onError,
  variant = "google",
}: Props) {
  const [loading, setLoading] = useState(false);
  const setCustomer = useCustomerStore((s) => s.setCustomer);

  const handleClick = async () => {
    setLoading(true);
    const result = await startGoogleLogin();
    if ("redirect" in result && result.ok && result.redirect) {
      window.location.href = result.redirect;
      return;
    }
    if (!result.ok) {
      onError?.(result.error);
      setLoading(false);
      return;
    }
    if ("customer" in result && result.customer) {
      setCustomer(result.customer);
      window.location.href = "/cuenta";
      return;
    }
    setLoading(false);
  };

  if (variant === "outline") {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleClick()}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-3 rounded-sm border-2 border-ink/20 bg-white px-4 text-sm font-semibold uppercase tracking-widest text-ink transition-colors hover:border-gold-400 hover:bg-gold-400/10 disabled:opacity-40",
          className
        )}
      >
        <GoogleGlyph className="h-5 w-5 shrink-0" />
        {loading ? "Conectando…" : "Continuar con Google"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleClick()}
      aria-label="Iniciar sesión con Google"
      className={cn(
        "inline-flex h-10 w-full max-w-[240px] overflow-hidden rounded-[3px] border border-[#4285F4] shadow-sm transition opacity-100 hover:brightness-105 disabled:opacity-50",
        className
      )}
    >
      <span className="flex h-full w-10 shrink-0 items-center justify-center bg-white">
        <GoogleGlyph className="h-5 w-5" />
      </span>
      <span className="flex flex-1 items-center justify-center bg-[#4285F4] px-3 text-sm font-medium text-white">
        {loading ? "Conectando…" : "Iniciar sesión con Google"}
      </span>
    </button>
  );
}
