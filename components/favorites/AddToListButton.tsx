"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { BuildPayload } from "../../lib/build-pricing";
import { cn } from "../../lib/utils";
import { useCustomerStore } from "../../store/useCustomerStore";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type SkuTarget = {
  type: "sku";
  productId: string;
  productKind?: string;
  title?: string;
  handle?: string;
};

type BuildTarget = {
  type: "build";
  build: BuildPayload;
  title: string;
};

export function AddToListButton({
  target,
  className,
  label = "Añadir a lista",
}: {
  target: SkuTarget | BuildTarget;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const customer = useCustomerStore((s) => s.customer);
  const lists = useFavoritesStore((s) => s.lists);
  const createList = useFavoritesStore((s) => s.createList);
  const addSkuToList = useFavoritesStore((s) => s.addSkuToList);
  const addBuildToList = useFavoritesStore((s) => s.addBuildToList);
  const isInListSku = useFavoritesStore((s) => s.isInListSku);

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const requireAuth = () => {
    router.push(
      `/cuenta/login?returnTo=${encodeURIComponent(pathname || "/")}`
    );
  };

  const onOpen = () => {
    if (!customer) {
      requireAuth();
      return;
    }
    setMsg(null);
    setOpen((v) => !v);
  };

  const addTo = async (listId: string) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const result =
      target.type === "sku"
        ? await addSkuToList(listId, target)
        : await addBuildToList(listId, target.build, target.title);
    setBusy(false);
    if (!result.ok) {
      if (result.needAuth) requireAuth();
      else setMsg(result.error);
      return;
    }
    setMsg("Añadido a la lista.");
    setOpen(false);
  };

  const onCreate = async () => {
    if (busy || !newName.trim()) return;
    setBusy(true);
    setMsg(null);
    const created = await createList(newName);
    if (!created.ok) {
      setBusy(false);
      if (created.needAuth) requireAuth();
      else setMsg(created.error);
      return;
    }
    setNewName("");
    const result =
      target.type === "sku"
        ? await addSkuToList(created.listId, target)
        : await addBuildToList(created.listId, target.build, target.title);
    setBusy(false);
    if (!result.ok) {
      setMsg(result.error);
      return;
    }
    setMsg("Lista creada.");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onOpen}
      >
        {label}
      </Button>
      {msg && !open && (
        <p className="mt-1 text-center text-[10px] text-gold-400">{msg}</p>
      )}
      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1 rounded-sm border border-gold-400/30 bg-paper p-3 shadow-lg">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-ink-60">
            Tus listas
          </p>
          {lists.length === 0 ? (
            <p className="mb-3 text-xs text-ink-60">Aún no tienes listas.</p>
          ) : (
            <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto">
              {lists.map((list) => {
                const already =
                  target.type === "sku" &&
                  isInListSku(list.id, target.productId);
                return (
                  <li key={list.id}>
                    <button
                      type="button"
                      disabled={busy || already}
                      onClick={() => void addTo(list.id)}
                      className="w-full rounded-sm px-2 py-2 text-left text-xs text-ink hover:bg-paper-soft disabled:opacity-40"
                    >
                      {list.name}
                      {already ? " · ya está" : ""}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="space-y-2 border-t border-gold-400/20 pt-2">
            <p className="text-[10px] uppercase tracking-widest text-ink-60">
              Crear nueva lista
            </p>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la lista"
              className="h-9 text-xs"
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={busy || !newName.trim()}
              onClick={() => void onCreate()}
            >
              Crear y añadir
            </Button>
          </div>
          {msg && <p className="mt-2 text-xs text-gold-400">{msg}</p>}
        </div>
      )}
    </div>
  );
}
