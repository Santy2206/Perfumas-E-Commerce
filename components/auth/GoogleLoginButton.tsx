"use client";

import { useState } from "react";
import { startGoogleLogin } from "../../lib/auth";
import { useCustomerStore } from "../../store/useCustomerStore";
import { Button } from "../ui/button";

type Props = {
  className?: string;
  onError?: (message: string) => void;
};

export function GoogleLoginButton({ className, onError }: Props) {
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

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={loading}
      onClick={() => void handleClick()}
    >
      {loading ? "Conectando…" : "Continuar con Google"}
    </Button>
  );
}
