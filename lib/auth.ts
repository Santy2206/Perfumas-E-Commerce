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

export type AccountMergeConflict = {
  email: string;
  merge_token: string;
  existing_providers: string[];
  message: string;
};

export type AuthResult =
  | { ok: true; customer: StoreCustomer }
  | {
      ok: false;
      error: string;
      redirect?: string;
      conflict?: AccountMergeConflict;
    };

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

type EnsureResponse =
  | {
      status?: "ok" | "conflict";
      customer_id?: string;
      mode?: string;
      code?: string;
      email?: string;
      merge_token?: string;
      existing_providers?: string[];
      message?: string;
    }
  | Record<string, unknown>;

async function ensureCustomerFromAuth(meta?: {
  email?: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
  link_token?: string;
  link_customer_id?: string;
  confirm_merge?: boolean;
  merge_token?: string;
  password?: string;
}): Promise<
  | { ok: true; customerId?: string; mode?: string }
  | { ok: false; conflict: AccountMergeConflict }
> {
  const data = await medusa.client.fetch<EnsureResponse>(
    "/auth/customer/ensure",
    {
      method: "POST",
      body: {
        email: meta?.email,
        first_name: meta?.first_name,
        last_name: meta?.last_name,
        picture: meta?.picture,
        link_token: meta?.link_token,
        link_customer_id: meta?.link_customer_id,
        confirm_merge: meta?.confirm_merge,
        merge_token: meta?.merge_token,
        password: meta?.password,
      },
    }
  );

  if (data && data.status === "conflict" && data.merge_token) {
    return {
      ok: false,
      conflict: {
        email: String(data.email || meta?.email || ""),
        merge_token: String(data.merge_token),
        existing_providers: Array.isArray(data.existing_providers)
          ? data.existing_providers.map(String)
          : ["emailpass"],
        message:
          String(data.message || "") ||
          "Ya existe una cuenta con este correo y contraseña.",
      },
    };
  }

  return {
    ok: true,
    customerId:
      typeof data?.customer_id === "string" ? data.customer_id : undefined,
    mode: typeof data?.mode === "string" ? data.mode : undefined,
  };
}

export async function confirmGoogleAccountMerge(input: {
  email: string;
  mergeToken: string;
  password: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
}): Promise<AuthResult> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "Cuenta no disponible." };
  }
  try {
    const result = await ensureCustomerFromAuth({
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      picture: input.picture,
      confirm_merge: true,
      merge_token: input.mergeToken,
      password: input.password,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.conflict.message,
        conflict: result.conflict,
      };
    }
    await medusa.auth.refresh().catch(() => undefined);
    return afterAuthSuccess();
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos unir las cuentas"),
    };
  }
}

export type AuthProviders = {
  google: boolean;
  emailpass: boolean;
  email: string;
};

export async function repairCustomerEmail(): Promise<StoreCustomer | null> {
  if (!isMedusaConfigured()) return null;
  try {
    const result = await ensureCustomerFromAuth();
    if (!result.ok) {
      // Conflict needs interactive merge — leave profile as-is
      console.info("[auth] repair needs merge:", result.conflict.email);
      return getCustomer();
    }
    // Refresh JWT so actor_id picks up a merged customer_id after Google/email repair
    await medusa.auth.refresh().catch(() => undefined);
    return getCustomer();
  } catch (error) {
    console.warn("[auth] repairCustomerEmail failed:", error);
    return getCustomer();
  }
}

export async function deleteCustomerAccount(input: {
  confirm: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "Cuenta no disponible." };
  }
  try {
    await medusa.client.fetch("/auth/customer/delete", {
      method: "DELETE",
      body: { confirm: input.confirm },
    });
    await logout();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos eliminar la cuenta"),
    };
  }
}

export async function getAuthProviders(): Promise<
  | { ok: true; providers: AuthProviders }
  | { ok: false; error: string }
> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "Cuenta no disponible." };
  }
  try {
    const data = await medusa.client.fetch<AuthProviders>(
      "/auth/customer/providers",
      { method: "GET" }
    );
    return { ok: true, providers: data };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos leer los métodos de acceso"),
    };
  }
}

export async function setCustomerPassword(input: {
  password: string;
  currentPassword?: string;
}): Promise<{ ok: true; mode?: string } | { ok: false; error: string }> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "Cuenta no disponible." };
  }
  try {
    const data = await medusa.client.fetch<{ ok: boolean; mode?: string }>(
      "/auth/customer/password",
      {
        method: "POST",
        body: {
          password: input.password,
          current_password: input.currentPassword,
        },
      }
    );
    return { ok: true, mode: data.mode };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos guardar la contraseña"),
    };
  }
}

export async function requestEmailChange(input: {
  newEmail: string;
  password: string;
}): Promise<
  | { ok: true; devCode?: string }
  | { ok: false; error: string }
> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "Cuenta no disponible." };
  }
  try {
    const data = await medusa.client.fetch<{ ok: boolean; dev_code?: string }>(
      "/auth/customer/email/request",
      {
        method: "POST",
        body: {
          new_email: input.newEmail,
          password: input.password,
        },
      }
    );
    return { ok: true, devCode: data.dev_code };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos iniciar el cambio de correo"),
    };
  }
}

export async function confirmEmailChange(
  code: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "Cuenta no disponible." };
  }
  try {
    const data = await medusa.client.fetch<{ ok: boolean; email: string }>(
      "/auth/customer/email/confirm",
      {
        method: "POST",
        body: { code },
      }
    );
    return { ok: true, email: data.email };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos confirmar el correo"),
    };
  }
}

const GOOGLE_LINK_KEY = "perfumas_google_link";

export async function startGoogleLink(): Promise<
  | { ok: true; redirect: string }
  | { ok: false; error: string }
> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "Cuenta no disponible." };
  }
  try {
    const customer = await getCustomer();
    if (!customer) {
      return { ok: false, error: "Debes iniciar sesión." };
    }
    const prep = await medusa.client.fetch<{
      ok: boolean;
      link_token: string;
      customer_id: string;
    }>("/auth/customer/google/link", { method: "POST", body: {} });

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        GOOGLE_LINK_KEY,
        JSON.stringify({
          link_token: prep.link_token,
          customer_id: prep.customer_id,
        })
      );
    }

    const result = await medusa.auth.login("customer", "google", {});
    if (
      typeof result === "object" &&
      result &&
      "location" in result &&
      typeof result.location === "string"
    ) {
      return { ok: true, redirect: result.location };
    }
    return { ok: false, error: "No pudimos abrir Google." };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos iniciar el vínculo con Google"),
    };
  }
}

export async function unlinkGoogle(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!isMedusaConfigured()) {
    return { ok: false, error: "Cuenta no disponible." };
  }
  try {
    await medusa.client.fetch("/auth/customer/google/unlink", {
      method: "DELETE",
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: authErrorMessage(error, "No pudimos desvincular Google"),
    };
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
  // Sync wholesale session from Medusa (group emprendedores / b2b_status).
  try {
    const { fetchB2BStatus } = await import("./b2b");
    const status = await fetchB2BStatus(customer.id);
    if (status.approved) {
      useCartStore.getState().setB2BSession({
        businessName: status.business_name || customer.email,
        nit: status.nit || "",
        phone: status.phone || customer.phone || "",
        city: status.city || "",
        email: status.email || customer.email,
        status: "approved",
        customerId: customer.id,
      });
    } else if (useCartStore.getState().isB2B) {
      // Drop stale client-side wholesale if Medusa says not approved.
      useCartStore.getState().setB2BSession(null);
    }
  } catch {
    /* non-blocking */
  }
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
    let linkToken: string | undefined;
    let linkCustomerId: string | undefined;
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(GOOGLE_LINK_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            link_token?: string;
            customer_id?: string;
          };
          linkToken = parsed.link_token;
          linkCustomerId = parsed.customer_id;
          sessionStorage.removeItem(GOOGLE_LINK_KEY);
        }
      } catch {
        /* ignore */
      }
    }
    // Always ensure/repair — including when actor_id exists (fixes email = Google sub)
    const ensurePayload = {
      email: String(meta.email || "") || undefined,
      first_name: String(meta.given_name || meta.first_name || "") || undefined,
      last_name: String(meta.family_name || meta.last_name || "") || undefined,
      picture: String(meta.picture || "") || undefined,
    };
    try {
      const ensured = await ensureCustomerFromAuth({
        ...ensurePayload,
        link_token: linkToken,
        link_customer_id: linkCustomerId,
      });
      if (!ensured.ok) {
        return {
          ok: false,
          error: ensured.conflict.message,
          conflict: ensured.conflict,
        };
      }
      await medusa.auth.refresh();
    } catch (ensureError) {
      console.error("[auth] ensure customer failed:", ensureError);
      // Stale link intent from a cancelled "Vincular Google" must not block login
      if (linkToken) {
        try {
          const retry = await ensureCustomerFromAuth(ensurePayload);
          if (!retry.ok) {
            return {
              ok: false,
              error: retry.conflict.message,
              conflict: retry.conflict,
            };
          }
          await medusa.auth.refresh();
        } catch {
          return {
            ok: false,
            error: authErrorMessage(
              ensureError,
              "No pudimos vincular Google a tu cuenta. ¿El Gmail coincide con tu correo?"
            ),
          };
        }
      } else {
        const needsCustomer =
          decoded.actor_id === "" ||
          decoded.actor_id == null ||
          !decoded.actor_id;
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
    const data = await medusa.client.fetch<{
      status?: string;
      token?: string;
      email?: string;
      merge_token?: string;
      existing_providers?: string[];
      message?: string;
    }>("/auth/customer/google/id-token", {
      method: "POST",
      body: { id_token: idToken },
    });
    if (!data?.token) {
      return { ok: false, error: "Google no devolvió una sesión válida." };
    }
    medusa.client.setToken(data.token);
    if (data.status === "conflict" && data.merge_token) {
      return {
        ok: false,
        error:
          data.message ||
          "Ya existe una cuenta con este correo y contraseña.",
        conflict: {
          email: String(data.email || ""),
          merge_token: String(data.merge_token),
          existing_providers: Array.isArray(data.existing_providers)
            ? data.existing_providers.map(String)
            : ["emailpass"],
          message:
            data.message ||
            "Ya existe una cuenta con este correo y contraseña.",
        },
      };
    }
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
