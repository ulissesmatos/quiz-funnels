"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import { aplicarChamadaDaIa } from "@/funnel/ai/apply";
import type { AiToolName } from "@/funnel/ai/tools";
import { saveFunnelDocumentAction } from "@/server/funnels/actions";

import { useEditor, useEditorStore } from "../editor-context";

/**
 * Roda o botão "Personalizar com IA" de um card do fluxo sem chat.
 *
 * É um `useChat` próprio, isolado do copiloto visível: o pedido nunca aparece
 * como mensagem em tela, ninguém precisa responder nada, e o único sinal é o
 * spinner no card enquanto `stepAtivo` aponta para ele. Isso só funciona
 * porque o pedido já sai com contexto suficiente (o funil inteiro vai no
 * prompt do sistema) e `silent: true` desliga a ferramenta `ask_user` no
 * servidor — o modelo não tem como parar esperando resposta.
 */
export function usePersonalizeWithAi() {
  const store = useEditorStore();
  const funnelId = useEditor((s) => s.funnelId);

  const [stepAtivo, setStepAtivo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const aplicadas = useRef(new Set<string>());
  /**
   * Trava síncrona contra duplo clique.
   *
   * `ocupado` (abaixo) só vira `true` depois que `sendMessage` é chamado — e
   * antes disso há um `await saveFunnelDocumentAction(...)`. Nessa janela,
   * `ocupado` ainda está `false`, e como todos os cards do canvas dividem este
   * mesmo `useChat`, clicar em dois cards diferentes nessa janela dispara duas
   * requisições sobrepostas na mesma conversa. Esta ref fecha a janela.
   */
  const emAndamento = useRef(false);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat", body: { funnelId, silent: true } }),
  });

  const ocupado = status === "submitted" || status === "streaming";

  // Aplica cada ferramenta assim que chega, igual ao copiloto visível — e ao
  // terminar, limpa a conversa: cada clique é um pedido novo e isolado, sem
  // acumular histórico que só inflaria as próximas chamadas.
  useEffect(() => {
    if (!stepAtivo) return;

    const estado = store.getState();
    const tocados: string[] = [];

    for (const message of messages as { id: string; role: string; parts: { type: string }[] }[]) {
      if (message.role !== "assistant") continue;

      for (const part of message.parts) {
        if (!part.type.startsWith("tool-")) continue;

        const chamada = part as unknown as {
          toolCallId: string;
          state: string;
          input?: Record<string, unknown>;
        };

        if (chamada.state === "input-streaming" || !chamada.input) continue;
        if (aplicadas.current.has(chamada.toolCallId)) continue;
        aplicadas.current.add(chamada.toolCallId);

        const nome = part.type.slice("tool-".length) as AiToolName;
        const resultado = aplicarChamadaDaIa(store.getState().doc, nome, chamada.input);
        if (!resultado.ok) continue;

        store.getState().replaceDocument(resultado.doc, {
          label: "Personalizar com IA",
          mergeKey: `ai-personalizar:${message.id}`,
          mergeWindowMs: Infinity,
        });
        tocados.push(...resultado.blocosTocados);
      }
    }

    if (tocados.length > 0) estado.highlightBlocks(tocados);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o status do stream (sistema externo), não com outro estado local
    if (status === "error") setErro("A IA não conseguiu personalizar essa tela.");

    if (!ocupado) {
      setStepAtivo(null);
      setMessages([]);
      aplicadas.current.clear();
      emAndamento.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `store`/`setMessages` são estáveis; só `messages`/`status` mudam de verdade
  }, [messages, status]);

  const personalizar = useCallback(
    (stepId: string) => {
      if (emAndamento.current) return;
      emAndamento.current = true;

      const doc = store.getState().doc;
      const step = doc.steps.find((s) => s.id === stepId);
      if (!step) {
        emAndamento.current = false; // sendMessage nunca chegou a rodar
        return;
      }

      setErro(null);
      setStepAtivo(stepId);
      aplicadas.current.clear();

      void (async () => {
        // O servidor lê o funil do banco — sem salvar antes, ele trabalharia
        // sobre uma versão anterior à que está na tela.
        const salvo = await saveFunnelDocumentAction(funnelId, doc);
        if (!salvo.ok) {
          setErro(salvo.error);
          setStepAtivo(null);
          emAndamento.current = false; // sendMessage nunca chegou a rodar
          return;
        }
        store.getState().setSaveStatus("salvo");

        sendMessage({
          text: `Personalize a tela "${step.name}" (id: ${step.id}) usando uma resposta dada em uma tela anterior deste funil.

Escolha você mesmo o critério mais relevante entre as perguntas já respondidas antes dela — não pergunte nada, decida e aja direto. Prefira ramificar com \`branch_by_answer\` (criando as telas de destino com \`add_step\` antes) quando o conteúdo muda de verdade depois dessa tela, ou use \`set_step_logic\` / \`set_block_visibility\` quando fizer mais sentido personalizar sem duplicar tela. Ao terminar, garanta que o funil continue navegável.`,
        });
        // Não libera aqui: o pedido segue em voo. O efeito acima libera
        // quando `ocupado` volta a `false` de verdade.
      })();
    },
    [store, funnelId, sendMessage],
  );

  return { personalizar, stepAtivo, erro, iaOcupada: ocupado };
}
