"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  confirmEmailChange,
  getAuthProviders,
  requestEmailChange,
  setCustomerPassword,
  startGoogleLink,
  unlinkGoogle,
  type AuthProviders,
} from "../../lib/auth";
import { useCustomerStore } from "../../store/useCustomerStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Modal = "password" | "email" | null;

export function AccountAccessPanel() {
  const customer = useCustomerStore((s) => s.customer);
  const setCustomer = useCustomerStore((s) => s.setCustomer);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"request" | "confirm">("request");
  const [devCode, setDevCode] = useState<string | null>(null);

  const refresh = async () => {
    const result = await getAuthProviders();
    if (result.ok) setProviders(result.providers);
    else setError(result.error);
    setLoading(false);
  };

  useEffect(() => {
    if (!customer) return;
    void refresh();
  }, [customer?.id]);

  const closeModal = () => {
    setModal(null);
    setPassword("");
    setCurrentPassword("");
    setNewEmail("");
    setEmailCode("");
    setEmailStep("request");
    setDevCode(null);
  };

  const onPassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    const result = await setCustomerPassword({
      password,
      currentPassword: providers?.emailpass ? currentPassword : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMsg(
      result.mode === "created"
        ? "Contraseña creada. Ya puedes desvincular Google o cambiar el correo."
        : "Contraseña actualizada."
    );
    closeModal();
    await refresh();
  };

  const onEmailRequest = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    const result = await requestEmailChange({
      newEmail,
      password: currentPassword,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDevCode(result.devCode || null);
    setEmailStep("confirm");
    setMsg(
      result.devCode
        ? `Código de desarrollo: ${result.devCode}`
        : "Enviamos un código al correo nuevo."
    );
  };

  const onEmailConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await confirmEmailChange(emailCode);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const { getCustomer } = await import("../../lib/auth");
    const next = await getCustomer();
    if (next) setCustomer(next);
    setMsg(`Correo actualizado a ${result.email}`);
    closeModal();
    await refresh();
  };

  const onLinkGoogle = async () => {
    setBusy(true);
    setError(null);
    const result = await startGoogleLink();
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    window.location.href = result.redirect;
  };

  const onUnlinkGoogle = async () => {
    if (!confirm("¿Desvincular Google de esta cuenta?")) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    const result = await unlinkGoogle();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMsg("Google desvinculado.");
    await refresh();
  };

  if (!customer) return null;

  return (
    <div id="acceso" className="space-y-3 border-t-2 border-gold-400/30 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
        Acceso y correo
      </p>

      {loading ? (
        <p className="text-sm text-ink-60">Cargando métodos de acceso…</p>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-sm border border-ink/10 bg-paper-soft px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-60">
              Correo de acceso
            </dt>
            <dd className="mt-1 truncate text-sm font-semibold text-ink">
              {providers?.email || customer.email || "—"}
            </dd>
          </div>
          <div className="rounded-sm border border-ink/10 bg-paper-soft px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-60">
              Google
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {providers?.google ? (
                <span className="text-gold-400">Vinculado</span>
              ) : (
                "No vinculado"
              )}
            </dd>
          </div>
          <div className="rounded-sm border border-ink/10 bg-paper-soft px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-60">
              Contraseña
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {providers?.emailpass ? "Configurada" : "No configurada"}
            </dd>
          </div>
        </dl>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm font-medium text-gold-400">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || loading}
          onClick={() => {
            setError(null);
            setMsg(null);
            setModal("password");
          }}
        >
          {providers?.emailpass ? "Cambiar contraseña" : "Crear contraseña"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || loading || !providers?.emailpass}
          onClick={() => {
            setError(null);
            setMsg(null);
            setEmailStep("request");
            setModal("email");
          }}
          title={
            !providers?.emailpass ? "Crea una contraseña primero" : undefined
          }
        >
          Cambiar correo
        </Button>
        {providers?.google ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || loading || !providers.emailpass}
            onClick={() => void onUnlinkGoogle()}
            title={
              !providers.emailpass
                ? "Crea una contraseña antes de desvincular Google"
                : undefined
            }
          >
            Desvincular Google
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || loading}
            onClick={() => void onLinkGoogle()}
          >
            Vincular Google
          </Button>
        )}
      </div>

      {!providers?.emailpass && providers?.google && (
        <p className="text-xs leading-relaxed text-ink-60">
          Tu cuenta entró con Google. Crea una contraseña para poder cambiar el
          correo o desvincular Google sin perder el acceso.
        </p>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-sm border-2 border-ink/10 bg-white shadow-xl">
            <div className="border-b border-gold-400/30 bg-ink px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">
                Seguridad
              </p>
            </div>
            <div className="p-5">
              {modal === "password" && (
                <form onSubmit={(e) => void onPassword(e)} className="space-y-4">
                  <h3 className="font-display text-xl text-ink">
                    {providers?.emailpass
                      ? "Cambiar contraseña"
                      : "Crear contraseña"}
                  </h3>
                  {providers?.emailpass && (
                    <div>
                      <Label htmlFor="current-password">Contraseña actual</Label>
                      <Input
                        id="current-password"
                        type="password"
                        required
                        minLength={8}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="new-password">Nueva contraseña</Label>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy}>
                      {busy ? "Guardando…" : "Guardar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={closeModal}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {modal === "email" && emailStep === "request" && (
                <form
                  onSubmit={(e) => void onEmailRequest(e)}
                  className="space-y-4"
                >
                  <h3 className="font-display text-xl text-ink">Cambiar correo</h3>
                  <p className="text-sm text-ink-60">
                    Confirma tu contraseña y el correo nuevo. Te enviaremos un
                    código de verificación.
                  </p>
                  <div>
                    <Label htmlFor="email-password">Contraseña actual</Label>
                    <Input
                      id="email-password"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-email">Correo nuevo</Label>
                    <Input
                      id="new-email"
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy}>
                      {busy ? "Enviando…" : "Enviar código"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={closeModal}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {modal === "email" && emailStep === "confirm" && (
                <form
                  onSubmit={(e) => void onEmailConfirm(e)}
                  className="space-y-4"
                >
                  <h3 className="font-display text-xl text-ink">
                    Confirma el código
                  </h3>
                  <p className="text-sm text-ink-60">
                    Revisa {newEmail} e ingresa el código de 6 dígitos.
                  </p>
                  {devCode && (
                    <p className="text-xs font-medium text-gold-400">
                      Modo local (sin Resend): {devCode}
                    </p>
                  )}
                  <div>
                    <Label htmlFor="email-code">Código</Label>
                    <Input
                      id="email-code"
                      inputMode="numeric"
                      required
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy}>
                      {busy ? "Confirmando…" : "Confirmar correo"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={closeModal}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
