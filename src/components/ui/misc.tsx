import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Trecho de código inline (slug, header de webhook, registro DNS). */
export function CodeChip({ className, ...props }: ComponentProps<"code">) {
  return (
    <code
      className={cn("rounded bg-app-surface-2 px-1.5 py-0.5 font-mono text-xs text-app-text", className)}
      {...props}
    />
  );
}

export function Separator({ className, ...props }: ComponentProps<"div">) {
  return <div role="separator" className={cn("border-t border-app-border", className)} {...props} />;
}

/**
 * Placeholder de carregamento. O app não tinha nenhum: telas com dado assíncrono
 * mostravam um spinner solto ou nada, o que faz o layout pular quando o
 * conteúdo chega.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-lg bg-app-surface-2", className)} {...props} />;
}

/**
 * Avatar do usuário: imagem quando existe, senão a inicial do nome. Estava
 * privado dentro de `account-menu.tsx` e vai ser preciso também na lista de
 * equipe e no painel admin.
 */
export function Avatar({
  name,
  image,
  size = 32,
  className,
}: {
  name: string;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const dimensao = { width: size, height: size };

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        style={dimensao}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={dimensao}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-app-primary font-semibold text-white",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Rótulo de seção dentro de uma página — o `<h2>` pequeno e apagado que se repete. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("mb-3 text-sm font-medium text-app-muted", className)}>{children}</h2>;
}
