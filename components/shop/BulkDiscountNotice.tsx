import { BULK_DISCOUNT_TIERS } from "../../lib/bulk-discount";
import { cn } from "../../lib/utils";

/**
 * Compact one-line banner explaining the bulk-gram discount tiers for
 * essences. Mirrors FreeShippingNotice's visual style.
 */
export function BulkDiscountNotice({ className }: { className?: string }) {
  const tiers = [...BULK_DISCOUNT_TIERS].sort((a, b) => a.minGrams - b.minGrams);

  return (
    <aside
      role="note"
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-[11px] leading-snug sm:text-xs",
        className,
      )}
    >
      <span className="shrink-0 font-semibold uppercase tracking-widest text-gold-400">
        Descuento por cantidad
      </span>
      <span className="text-ink-60">
        {tiers.map((t, i) => (
          <span key={t.minGrams}>
            {i > 0 ? " · " : ""}
            Desde {t.minGrams} g:{" "}
            <strong className="text-ink">{Math.round(t.pct * 100)}% dcto.</strong>
          </span>
        ))}{" "}
        — se aplica solo al elegir el gramaje.
      </span>
    </aside>
  );
}
