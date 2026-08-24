"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/** Superfície flutuante sobre Radix — color picker do editor, filtros de leads. */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  className,
  sideOffset = 8,
  align = "start",
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 rounded-xl border border-app-border bg-app-surface p-3 shadow-app-md focus:outline-none",
          "data-[state=open]:animate-rise",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
