import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Pill de status. Havia três definições independentes de `StatusBadge`
 * (funis, leads, admin) mais meia dúzia de pills soltas, todas com a mesma
 * forma e tons ligeiramente diferentes.
 *
 * `badgeStyles` é exportado porque alguns desses status são clicáveis
 * (ligar/desligar cupom e webhook) — ali o elemento precisa ser `<button>`, não
 * um `<span>` com `onClick`.
 */
const badgeStyles = cva("inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-app-surface-2 text-app-muted",
      success: "bg-app-success/15 text-app-success",
      danger: "bg-app-danger/15 text-app-danger",
      warning: "bg-app-warning/15 text-app-warning",
      brand: "bg-app-primary/15 text-app-primary",
    },
    size: {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-xs",
    },
  },
  defaultVariants: { tone: "neutral", size: "sm" },
});

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeStyles>;

export function Badge({ tone, size, className, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone, size }), className)} {...props} />;
}

export { badgeStyles };
