"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Modal sobre o Radix. O modal anterior era feito à mão e tinha três problemas
 * reais: sem armadilha de foco (tab escapava pro conteúdo atrás), sem devolver
 * o foco ao fechar, e — o pior — no celular o painel passava da altura da tela
 * e o próprio backdrop interceptava o clique no botão de enviar, deixando o
 * "Criar funil" inalcançável num telefone.
 *
 * O `overflow-y-auto` no overlay somado a `min-h-full items-center` no wrapper
 * é o que corrige isso: painel curto fica centralizado, painel alto rola.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      {/* Overlay e Content são IRMÃOS: aninhar o Content dentro do Overlay faz
          o overlay disputar os pointer-events do próprio conteúdo. */}
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          // O painel rola por dentro em vez de estourar a tela — no celular era
          // isso que deixava o botão de enviar fora de alcance.
          "max-h-[calc(100dvh-2rem)] overflow-y-auto",
          "rounded-2xl border border-app-border bg-app-surface p-5 shadow-app-lg focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Fechar"
          className="absolute top-4 right-4 rounded-lg p-1 text-app-muted transition-colors hover:bg-app-surface-2 hover:text-app-text"
        >
          <X size={18} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/**
 * Título e descrição são componentes do Radix de propósito: é o que gera o
 * `aria-labelledby`/`aria-describedby` do diálogo automaticamente. O Radix
 * avisa no console se o título faltar.
 */
export function DialogHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-4 pr-8">
      <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
      {description && (
        <DialogPrimitive.Description className="mt-0.5 text-sm text-app-muted">
          {description}
        </DialogPrimitive.Description>
      )}
    </div>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex items-center justify-end gap-2">{children}</div>;
}
