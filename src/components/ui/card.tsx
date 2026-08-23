import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Superfície padrão do shell. Substitui as ~23 repetições de
 * `rounded-2xl border border-app-border bg-app-surface p-*` espalhadas pelas
 * páginas — a razão de cada uma ter divergido um pouco da outra.
 *
 * Server-safe de propósito: todo `page.tsx` de `(app)` é server component e não
 * deveria precisar cruzar a fronteira de cliente só pra desenhar uma caixa.
 */
const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

export function Card({
  padding = "md",
  interactive = false,
  className,
  ...props
}: ComponentProps<"div"> & {
  padding?: keyof typeof PADDING;
  /** Realce de borda no hover — só para cards que são link ou botão. */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-app-border bg-app-surface",
        PADDING[padding],
        interactive && "transition-colors hover:border-app-primary/50",
        className,
      )}
      {...props}
    />
  );
}

/** Título + descrição + ação opcional à direita, com o espaçamento já resolvido. */
export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="font-medium text-app-text">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-app-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
