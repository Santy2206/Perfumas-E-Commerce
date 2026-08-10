"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { useFavoritesStore } from "../../store/useFavoritesStore";

export function LikeButton({
  productId,
  productKind,
  title,
  handle,
  className,
}: {
  productId: string;
  productKind?: string;
  title?: string;
  handle?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Subscribe to likes array directly so UI updates after Quitar / unlike elsewhere
  const liked = useFavoritesStore((s) =>
    s.likes.some((i) => i.kind === "sku" && i.productId === productId)
  );
  const toggleSkuLike = useFavoritesStore((s) => s.toggleSkuLike);
  const [busy, setBusy] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const result = await toggleSkuLike({ productId, productKind, title, handle });
    setBusy(false);
    if (!result.ok && result.needAuth) {
      router.push(
        `/cuenta/login?returnTo=${encodeURIComponent(pathname || "/")}`
      );
    }
  };

  return (
    <button
      type="button"
      aria-label={liked ? "Quitar de me gusta" : "Me gusta"}
      aria-pressed={liked}
      disabled={busy}
      onClick={(e) => void onClick(e)}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 text-bone backdrop-blur-sm transition-colors hover:border-gold-400 hover:text-gold-400 disabled:opacity-50",
        liked && "border-gold-400 text-gold-400",
        className
      )}
    >
      <Heart
        className={cn("h-4 w-4", liked && "fill-gold-400")}
        strokeWidth={1.75}
      />
    </button>
  );
}
