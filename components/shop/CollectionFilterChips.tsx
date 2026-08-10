"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCustomerStore } from "../../store/useCustomerStore";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import { cn } from "../../lib/utils";

/** null = off; likes; any list; or list:<id> */
export type CollectionFilter = null | "likes" | "any-list" | `list:${string}`;

export function CollectionFilterChips({
  value,
  onChange,
  className,
  label = "Colecciones",
}: {
  value: CollectionFilter;
  onChange: (v: CollectionFilter) => void;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const customer = useCustomerStore((s) => s.customer);
  const lists = useFavoritesStore((s) => s.lists);

  const requireAuth = () => {
    router.push(
      `/cuenta/login?returnTo=${encodeURIComponent(pathname || "/")}`
    );
  };

  const select = (next: CollectionFilter) => {
    if (next && !customer) {
      requireAuth();
      return;
    }
    onChange(value === next ? null : next);
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-sm border px-3 py-1.5 text-xs uppercase tracking-widest",
      active
        ? "border-gold-400 text-gold-400"
        : "border-white/15 text-bone-60 hover:border-gold-400/40"
    );

  return (
    <div className={cn("mb-4", className)}>
      <p className="mb-2 text-xs uppercase tracking-widest text-gold-400">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        <button
          type="button"
          onClick={() => select("likes")}
          className={chip(value === "likes")}
        >
          Mis me gusta
        </button>
        <button
          type="button"
          onClick={() => select("any-list")}
          className={chip(value === "any-list")}
        >
          En mis listas
        </button>
        {customer &&
          lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => select(`list:${list.id}`)}
              className={chip(value === `list:${list.id}`)}
            >
              {list.name}
            </button>
          ))}
      </div>
    </div>
  );
}
