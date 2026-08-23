"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { AI_KICKOFF_STORAGE_KEY } from "@/editor/ai-kickoff";
import type { createFunnelAction } from "@/server/funnels/actions";

/**
 * Cria o funil por um modal, não mais por um input colado no botão — cabe um
 * segundo campo (o pedido pra IA) sem apertar o cabeçalho da lista.
 */
export function CreateFunnelDialog({ action }: { action: typeof createFunnelAction }) {
  const [aberto, setAberto] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // O pedido de IA não é lido por `createFunnelAction` — some da tela no
    // redirect. Guardado aqui, antes do submit seguir, o editor lê e limpa
    // assim que monta.
    const pedidoDeIa = String(new FormData(event.currentTarget).get("ia") ?? "").trim();
    if (pedidoDeIa) window.sessionStorage.setItem(AI_KICKOFF_STORAGE_KEY, pedidoDeIa);
    // Sem `preventDefault`: o form continua pra `action`, que redireciona.
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus size={16} />
          Criar funil
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader
          title="Criar funil"
          description="Dê um nome e, se quiser, já peça pro copiloto montar."
        />

        <form action={action} onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nome do funil">
            <Input name="name" placeholder="ex.: Quiz de emagrecimento" autoFocus required />
          </Field>

          <Field
            label="Peça para a IA montar (opcional)"
            hint="Preenchido, o editor abre e o copiloto já começa a montar sozinho."
          >
            <Textarea
              name="ia"
              rows={3}
              placeholder="ex.: Quiz de 6 perguntas sobre qualidade do sono, com plano personalizado no fim"
            />
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <BotaoCriar />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BotaoCriar() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending}>
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
