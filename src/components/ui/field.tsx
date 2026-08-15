"use client";

import { cloneElement, isValidElement, useId, type ComponentProps, type ReactElement } from "react";

import { cn } from "@/lib/cn";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text",
        "placeholder:text-app-muted focus:border-app-primary focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-app-text", className)} {...props} />;
}

/**
 * Rótulo + controle, com a associação `label`/`id` feita automaticamente.
 * Sem isso o campo fica sem nome acessível: leitores de tela não anunciam o
 * rótulo, e clicar no texto não foca o campo.
 */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}) {
  const id = useId();
  const descricaoId = `${id}-descricao`;
  const temDescricao = Boolean(error || hint);

  const controle = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        "aria-describedby": temDescricao ? descricaoId : undefined,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {controle}
      {error ? (
        <p id={descricaoId} className="text-xs text-app-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={descricaoId} className="text-xs text-app-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
