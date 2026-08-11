import Link from "next/link";
import { DEPARTMENTS } from "../../lib/catalog";

const DEPT_VISUAL: Record<
  (typeof DEPARTMENTS)[number]["id"],
  { accent: string; motif: string; hint: string }
> = {
  perfumeria: {
    accent: "from-[#1a1a1a] via-[#121212] to-[#0a0a0a]",
    motif: "Eau",
    hint: "Réplicas · Personalizadas",
  },
  insumos: {
    accent: "from-[#1c1c1c] via-[#141414] to-[#0a0a0a]",
    motif: "Base",
    hint: "Esencias · Envases · Alcohol",
  },
  hogar: {
    accent: "from-[#181818] via-[#111111] to-[#0a0a0a]",
    motif: "Aura",
    hint: "Ambiente · Cuidado",
  },
  accesorios: {
    accent: "from-[#1f1f1f] via-[#151515] to-[#0a0a0a]",
    motif: "Toque",
    hint: "Complementos",
  },
};

export function ShopHub() {
  return (
    <div className="relative overflow-hidden">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(202,169,105,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(202,169,105,0.08),_transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23caa969' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-8 sm:pt-20">
        <p className="shop-fade-up font-display text-sm tracking-[0.35em] text-gold-400 uppercase">
          Perfumas
        </p>
        <h1 className="shop-fade-up shop-fade-up-delay-1 mt-3 font-display text-5xl leading-none text-bone sm:text-6xl md:text-7xl">
          Tienda
        </h1>
        <p className="shop-fade-up shop-fade-up-delay-2 mt-4 max-w-md text-sm leading-relaxed text-bone-60 sm:text-base">
          Elige un departamento y explora el catálogo en vivo.
        </p>
        <div className="shop-fade-up shop-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
          <Link
            href="/crear"
            className="inline-flex items-center rounded-sm bg-gold-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-wine-950 transition-colors hover:bg-gold-100"
          >
            Preparar mi fragancia
          </Link>
          <Link
            href="/tienda/perfumeria"
            className="inline-flex items-center rounded-sm border border-gold-400/40 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gold-400 transition-colors hover:bg-gold-400/10"
          >
            Ver preparadas
          </Link>
        </div>
      </section>

      {/* Departments */}
      <section className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {DEPARTMENTS.map((d, index) => {
            const visual = DEPT_VISUAL[d.id];
            return (
              <Link
                key={d.id}
                href={d.href}
                className="shop-fade-up group relative flex min-h-[220px] overflow-hidden rounded-sm border border-gold-400/20 bg-wine-900/40 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-gold-400/55 sm:min-h-[260px]"
                style={{ animationDelay: `${180 + index * 90}ms` }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${visual.accent} transition-opacity duration-500 group-hover:opacity-95`}
                />
                {/* Soft light sweep */}
                <div
                  aria-hidden
                  className="absolute -left-1/3 top-0 h-full w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-gold-400/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-2 bottom-0 select-none font-display text-[7.5rem] leading-none text-gold-400/[0.07] transition-transform duration-700 group-hover:scale-105 sm:text-[9rem]"
                >
                  {visual.motif}
                </div>

                <div className="relative z-10 flex w-full flex-col justify-between p-6 sm:p-8">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-gold-400/80">
                      {visual.hint}
                    </p>
                    <h2 className="mt-3 font-display text-3xl text-bone transition-colors duration-300 group-hover:text-gold-100 sm:text-4xl">
                      {d.label}
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-bone-60">
                      {d.description}
                    </p>
                  </div>
                  <span className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
                    Explorar
                    <span
                      aria-hidden
                      className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
