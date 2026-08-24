"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Dica contextual sobre Radix. Substitui `title=""` nativo (sem estilo, sem
 * controle de atraso) nos botões-ícone, e a versão só-CSS que só existia
 * dentro da sidebar recolhida.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-lg border border-app-border bg-app-surface-2 px-2 py-1 text-xs text-app-text shadow-app-md",
          "data-[state=delayed-open]:animate-rise",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
