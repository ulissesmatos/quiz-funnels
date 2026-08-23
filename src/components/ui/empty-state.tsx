import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Estado vazio. Já existia um em `analytics/empty-state.tsx`, mas sem prop
 * nenhuma — texto fixo — e por isso as outras quatro telas preferiram copiar as
 * classes a reusá-lo. Este aceita conteúdo.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-app-border px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-app-surface-2 text-app-muted">
          {icon}
        </div>
      )}
      <p className="font-medium text-app-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-app-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
