"use client";

import { ChevronDown } from "lucide-react";
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
 * `<select>` nativo com o visual da casa. Havia 8 espalhados pelo app com as
 * classes coladas à mão e três alturas diferentes; o nativo continua sendo a
 * escolha certa aqui — no celular ele abre o seletor do sistema, que é melhor
 * do que qualquer lista custom.
 *
 * `appearance-none` + seta desenhada porque a seta padrão do Chrome ignora
 * `color` e some no tema escuro.
 */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-app-border bg-app-surface pr-9 pl-3 text-sm text-app-text",
          "focus:border-app-primary focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-app-muted"
      />
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text",
        "placeholder:text-app-muted focus:border-app-primary focus:outline-none",
        className,
      )}
      {...props}
    />
  );
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
