import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Largura e respiro das páginas do painel. Onze páginas repetiam
 * `mx-auto w-full max-w-*xl px-4 py-8 md:px-8` à mão, e o `max-w` já tinha
 * divergido entre elas sem motivo — aqui a escolha vira explícita.
 */
const WIDTH = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
} as const;

export function PageShell({
  width = "lg",
  className,
  children,
}: {
  width?: keyof typeof WIDTH;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 py-8 md:px-8", WIDTH[width], className)}>{children}</div>
  );
}

/** Título da página + descrição, com a ação (botão, filtro) alinhada à direita. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-app-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
