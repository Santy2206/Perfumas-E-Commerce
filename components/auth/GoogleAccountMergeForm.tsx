"use client";

import { FormEvent, useState } from "react";
import {
  confirmGoogleAccountMerge,
  logout,
  type AccountMergeConflict,
  type StoreCustomer,
} from "../../lib/auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Props = {
  conflict: AccountMergeConflict;
  onMerged: (customer: StoreCustomer) => void;
  onCancel?: () => void;
};

export function GoogleAccountMergeForm({
  conflict,
  onMerged,
  onCancel,
}: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await confirmGoogleAccountMerge({
      email: conflict.email,
      mergeToken: conflict.merge_token,
      password,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onMerged(result.customer);
  };

  const cancel = async () => {
    setBusy(true);
    await logout();
    onCancel?.();
    if (!onCancel && typeof window !== "undefined") {
      window.location.href = "/cuenta/login";
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4 text-left">
      <div>
        <h1 className="font-display text-2xl text-ink mb-2">
          Esta cuenta ya existe
        </h1>
        <p className="text-sm text-ink-60">
          El correo{" "}
          <span className="text-ink font-medium">{conflict.email}</span> ya
          tiene acceso con correo y contraseña. Confirma tu contraseña para
          unir Google a esa misma cuenta.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="merge-password">Contraseña actual</Label>
        <Input
          id="merge-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || password.length < 1}>
          {busy ? "Uniendo…" : "Unir cuentas"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => void cancel()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
