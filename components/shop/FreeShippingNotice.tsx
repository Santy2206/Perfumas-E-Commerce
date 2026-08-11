import {
  FREE_SHIPPING_BOGOTA_MIN,
  FREE_SHIPPING_NACIONAL_MIN,
} from "../../lib/shipping/pricing";
import { cn, formatCOP } from "../../lib/utils";

type FreeShippingNoticeVariant =
  | "eligible"
  | "companion"
  | "insumos"
  | "general";

/**
 * Compact one-line banner for free-shipping rules.
 */
export function FreeShippingNotice({
  variant,
  className,
  tone = "light",
}: {
  variant: FreeShippingNoticeVariant;
  className?: string;
  tone?: "light" | "dark";
}) {
  const bogota = formatCOP(FREE_SHIPPING_BOGOTA_MIN);
  const nacional = formatCOP(FREE_SHIPPING_NACIONAL_MIN);
  const textClass = tone === "dark" ? "text-bone-60" : "text-ink-60";

  const body =
    variant === "insumos"
      ? `Gratis en Bogotá desde ${bogota} y nacional desde ${nacional} si el valor en perfumería es mayor que el de insumos.`
      : variant === "companion"
        ? `Gratis en Bogotá desde ${bogota} y nacional desde ${nacional} cuando el pedido incluye perfumería (Preparar o Preparadas).`
        : `Gratis en Bogotá si compras más de ${bogota} y nacional si compras más de ${nacional}, en perfumería (Preparar o Preparadas).`;

  return (
    <aside
      role="note"
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-[11px] leading-snug sm:text-xs",
        className
      )}
    >
      <span className="shrink-0 font-semibold uppercase tracking-widest text-gold-400">
        Envío gratis
      </span>
      <span className={textClass}>{body}</span>
    </aside>
  );
}
