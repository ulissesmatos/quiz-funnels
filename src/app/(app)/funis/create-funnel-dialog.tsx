"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
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
 *
 * Chamada manual (não `<form action>`) porque a action agora pode recusar a
 * criação — limite de funis do plano — e precisa de um jeito de mostrar esse
 * erro sem sair da tela. No sucesso ela redireciona sozinha; só a falha volta
 * pra cá.
 */
export function CreateFunnelDialog({ action }: { action: typeof createFunnelAction }) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const formData = new FormData(event.currentTarget);

    // O pedido de IA não é lido por `createFunnelAction` — some da tela no
    // redirect. Guardado aqui, antes do submit seguir, o editor lê e limpa
    // assim que monta.
    const pedidoDeIa = String(formData.get("ia") ?? "").trim();
    if (pedidoDeIa) window.sessionStorage.setItem(AI_KICKOFF_STORAGE_KEY, pedidoDeIa);

    startTransition(async () => {
      const result = await action(formData);
      // No sucesso a action redireciona por dentro e nunca chega a devolver
      // nada — só a falha (limite de funis do plano) retorna aqui.
      if (result && !result.ok) setErro(result.error);
    });
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

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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

          {erro && <Alert tone="danger">{erro}</Alert>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending}>
              {!pending && <Sparkles size={15} />}
              Criar funil
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
