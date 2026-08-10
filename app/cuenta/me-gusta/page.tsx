"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FavoriteItemCard } from "../../../components/favorites/FavoriteItemCard";
import { Button } from "../../../components/ui/button";
import {
  productKindLabel,
  type FavoriteItem,
} from "../../../lib/favorites";
import { useCustomerStore } from "../../../store/useCustomerStore";
import { useFavoritesStore } from "../../../store/useFavoritesStore";

function sectionKey(item: FavoriteItem): string {
  if (item.kind === "custom_build") return "custom_build";
  return item.productKind || "other";
}

const SECTION_ORDER = [
  "prepared_replica",
  "essence",
  "bottle",
  "custom_build",
  "alcohol",
  "pheromone",
  "other",
];

export default function MeGustaPage() {
  const customer = useCustomerStore((s) => s.customer);
  const loading = useCustomerStore((s) => s.loading);
  const likes = useFavoritesStore((s) => s.likes);
  const removeLike = useFavoritesStore((s) => s.removeLike);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const sections = useMemo(() => {
    const map = new Map<string, FavoriteItem[]>();
    for (const item of likes) {
      const key = sectionKey(item);
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return SECTION_ORDER.filter((k) => map.has(k)).map((k) => ({
      key: k,
      label: productKindLabel(k === "other" ? undefined : k),
      items: map.get(k) || [],
    }));
  }, [likes]);

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
        <h1 className="font-display text-3xl text-bone mb-4">Me gusta</h1>
        <p className="text-sm text-bone-60 mb-6">
          Inicia sesión para guardar perfumes, esencias y creaciones.
        </p>
        <Button asChild>
          <Link href="/cuenta/login?returnTo=/cuenta/me-gusta">
            Iniciar sesión
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-2">Me gusta</h1>
      <p className="text-sm text-bone-60 mb-8">
        Tus favoritos, separados por tipo de producto.
      </p>

      {likes.length === 0 ? (
        <p className="text-sm text-bone-60">
          Aún no tienes me gusta. Toca el corazón en el catálogo o guarda una
          creación en{" "}
          <Link href="/crear" className="text-gold-400 underline">
            Crear
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.key}>
              <h2 className="font-display text-xl text-bone mb-4">
                {section.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {section.items.map((item, idx) => {
                  const key =
                    item.kind === "sku"
                      ? `sku:${item.productId}`
                      : `build:${item.id}`;
                  return (
                    <FavoriteItemCard
                      key={`${key}-${idx}`}
                      item={item}
                      removing={busyKey === key}
                      onRemove={() => {
                        setBusyKey(key);
                        void removeLike(item).finally(() => setBusyKey(null));
                      }}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
