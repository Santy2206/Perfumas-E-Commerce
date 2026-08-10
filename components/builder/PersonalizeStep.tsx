"use client";

import Link from "next/link";
import { FlaskConical, Home, Gem } from "lucide-react";
import { GIFT_WRAP_FEE } from "../../lib/mock-data";
import { PHEROMONES } from "../../lib/catalog";
import { useBuilderStore } from "../../store/useBuilderStore";
import { formatCOP } from "../../lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AddToListButton } from "../favorites/AddToListButton";
import { useFavoritesStore } from "../../store/useFavoritesStore";
import type { BuildPayload } from "../../lib/build-pricing";

const SHOP_LINKS: {
  href: string;
  label: string;
  blurb: string;
  image: string;
  icon: ReactNode;
  tone: string;
}[] = [
  {
    href: "/tienda/insumos",
    label: "Insumos",
    blurb: "Esencias, envases y alcohol",
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=640&q=80",
    icon: <FlaskConical className="h-5 w-5" aria-hidden />,
    tone: "from-wine-950/80 via-wine-900/50 to-gold-400/20",
  },
  {
    href: "/tienda/hogar",
    label: "Hogar",
    blurb: "Ambientales y cuidado",
    image:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=640&q=80",
    icon: <Home className="h-5 w-5" aria-hidden />,
    tone: "from-wine-950/80 via-wine-900/40 to-bone/10",
  },
  {
    href: "/tienda/accesorios",
    label: "Accesorios",
    blurb: "Bisutería y marroquinería",
    image:
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=640&q=80",
    icon: <Gem className="h-5 w-5" aria-hidden />,
    tone: "from-wine-950/85 via-wine-900/45 to-gold-400/15",
  },
];

export function PersonalizeStep() {
  const fragrance = useBuilderStore((s) => s.selectedFragrance);
  const bottle = useBuilderStore((s) => s.selectedBottle);
  const labelText = useBuilderStore((s) => s.labelText);
  const giftWrap = useBuilderStore((s) => s.giftWrap);
  const selectedPheromoneIds = useBuilderStore((s) => s.selectedPheromoneIds);
  const setLabelText = useBuilderStore((s) => s.setLabelText);
  const toggleGiftWrap = useBuilderStore((s) => s.toggleGiftWrap);
  const togglePheromone = useBuilderStore((s) => s.togglePheromone);
  const currentBuildTotal = useBuilderStore((s) => s.currentBuildTotal);
  const addBuildToCart = useBuilderStore((s) => s.addBuildToCart);
  const setStep = useBuilderStore((s) => s.setStep);
  const saveBuildLike = useFavoritesStore((s) => s.saveBuildLike);
  const router = useRouter();
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);
  const [savingLike, setSavingLike] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likeMsg, setLikeMsg] = useState<string | null>(null);

  if (!fragrance || !bottle) {
    return <p className="text-sm text-bone-60">Completa los pasos 1 y 2 primero.</p>;
  }

  const selectedPheromones = PHEROMONES.filter((p) => selectedPheromoneIds.includes(p.id));
  const extrasTotal =
    selectedPheromones.reduce((sum, p) => sum + p.price, 0) + (giftWrap ? GIFT_WRAP_FEE : 0);
  const coreTotal = currentBuildTotal() - extrasTotal;

  const buildPayload = (): BuildPayload => ({
    fragranceId: fragrance!.id,
    bottleId: bottle!.id,
    pheromoneIds: selectedPheromoneIds,
    labelText: labelText || undefined,
    giftWrap,
  });

  const buildTitle = `Fragancia: ${fragrance!.contratipo}`;

  const onAdd = async () => {
    setAdding(true);
    setError(null);
    const result = await addBuildToCart();
    if (!result.ok) setError(result.error);
    setAdding(false);
  };

  const onSaveLike = async () => {
    setSavingLike(true);
    setLikeMsg(null);
    const result = await saveBuildLike(buildPayload(), buildTitle);
    setSavingLike(false);
    if (!result.ok) {
      if (result.needAuth) {
        router.push(
          `/cuenta/login?returnTo=${encodeURIComponent(pathname || "/crear")}`
        );
        return;
      }
      setLikeMsg(result.error);
      return;
    }
    setLikeMsg("Creación guardada en Me gusta.");
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-10">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl text-bone mb-2">Personaliza tu fragancia</h2>
        <p className="text-sm text-bone-60 mb-8">Los últimos detalles antes de agregarla al carrito.</p>

        <label className="block text-xs uppercase tracking-widest text-gold-400 mb-2">
          Texto para la etiqueta (opcional)
        </label>
        <input
          type="text"
          maxLength={40}
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          placeholder='Ej: "Para Ana ♥"'
          className="w-full bg-white/5 border border-gold-400/30 rounded-sm px-4 py-3 text-sm text-bone placeholder:text-bone-60 mb-6 focus:outline-none focus:ring-2 focus:ring-gold-400"
        />

        <p className="block text-xs uppercase tracking-widest text-gold-400 mb-3">Feromonas (opcional)</p>
        <div className="space-y-2 mb-8">
          {PHEROMONES.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedPheromoneIds.includes(p.id)}
                  onChange={() => togglePheromone(p.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-bone">{p.title}</span>
              </span>
              <span className="text-xs text-bone-60">+{formatCOP(p.price)}</span>
            </label>
          ))}
        </div>

        <label className="flex items-center gap-3 mb-10 cursor-pointer">
          <input type="checkbox" checked={giftWrap} onChange={toggleGiftWrap} className="w-4 h-4" />
          <span className="text-sm text-bone">Envolver para regalo (+{formatCOP(GIFT_WRAP_FEE)})</span>
        </label>

        <h3 className="font-display text-xl text-bone mb-4">Explora la tienda</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {SHOP_LINKS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group overflow-hidden rounded-sm border border-white/10 bg-white/5 transition-colors hover:border-gold-400/40"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${p.tone}`} />
                <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-sm border border-gold-400/40 bg-wine-950/70 text-gold-400">
                  {p.icon}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-bone">{p.label}</p>
                <p className="text-xs text-bone-60">{p.blurb}</p>
              </div>
            </Link>
          ))}
        </div>

        <button onClick={() => setStep(2)} className="text-sm text-bone-60 hover:text-gold-400 underline mt-8">
          ← Volver a envases
        </button>
      </div>

      <div className="bg-white/5 border border-gold-400/20 rounded-sm p-6 h-fit sticky top-8">
        <h4 className="font-display text-lg text-bone mb-4">Resumen</h4>
        <dl className="text-sm space-y-2 text-bone/80">
          <div className="flex justify-between gap-3">
            <dt>
              {fragrance.contratipo} · {bottle.capacityMl} ml
              <span className="block text-xs text-bone-60">{bottle.name}</span>
            </dt>
            <dd className="shrink-0">{formatCOP(coreTotal)}</dd>
          </div>
          {selectedPheromones.map((p) => (
            <div key={p.id} className="flex justify-between">
              <dt>{p.title}</dt>
              <dd>{formatCOP(p.price)}</dd>
            </div>
          ))}
          {giftWrap && (
            <div className="flex justify-between">
              <dt>Envoltura de regalo</dt>
              <dd>{formatCOP(GIFT_WRAP_FEE)}</dd>
            </div>
          )}
        </dl>
        <div className="flex justify-between pt-4 mt-4 border-t border-gold-400/30">
          <span className="font-display text-lg text-gold-400">Total</span>
          <span className="font-display text-lg text-gold-400">{formatCOP(currentBuildTotal())}</span>
        </div>
        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        {likeMsg && <p className="mt-3 text-xs text-gold-400">{likeMsg}</p>}
        <div className="mt-6 space-y-2">
          <AddToListButton
            target={{
              type: "build",
              build: buildPayload(),
              title: buildTitle,
            }}
            label="Añadir creación a lista"
          />
          <button
            type="button"
            onClick={() => void onSaveLike()}
            disabled={savingLike}
            className="w-full border border-gold-400/40 hover:border-gold-400 disabled:opacity-40 text-gold-400 text-xs font-semibold uppercase tracking-widest rounded-sm py-3 transition-colors"
          >
            {savingLike ? "Guardando…" : "Guardar creación en Me gusta"}
          </button>
          <button
            onClick={onAdd}
            disabled={adding}
            className="w-full bg-gold-400 hover:bg-gold-100 disabled:opacity-40 text-wine-950 text-sm font-semibold uppercase tracking-widest rounded-sm py-3 transition-colors"
          >
            {adding ? "Validando…" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
