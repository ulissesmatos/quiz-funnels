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
const badgeStyles = cva("inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-app-surface-2 text-app-muted",
      success: "bg-app-success/15 text-app-success",
      danger: "bg-app-danger/15 text-app-danger",
      warning: "bg-app-warning/15 text-app-warning",
      brand: "bg-app-primary/15 text-app-primary",
      /** Assinatura do copiloto de IA — reservado a esse contexto e a tags "Novo". */
      ai: "bg-app-accent/15 text-app-accent",
    },
    size: {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-xs",
    },
  },
  defaultVariants: { tone: "neutral", size: "sm" },
});

const DOT_COLOR: Record<NonNullable<VariantProps<typeof badgeStyles>["tone"]>, string> = {
  neutral: "bg-app-muted",
  success: "bg-app-success",
  danger: "bg-app-danger",
  warning: "bg-app-warning",
  brand: "bg-app-primary",
  ai: "bg-app-accent",
};

export type BadgeProps = ComponentProps<"span"> &
  VariantProps<typeof badgeStyles> & {
    /** Ponto colorido antes do texto — o indicador de "publicado/rascunho" etc. */
    dot?: boolean;
  };

export function Badge({ tone = "neutral", size, dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeStyles({ tone, size }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLOR[tone ?? "neutral"])} />}
      {children}
    </span>
  );
}

export { badgeStyles };
