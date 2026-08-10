"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { FavoriteItemCard } from "../../../components/favorites/FavoriteItemCard";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useCustomerStore } from "../../../store/useCustomerStore";
import { useFavoritesStore } from "../../../store/useFavoritesStore";

export default function ListasPage() {
  const customer = useCustomerStore((s) => s.customer);
  const loading = useCustomerStore((s) => s.loading);
  const lists = useFavoritesStore((s) => s.lists);
  const createList = useFavoritesStore((s) => s.createList);
  const renameList = useFavoritesStore((s) => s.renameList);
  const deleteList = useFavoritesStore((s) => s.deleteList);
  const removeFromList = useFavoritesStore((s) => s.removeFromList);

  const [newName, setNewName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <p className="text-sm text-bone-60">Cargando…</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <h1 className="font-display text-3xl text-bone mb-4">Mis listas</h1>
        <p className="text-sm text-bone-60 mb-6">
          Inicia sesión para crear listas y guardar productos.
        </p>
        <Button asChild>
          <Link href="/cuenta/login?returnTo=/cuenta/listas">
            Iniciar sesión
          </Link>
        </Button>
      </div>
    );
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setBusy(true);
    const result = await createList(newName);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewName("");
    setOpenId(result.listId);
    setMsg("Lista creada.");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-2">Mis listas</h1>
      <p className="text-sm text-bone-60 mb-8">
        Organiza productos y creaciones en listas con el nombre que quieras.
      </p>

      <form onSubmit={(e) => void onCreate(e)} className="mb-10 space-y-3">
        <Label htmlFor="list-name">Nueva lista</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="list-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej. Regalos mamá"
            className="max-w-xs"
          />
          <Button type="submit" size="sm" disabled={busy || !newName.trim()}>
            Crear lista
          </Button>
        </div>
      </form>

      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
      {msg && <p className="mb-4 text-sm text-gold-400">{msg}</p>}

      {lists.length === 0 ? (
        <p className="text-sm text-bone-60">
          Aún no tienes listas. Crea una o usa «Añadir a lista» en un producto.
        </p>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => {
            const open = openId === list.id;
            return (
              <div
                key={list.id}
                className="rounded-sm border border-gold-400/20 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => {
                      setOpenId(open ? null : list.id);
                      setRenameValue(list.name);
                    }}
                  >
                    <p className="font-display text-xl text-bone">{list.name}</p>
                    <p className="text-xs text-bone-60">
                      {list.items.length} artículo(s)
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOpenId(list.id);
                        setRenameValue(list.name);
                      }}
                    >
                      {open ? "Cerrar" : "Abrir"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        void deleteList(list.id).finally(() => setBusy(false));
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="mt-4 space-y-4 border-t border-gold-400/15 pt-4">
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy || !renameValue.trim()}
                        onClick={() => {
                          setBusy(true);
                          void renameList(list.id, renameValue).finally(() =>
                            setBusy(false)
                          );
                        }}
                      >
                        Renombrar
                      </Button>
                    </div>
                    {list.items.length === 0 ? (
                      <p className="text-sm text-bone-60">
                        Lista vacía. Añade productos desde el catálogo.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {list.items.map((item, idx) => (
                          <FavoriteItemCard
                            key={`${list.id}-${idx}`}
                            item={item}
                            onRemove={() => {
                              setBusy(true);
                              void removeFromList(list.id, item).finally(() =>
                                setBusy(false)
                              );
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
