/**
 * Medusa customer auth helpers (email/password + Google).
 */

import { FetchError } from "@medusajs/js-sdk";
import { isMedusaConfigured, medusa } from "./medusa";
import { ensureMedusaCart } from "./medusa-cart";
import { useCartStore } from "../store/useCartStore";

export type StoreCustomer = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

export type AuthResult =
  | { ok: true; customer: StoreCustomer }
  | { ok: false; error: string; redirect?: string };

function asCustomer(customer: {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}): StoreCustomer {
  return {
    id: customer.id,
    email: customer.email || "",
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
  };
}

export function decodeJwtPayload(token: string): {
  actor_id?: string;
  auth_identity_id?: string;
  user_metadata?: Record<string, unknown>;
} {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const json = decodeURIComponent(
      Array.from(binary, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
    return JSON.parse(json) as {
      actor_id?: string;
      auth_identity_id?: string;
      user_metadata?: Record<string, unknown>;
    };
  } catch {
    return {};
  }
}

export async function getCustomer(): Promise<StoreCustomer | null> {
  if (!isMedusaConfigured()) return null;
  try {
    const { customer } = await medusa.store.customer.retrieve();
    return customer ? asCustomer(customer) : null;
  } catch (error) {
    console.error("[auth] customer.retrieve failed:", error);
    return null;
  }
}

async function ensureCustomerFromAuth(meta?: {
  first_name?: string;
  last_name?: string;
}): Promise<void> {
  await medusa.client.fetch("/auth/customer/ensure", {
    method: "POST",
    body: {
      first_name: meta?.first_name,
      last_name: meta?.last_name,
    },
  });
}

export async function transferCartToCustomer(customerId: string): Promise<void> {
  if (!isMedusaConfigured() || !customerId) return;
  const { medusaCartId, setMedusaCartId, setLinkedCustomerId, isB2B } =
    useCartStore.getState();
  setLinkedCustomerId(customerId);
  const cart = await ensureMedusaCart(medusaCartId, {
    customerId,
    wholesale: Boolean(isB2B),
  });
  if (cart?.id && cart.id !== medusaCartId) {
    setMedusaCartId(cart.id);
  }
}

async function afterAuthSuccess(): Promise<AuthResult> {
  let customer = await getCustomer();
  if (!customer) {
    try {
      await medusa.auth.refresh();
      customer = await getCustomer();
    } catch (error) {
      console.error("[auth] refresh after login failed:", error);
    }
  }
  if (!customer) {
    return {
      ok: false,
      error:
        "La sesión de Google se creó, pero no pudimos leer tu perfil. Revisa AUTH_CORS/STORE_CORS en Railway (debe incluir https://tienda.perfumas.com.co) y vuelve a intentar.",
    };
  }
  await transferCartToCustomer(customer.id);
  return { ok: true, customer };
}

export async function loginEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "El servicio de cuenta no está disponible ahora." };
  }
  try {
    const token = await medusa.auth.login("customer", "emailpass", {
      email: email.trim().toLowerCase(),
      password,
    });
    if (typeof token !== "string") {
      return {
        ok: false,
        error: "Este inicio de sesión requiere un paso adicional no soportado.",
      };
    }
    return afterAuthSuccess();
  } catch (error) {
    const message =
      error instanceof FetchError
        ? "Correo o contraseña incorrectos."
        : "No pudimos iniciar sesión. Intenta de nuevo.";
    return { ok: false, error: message };
  }
}

export async function registerEmail(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResult> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "El servicio de cuenta no está disponible ahora." };
  }

  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  try {
    await medusa.auth.register("customer", "emailpass", {
      email,
      password: input.password,
    });
  } catch (error) {
    const fetchError = error as FetchError;
    const identityExists =
      fetchError?.statusText === "Unauthorized" ||
      String(fetchError?.message || "").toLowerCase().includes("already exists");

    if (!identityExists) {
      return {
        ok: false,
        error: "No pudimos crear la cuenta. Revisa los datos e intenta de nuevo.",
      };
    }

    const loginResponse = await medusa.auth
      .login("customer", "emailpass", { email, password: input.password })
      .catch(() => null);

    if (!loginResponse || typeof loginResponse !== "string") {
      return {
        ok: false,
        error: "Ya existe una cuenta con este correo. Inicia sesión.",
      };
    }
  }

  try {
    await medusa.store.customer.create({
      email,
      first_name: firstName,
      last_name: lastName,
    });
  } catch {
    // Customer may already exist for this identity — try login path below.
  }

  // Ensure we have a full login token after registration
  try {
    await medusa.auth.login("customer", "emailpass", {
      email,
      password: input.password,
    });
  } catch {
    /* register flow may already have set a usable token */
  }

  return afterAuthSuccess();
}

function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FetchError) {
    const detail = String(error.message || error.statusText || "").trim();
    if (detail) return `${fallback} (${detail})`;
  } else if (error instanceof Error && error.message) {
    return `${fallback} (${error.message})`;
  }
  return fallback;
}

export async function startGoogleLogin(): Promise<
  AuthResult | { ok: true; redirect: string; customer?: undefined }
> {
  if (!isMedusaConfigured()) {
    return {
      ok: false,
      error:
        "Falta configurar NEXT_PUBLIC_MEDUSA_BACKEND_URL y NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.",
    };
  }
  try {
    const result = await medusa.auth.login("customer", "google", {});
    if (typeof result === "string") {
      return afterAuthSuccess();
    }
    if (
      typeof result === "object" &&
      result &&
      "location" in result &&
      typeof result.location === "string"
    ) {
      return { ok: true, redirect: result.location };
    }
    return { ok: false, error: "No pudimos conectar con Google." };
  } catch (error) {
    console.error("[auth] Google login failed:", error);
    return {
      ok: false,
      error: authErrorMessage(
        error,
        "Google no está disponible. ¿Está corriendo el backend en :9000 y reiniciado con GOOGLE_CLIENT_ID/SECRET?"
      ),
    };
  }
}

export async function completeGoogleCallback(
  queryParams: Record<string, string>
): Promise<AuthResult> {
  if (!isMedusaConfigured()) {
    return {
      ok: false,
      error:
        "Falta configurar NEXT_PUBLIC_MEDUSA_BACKEND_URL y NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.",
    };
  }
  if (!queryParams.code) {
    return {
      ok: false,
      error:
        "Google no devolvió el código de acceso. Revisa el Redirect URI en Google Cloud (localhost o tienda.perfumas.com.co).",
    };
  }
  try {
    const callbackResult = await medusa.auth.callback(
      "customer",
      "google",
      queryParams
    );
    if (typeof callbackResult !== "string") {
      return {
        ok: false,
        error: "Google requiere un paso adicional no soportado aún.",
      };
    }
    const decoded = decodeJwtPayload(callbackResult);
    const needsCustomer =
      decoded.actor_id === "" || decoded.actor_id == null || !decoded.actor_id;

    if (needsCustomer) {
      const meta = decoded.user_metadata || {};
      try {
        await ensureCustomerFromAuth({
          first_name: String(meta.given_name || meta.first_name || "") || undefined,
          last_name: String(meta.family_name || meta.last_name || "") || undefined,
        });
      } catch (ensureError) {
        console.error("[auth] ensure customer failed:", ensureError);
        // Fallback: classic store create (needs STORE_CORS)
        const email = String(meta.email || "");
        if (email) {
          try {
            await medusa.store.customer.create({ email });
          } catch (createError) {
            console.warn("[auth] customer.create fallback:", createError);
          }
        } else {
          return {
            ok: false,
            error: authErrorMessage(
              ensureError,
              "No pudimos crear tu cuenta de cliente después de Google"
            ),
          };
        }
      }
      await medusa.auth.refresh();
    }

    return afterAuthSuccess();
  } catch (error) {
    console.error("[auth] Google callback failed:", error);
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos validar el acceso con Google"),
    };
  }
}

export async function logout(): Promise<void> {
  try {
    await medusa.auth.logout();
  } catch {
    /* ignore */
  }
  useCartStore.getState().setLinkedCustomerId(null);
}
