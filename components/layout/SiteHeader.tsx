"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  History,
  List,
  LogOut,
  Menu,
  ShoppingBag,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCartStore } from "../../store/useCartStore";
import { useCustomerStore } from "../../store/useCustomerStore";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { MARKETING_HOME_URL } from "../../lib/site";

const NAV = [
  { href: "/crear", label: "Preparar" },
  { href: "/tienda/perfumeria", label: "Preparadas" },
  { href: "/tienda/insumos", label: "Insumos" },
  { href: "/tienda/hogar", label: "Hogar" },
  { href: "/tienda/accesorios", label: "Accesorios" },
  { href: "/mayoristas", label: "Mayoristas" },
];

const MENU_LINK_CLASS =
  "flex items-center gap-2.5 px-4 py-2.5 text-xs uppercase tracking-widest text-bone-60 hover:bg-wine-900 hover:text-gold-400";

function MenuRow({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <Link href={href} className={MENU_LINK_CLASS} onClick={onClick}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      {label}
    </Link>
  );
}

function AccountMenu() {
  const router = useRouter();
  const customer = useCustomerStore((s) => s.customer);
  const clear = useCustomerStore((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const initial =
    customer?.first_name?.charAt(0)?.toUpperCase() ||
    customer?.email?.charAt(0)?.toUpperCase() ||
    "?";
  const displayName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    customer?.email ||
    "Cuenta";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!customer) {
    return (
      <div className="hidden items-center gap-3 sm:flex">
        <Link
          href="/cuenta/registro"
          className="whitespace-nowrap text-xs uppercase tracking-widest text-bone-60 hover:text-gold-400"
        >
          Crear cuenta
        </Link>
        <Link
          href="/cuenta/login"
          className="whitespace-nowrap text-xs uppercase tracking-widest text-gold-400 hover:text-gold-100"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const logout = async () => {
    setLoggingOut(true);
    await clear();
    setLoggingOut(false);
    setOpen(false);
    router.push("/");
  };

  const Avatar = ({ size = "sm" }: { size?: "sm" | "lg" }) =>
    customer.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customer.avatar_url}
        alt=""
        className={cn(
          "rounded-full object-cover ring-1 ring-gold-400/40",
          size === "lg" ? "h-14 w-14" : "h-8 w-8"
        )}
        referrerPolicy="no-referrer"
      />
    ) : (
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-gold-400 font-bold text-wine-950",
          size === "lg" ? "h-14 w-14 text-lg" : "h-8 w-8 text-xs"
        )}
      >
        {initial}
      </span>
    );

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="flex items-center"
        aria-label="Mi cuenta"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 min-w-[220px] pt-2">
          <div className="rounded-sm border border-gold-400/25 bg-wine-950 py-3 shadow-lg">
            <div className="flex flex-col items-center gap-2 px-4 pb-3">
              <Avatar size="lg" />
              <p className="text-center text-sm font-medium text-bone">{displayName}</p>
            </div>
            <div className="border-t border-gold-400/15 pt-1">
              <MenuRow
                href="/cuenta#detalles"
                label="Detalles"
                icon={UserRound}
                onClick={() => setOpen(false)}
              />
              <MenuRow
                href="/cuenta#historial"
                label="Historial"
                icon={History}
                onClick={() => setOpen(false)}
              />
              <MenuRow
                href="/cuenta/me-gusta"
                label="Me gusta"
                icon={Heart}
                onClick={() => setOpen(false)}
              />
              <MenuRow
                href="/cuenta/listas"
                label="Mis listas"
                icon={List}
                onClick={() => setOpen(false)}
              />
              <div className="my-1 border-t border-gold-400/15" />
              <button
                type="button"
                disabled={loggingOut}
                className={cn(
                  MENU_LINK_CLASS,
                  "w-full disabled:opacity-40"
                )}
                onClick={() => void logout()}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                {loggingOut ? "…" : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const count = useCartStore((s) => s.lines.length);
  const isB2B = useCartStore((s) => s.isB2B);
  const customer = useCustomerStore((s) => s.customer);
  const clear = useCustomerStore((s) => s.clear);
  const likesCount = useFavoritesStore((s) => s.likes.length);
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gold-400/20 bg-wine-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/tienda"
            className="font-display text-xl text-gold-400 tracking-wide hover:text-gold-100 transition-colors"
          >
            Perfumas
          </Link>
          <a
            href={MARKETING_HOME_URL}
            className="hidden sm:inline text-[10px] uppercase tracking-widest text-bone-60 hover:text-gold-400"
          >
            ← Volver a Perfumas
          </a>
        </div>

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
          {customer && (
            <Link
              href="/cuenta/me-gusta"
              className="relative text-bone hover:text-gold-400"
              aria-label="Me gusta"
            >
              <Heart className="h-5 w-5" strokeWidth={1.75} />
              {likesCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-wine-950">
                  {likesCount > 99 ? "99+" : likesCount}
                </span>
              )}
            </Link>
          )}
          <AccountMenu />
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
            <li>
              <a
                href={MARKETING_HOME_URL}
                className="block rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-gold-400 hover:bg-wine-900"
              >
                ← Volver a Perfumas
              </a>
            </li>
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
            {customer ? (
              <>
                <li>
                  <Link
                    href="/cuenta#detalles"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-bone hover:bg-wine-900"
                  >
                    <UserRound className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    Detalles
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cuenta#historial"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-bone hover:bg-wine-900"
                  >
                    <History className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    Historial
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cuenta/me-gusta"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-bone hover:bg-wine-900"
                  >
                    <Heart className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    Me gusta
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cuenta/listas"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-bone hover:bg-wine-900"
                  >
                    <List className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    Mis listas
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm uppercase tracking-widest text-bone hover:bg-wine-900"
                    onClick={() => {
                      setOpen(false);
                      void clear().then(() => router.push("/"));
                    }}
                  >
                    <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    Cerrar sesión
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    href="/cuenta/registro"
                    onClick={() => setOpen(false)}
                    className="block rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-bone hover:bg-wine-900"
                  >
                    Crear cuenta
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cuenta/login"
                    onClick={() => setOpen(false)}
                    className="block rounded-sm px-3 py-3 text-sm uppercase tracking-widest text-gold-400 hover:bg-wine-900"
                  >
                    Iniciar sesión
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
