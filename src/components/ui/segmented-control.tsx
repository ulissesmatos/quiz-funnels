import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Grupo de opções mutuamente exclusivas. Existiam três versões da mesma ideia
 * (o seletor de período, as abas do analytics e o modo de tema), com paddings e
 * tamanhos de fonte diferentes.
 *
 * Cada item pode ser link ou botão: o seletor de período guarda o estado na URL
 * (e por isso precisa navegar de verdade), enquanto o de tema é uma escolha
 * local. Um componente só, dois modos, mesma aparência.
 */
export type SegmentedItem<T extends string> = {
  value: T;
  label: ReactNode;
  href?: string;
  title?: string;
};

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  size = "sm",
  className,
}: {
  items: SegmentedItem<T>[];
  value: T;
  /** Obrigatório quando os itens não têm `href`. */
  onChange?: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const item = cn(
    "rounded-md transition-colors duration-150 ease-app",
    size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-sm",
  );

  return (
    <div className={cn("flex rounded-lg border border-app-border p-0.5", className)}>
      {items.map((opcao) => {
        const ativo = opcao.value === value;
        const classes = cn(
          item,
          ativo ? "bg-app-surface-2 text-app-text" : "text-app-muted hover:text-app-text",
        );

        if (opcao.href) {
          return (
            <Link
              key={opcao.value}
              href={opcao.href}
              title={opcao.title}
              aria-current={ativo ? "page" : undefined}
              className={classes}
            >
              {opcao.label}
            </Link>
          );
        }

        return (
          <button
            key={opcao.value}
            type="button"
            title={opcao.title}
            aria-pressed={ativo}
            onClick={() => onChange?.(opcao.value)}
            className={classes}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}
