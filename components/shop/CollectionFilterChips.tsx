"use client";

import { Heart, List } from "lucide-react";
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
      "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors",
      active
        ? "border-gold-400 bg-gold-400 text-ink"
        : "border-ink/20 bg-paper-soft text-ink hover:border-gold-400 hover:text-gold-400"
    );

  return (
    <div className={cn(className)}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        <button
          type="button"
          onClick={() => select("likes")}
          className={chip(value === "likes")}
        >
          <Heart
            className={cn("h-3 w-3", value === "likes" && "fill-ink")}
            strokeWidth={1.75}
            aria-hidden
          />
          Mis me gusta
        </button>
        <button
          type="button"
          onClick={() => select("any-list")}
          className={chip(value === "any-list")}
        >
          <List className="h-3 w-3" strokeWidth={1.75} aria-hidden />
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
