import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Texto com brilho percorrendo — o indicador de "a IA está pensando", entre o
 * envio e o primeiro token. Antes desse intervalo só existia um spinner de
 * 13px no cabeçalho, e nada dizia o que estava acontecendo.
 *
 * CSS puro (gradiente + `background-clip: text`), sem biblioteca de animação:
 * é uma propriedade só animando, roda na GPU e não custa JavaScript num painel
 * que já está ocupado processando stream.
 *
 * Respeita `prefers-reduced-motion` — texto pulsando é exatamente o tipo de
 * movimento que incomoda quem pede menos animação; sem ele o texto fica
 * legível e parado.
 */
export function ShimmerText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "animate-shimmer bg-[length:200%_100%] bg-clip-text text-transparent",
        "bg-[linear-gradient(90deg,var(--color-app-muted)_0%,var(--color-app-muted)_40%,var(--color-app-text)_50%,var(--color-app-muted)_60%,var(--color-app-muted)_100%)]",
        "motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-app-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
