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
  user_metadata?: Record<string, unknown>;
} {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json) as {
      actor_id?: string;
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
  } catch {
    return null;
  }
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
  const customer = await getCustomer();
  if (!customer) {
    return { ok: false, error: "No pudimos cargar tu cuenta. Intenta de nuevo." };
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

export async function startGoogleLogin(): Promise<
  AuthResult | { ok: true; redirect: string; customer?: undefined }
> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "El servicio de cuenta no está disponible ahora." };
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
  } catch {
    return {
      ok: false,
      error: "Google no está configurado o no está disponible ahora.",
    };
  }
}

export async function completeGoogleCallback(
  queryParams: Record<string, string>
): Promise<AuthResult> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "El servicio de cuenta no está disponible ahora." };
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
    const shouldCreateCustomer = !decoded.actor_id;

    if (shouldCreateCustomer) {
      const email = String(decoded.user_metadata?.email || "");
      if (!email) {
        return { ok: false, error: "Google no devolvió un correo válido." };
      }
      await medusa.store.customer.create({ email });
      await medusa.auth.refresh();
    }

    return afterAuthSuccess();
  } catch {
    return { ok: false, error: "No pudimos validar el acceso con Google." };
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
