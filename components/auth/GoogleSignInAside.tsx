"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { loginWithGoogleIdToken } from "../../lib/auth";
import { useCustomerStore } from "../../store/useCustomerStore";
import { GoogleLoginButton } from "./GoogleLoginButton";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            isDismissedMoment: () => boolean;
            getNotDisplayedReason?: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve());
      if (window.google?.accounts?.id) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services"));
    document.head.appendChild(script);
  });
}

/**
 * Right-side Google sign-in: One Tap prompt + official button fallback.
 * Hidden when already logged in or on auth callback.
 */
export function GoogleSignInAside() {
  const router = useRouter();
  const pathname = usePathname();
  const customer = useCustomerStore((s) => s.customer);
  const loading = useCustomerStore((s) => s.loading);
  const hydrated = useCustomerStore((s) => s.hydrated);
  const setCustomer = useCustomerStore((s) => s.setCustomer);
  const started = useRef(false);

  const hide =
    !CLIENT_ID ||
    loading ||
    !hydrated ||
    Boolean(customer) ||
    pathname.startsWith("/auth/");

  useEffect(() => {
    if (hide || started.current) return;
    started.current = true;
    let cancelled = false;

    const run = async () => {
      try {
        await loadGisScript();
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;
            const result = await loginWithGoogleIdToken(response.credential);
            if (!result.ok) {
              console.warn("[google-one-tap]", result.error);
              return;
            }
            setCustomer(result.customer);
            router.push("/cuenta");
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          // Prefer right-side placement where supported
          itp_support: true,
        });

        window.google.accounts.id.prompt();
      } catch (error) {
        console.warn("[google-one-tap] init failed:", error);
      }
    };

    void run();
    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [hide, router, setCustomer]);

  if (hide) return null;

  return (
    <aside
      className="pointer-events-none fixed bottom-6 right-4 z-50 hidden w-[260px] sm:block"
      aria-label="Iniciar sesión con Google"
    >
      <div className="pointer-events-auto rounded-sm border border-gold-400/25 bg-wine-950/95 p-4 shadow-lg backdrop-blur">
        <p className="mb-3 text-[11px] uppercase tracking-widest text-bone-60">
          Acceso rápido
        </p>
        <GoogleLoginButton className="max-w-none" />
      </div>
    </aside>
  );
}
