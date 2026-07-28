"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "../../store/useCartStore";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

const NAV = [
  { href: "/crear", label: "Crear" },
  { href: "/tienda/perfumeria", label: "Perfumería" },
  { href: "/tienda/insumos", label: "Insumos" },
  { href: "/tienda/hogar", label: "Hogar" },
  { href: "/tienda/accesorios", label: "Accesorios" },
  { href: "/mayoristas", label: "Mayoristas" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount);
  const isB2B = useCartStore((s) => s.isB2B);
  const [open, setOpen] = useState(false);
  const count = itemCount();

  return (
    <header className="sticky top-0 z-40 border-b border-gold-400/20 bg-wine-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href="/" className="font-display text-xl text-gold-400 tracking-wide">
          Perfumas
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-sm px-3 py-2 text-xs uppercase tracking-widest transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-gold-400 text-wine-950"
                  : "text-bone-60 hover:text-gold-400"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isB2B && <Badge variant="b2b">Mayorista</Badge>}
          <Link href="/carrito" className="relative text-bone hover:text-gold-400" aria-label="Carrito">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-wine-950">
                {count}
              </span>
            )}
          </Link>
          <Link href="/cuenta" className="hidden text-xs uppercase tracking-widest text-bone-60 hover:text-gold-400 sm:inline">
            Cuenta
          </Link>
          <button
            type="button"
            className="text-bone lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-gold-400/20 px-4 py-4 lg:hidden">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-bone hover:bg-wine-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cuenta" onClick={() => setOpen(false)} className="block rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-bone hover:bg-wine-900">
                Cuenta
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
