"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AI_KICKOFF_STORAGE_KEY } from "@/editor/ai-kickoff";
import type { createFunnelAction } from "@/server/funnels/actions";

/**
 * Cria o funil por um modal, não mais por um input colado no botão — cabe um
 * segundo campo (o pedido pra IA) sem apertar o cabeçalho da lista.
 */
export function CreateFunnelDialog({ action }: { action: typeof createFunnelAction }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAberto(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aberto]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // O pedido de IA não é lido por `createFunnelAction` — some da tela no
    // redirect. Guardado aqui, antes do submit seguir, o editor lê e limpa
    // assim que monta.
    const pedidoDeIa = String(new FormData(event.currentTarget).get("ia") ?? "").trim();
    if (pedidoDeIa) window.sessionStorage.setItem(AI_KICKOFF_STORAGE_KEY, pedidoDeIa);
    // Sem `preventDefault`: o form continua pra `action`, que redireciona.
  }

  return (
    <>
      <Button type="button" onClick={() => setAberto(true)}>
        <Plus size={16} />
        Criar funil
      </Button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="criar-funil-titulo"
            className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="criar-funil-titulo" className="text-lg font-semibold">
                  Criar funil
                </h2>
                <p className="mt-0.5 text-sm text-app-muted">
                  Dê um nome e, se quiser, já peça pro copiloto montar.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                className="rounded-lg p-1 text-app-muted hover:bg-app-surface-2 hover:text-app-text"
                onClick={() => setAberto(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form action={action} onSubmit={onSubmit} className="flex flex-col gap-4">
              <Field label="Nome do funil">
                <Input name="name" placeholder="ex.: Quiz de emagrecimento" autoFocus required />
              </Field>

              <Field
                label="Peça para a IA montar (opcional)"
                hint="Preenchido, o editor abre e o copiloto já começa a montar sozinho."
              >
                <textarea
                  name="ia"
                  rows={3}
                  placeholder="ex.: Quiz de 6 perguntas sobre qualidade do sono, com plano personalizado no fim"
                  className="w-full resize-none rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-muted focus:border-app-primary focus:outline-none"
                />
              </Field>

              <div className="mt-1 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <BotaoCriar />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function BotaoCriar() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        "Criando..."
      ) : (
        <>
          <Sparkles size={15} />
          Criar funil
        </>
      )}
    </Button>
  );
}
