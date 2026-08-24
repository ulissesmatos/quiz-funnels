"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Abas sobre o Radix. As anteriores eram `<button>`s soltos: sem
 * `role="tablist"`, sem `aria-selected` e sem navegação por seta — quem usa
 * teclado tinha que tabular por cada aba, e leitor de tela não anunciava que
 * aquilo era um grupo de abas.
 */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex flex-wrap gap-1 rounded-lg border border-app-border p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-sm text-app-muted transition-colors duration-150 ease-app hover:text-app-text",
        "data-[state=active]:bg-app-surface-2 data-[state=active]:text-app-text",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("focus:outline-none", className)} {...props} />;
}
