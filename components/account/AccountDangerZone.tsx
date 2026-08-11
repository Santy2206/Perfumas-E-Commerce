"use client";

import { FormEvent, useState } from "react";
import { deleteCustomerAccount } from "../../lib/auth";
import { useCustomerStore } from "../../store/useCustomerStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function AccountDangerZone() {
  const customer = useCustomerStore((s) => s.customer);
  const clear = useCustomerStore((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!customer) return null;

  const onDelete = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await deleteCustomerAccount({ confirm });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await clear();
    window.location.href = "/tienda";
  };

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-ink-60">
        Eliminar tu cuenta borra el acceso a pedidos vinculados a este perfil,
        favoritos y datos de cuenta. Esta acción no se puede deshacer.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-red-600/50 text-red-700 hover:border-red-600 hover:bg-red-50"
        onClick={() => {
          setError(null);
          setConfirm("");
          setOpen(true);
        }}
      >
        Eliminar cuenta
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => void onDelete(e)}
            className="w-full max-w-md space-y-4 overflow-hidden rounded-sm border-2 border-red-600/30 bg-white p-0 shadow-xl"
          >
            <div className="border-b border-red-600/20 bg-ink px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">
                Zona peligrosa
              </p>
            </div>
            <div className="space-y-4 px-5 pb-5 pt-4">
              <h3 className="font-display text-xl text-ink">Eliminar cuenta</h3>
              <p className="text-sm text-ink-60">
                Escribe <span className="font-semibold text-ink">ELIMINAR</span>{" "}
                para confirmar que quieres borrar tu cuenta de Perfumas.
              </p>
              <div>
                <Label htmlFor="delete-confirm">Confirmación</Label>
                <Input
                  id="delete-confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="ELIMINAR"
                  required
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={busy || confirm.trim().toUpperCase() !== "ELIMINAR"}
                  className="bg-red-700 text-white hover:bg-red-600"
                >
                  {busy ? "Eliminando…" : "Eliminar definitivamente"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
