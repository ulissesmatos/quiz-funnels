import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Linha de lista com título, subtítulo e ações à direita. `MembroRow`,
 * `CupomRow` e `WebhookRow` eram clones de ~40 linhas um do outro; o que muda
 * de verdade entre eles é só o conteúdo das três regiões.
 *
 * Composto em vez de dirigido por props porque o subtítulo varia bastante
 * (texto simples, chip de código, data) e um `subtitle?: string` obrigaria
 * metade dos casos a burlar a API.
 */
export function ListRow({
  pending = false,
  className,
  children,
  ...props
}: ComponentProps<"li"> & { pending?: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-app-border bg-app-surface px-3 py-2.5",
        pending && "opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </li>
  );
}

export function ListRowMain({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-app-text">{title}</p>
      {children && <div className="mt-0.5 text-xs text-app-muted">{children}</div>}
    </div>
  );
}

export function ListRowActions({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-center gap-1.5">{children}</div>;
}
