/**
 * Medusa customer auth helpers (email/password + Google).
 */

import { FetchError } from "@medusajs/js-sdk";
import {
  EMPTY_FAVORITES,
  parseFavorites,
  type FavoritesData,
} from "./favorites";
import { isMedusaConfigured, medusa } from "./medusa";
import { ensureMedusaCart } from "./medusa-cart";
import { useCartStore } from "../store/useCartStore";

export type StoreCustomer = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  birthday?: string | null;
  profile_complete?: boolean;
};

export type AuthResult =
  | { ok: true; customer: StoreCustomer }
  | { ok: false; error: string; redirect?: string };

function isValidEmail(value: string): boolean {
  return value.includes("@") && value.includes(".");
}

function asCustomer(customer: {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
}): StoreCustomer {
  const meta = customer.metadata || {};
  const avatar =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.google_picture === "string" && meta.google_picture) ||
    null;
  const googleEmail =
    typeof meta.google_email === "string" ? meta.google_email : "";
  const rawEmail = String(customer.email || "");
  const email = isValidEmail(rawEmail)
    ? rawEmail
    : isValidEmail(googleEmail)
      ? googleEmail
      : "";
  const birthday =
    typeof meta.birthday === "string" ? meta.birthday : null;
  const profileComplete =
    meta.profile_complete === true ||
    Boolean(customer.phone && birthday);

  return {
    id: customer.id,
    email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    avatar_url: avatar,
    birthday,
    profile_complete: profileComplete,
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

async function retrieveCustomerRecord(): Promise<{
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
} | null> {
  if (!isMedusaConfigured()) return null;
  try {
    const { customer } = await medusa.store.customer.retrieve({
      fields: "+metadata",
    });
    return customer ?? null;
  } catch (error) {
    console.error("[auth] customer.retrieve failed:", error);
    return null;
  }
}

export async function getCustomer(): Promise<StoreCustomer | null> {
  const customer = await retrieveCustomerRecord();
  return customer ? asCustomer(customer) : null;
}

export async function getCustomerFavorites(): Promise<FavoritesData> {
  const customer = await retrieveCustomerRecord();
  if (!customer) return EMPTY_FAVORITES;
  return parseFavorites(customer.metadata);
}

/** Merge-patch customer.metadata (never wipe unrelated keys). */
export async function mergeCustomerMetadata(
  patch: Record<string, unknown>
): Promise<
  | { ok: true; customer: StoreCustomer; metadata: Record<string, unknown> }
  | { ok: false; error: string }
> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "El servicio de cuenta no está disponible ahora." };
  }
  try {
    const current = await retrieveCustomerRecord();
    if (!current) {
      return { ok: false, error: "Inicia sesión para guardar favoritos." };
    }
    const metadata = { ...(current.metadata || {}), ...patch };
    await medusa.store.customer.update({ metadata });
    const next = await retrieveCustomerRecord();
    if (!next) {
      return { ok: false, error: "No pudimos guardar los cambios." };
    }
    return {
      ok: true,
      customer: asCustomer(next),
      metadata: (next.metadata || {}) as Record<string, unknown>,
    };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos guardar tus datos"),
    };
  }
}

export async function saveCustomerFavorites(
  data: FavoritesData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await mergeCustomerMetadata({
    likes: data.likes,
    lists: data.lists,
  });
  if (!result.ok) return result;
  return { ok: true };
}

async function ensureCustomerFromAuth(meta?: {
  email?: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
}): Promise<void> {
  await medusa.client.fetch("/auth/customer/ensure", {
    method: "POST",
    body: {
      email: meta?.email,
      first_name: meta?.first_name,
      last_name: meta?.last_name,
      picture: meta?.picture,
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
  phone: string;
  birthday: string;
}): Promise<AuthResult> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "El servicio de cuenta no está disponible ahora." };
  }

  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone.trim();
  const birthday = input.birthday.trim();

  if (!phone || !birthday) {
    return { ok: false, error: "Teléfono y cumpleaños son obligatorios." };
  }

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
      phone,
      metadata: {
        birthday,
        profile_complete: true,
      },
    });
  } catch {
    try {
      await medusa.store.customer.update({
        first_name: firstName,
        last_name: lastName,
        phone,
        metadata: {
          birthday,
          profile_complete: true,
        },
      });
    } catch {
      /* continue to login */
    }
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
    const meta = decoded.user_metadata || {};
    // Always ensure/repair — including when actor_id exists (fixes email = Google sub)
    try {
      await ensureCustomerFromAuth({
        email: String(meta.email || "") || undefined,
        first_name: String(meta.given_name || meta.first_name || "") || undefined,
        last_name: String(meta.family_name || meta.last_name || "") || undefined,
        picture: String(meta.picture || "") || undefined,
      });
      await medusa.auth.refresh();
    } catch (ensureError) {
      console.error("[auth] ensure customer failed:", ensureError);
      const needsCustomer =
        decoded.actor_id === "" || decoded.actor_id == null || !decoded.actor_id;
      if (needsCustomer) {
        const email = String(meta.email || "");
        if (email && isValidEmail(email)) {
          try {
            await medusa.store.customer.create({
              email,
              metadata: meta.picture
                ? {
                    avatar_url: String(meta.picture),
                    google_picture: String(meta.picture),
                    google_email: email,
                  }
                : { google_email: email },
            });
            await medusa.auth.refresh();
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

/** Google One Tap / GIS credential → Medusa JWT session */
export async function loginWithGoogleIdToken(idToken: string): Promise<AuthResult> {
  if (!isMedusaConfigured()) {
    return {
      ok: false,
      error:
        "Falta configurar NEXT_PUBLIC_MEDUSA_BACKEND_URL y NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.",
    };
  }
  try {
    const data = await medusa.client.fetch<{ token: string }>(
      "/auth/customer/google/id-token",
      {
        method: "POST",
        body: { id_token: idToken },
      }
    );
    if (!data?.token) {
      return { ok: false, error: "Google no devolvió una sesión válida." };
    }
    medusa.client.setToken(data.token);
    return afterAuthSuccess();
  } catch (error) {
    console.error("[auth] Google id_token login failed:", error);
    return {
      ok: false,
      error: authErrorMessage(
        error,
        "No pudimos iniciar sesión con Google One Tap"
      ),
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

export async function updateCustomerProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthday?: string;
}): Promise<AuthResult> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "El servicio de cuenta no está disponible ahora." };
  }
  try {
    const current = await retrieveCustomerRecord();
    if (!current) {
      return { ok: false, error: "No pudimos actualizar el perfil." };
    }

    const phone = input.phone?.trim();
    const birthdayInput = input.birthday?.trim();
    const existingMeta = current.metadata || {};
    const existingBirthday =
      (typeof existingMeta.birthday === "string" && existingMeta.birthday.trim()) ||
      "";
    // Birthday is immutable once set
    const birthday = existingBirthday || birthdayInput || "";

    await medusa.store.customer.update({
      first_name: input.firstName?.trim() || undefined,
      last_name: input.lastName?.trim() || undefined,
      phone: phone || undefined,
      metadata: {
        ...existingMeta,
        ...(birthday ? { birthday } : {}),
        ...(phone && birthday ? { profile_complete: true } : {}),
      },
    });
    const customer = await getCustomer();
    if (!customer) {
      return { ok: false, error: "No pudimos actualizar el perfil." };
    }
    return { ok: true, customer };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos guardar tus datos"),
    };
  }
}

export function needsProfileCompletion(customer: StoreCustomer | null): boolean {
  if (!customer) return false;
  return !customer.phone || !customer.birthday;
}
