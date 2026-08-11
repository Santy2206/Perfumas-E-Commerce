import * as React from "react";
import { cn } from "../../lib/utils";

type SectionTone = "dark" | "light" | "light-soft";

const toneClasses: Record<SectionTone, string> = {
  dark: "bg-wine-950 text-bone",
  light: "bg-paper text-ink",
  "light-soft": "bg-paper-soft text-ink",
};

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: SectionTone;
  as?: "section" | "div";
}

/**
 * Full-bleed band with dark (brand) or light (commerce) surface.
 * Children inherit text color; use text-ink-60 / text-bone-60 for muted copy.
 */
export function Section({
  tone = "dark",
  as: Tag = "section",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <Tag className={cn(toneClasses[tone], className)} {...props}>
      {children}
    </Tag>
  );
}
