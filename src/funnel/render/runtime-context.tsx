"use client";

import { createContext, useContext } from "react";

import type { BlockAction } from "../schema/common";
import type { AnswerValue, FunnelContext } from "../logic/context";

/**
 * O que um bloco interativo pode fazer. Passa por React context em vez de
 * props: o container aninha blocos, e prop drilling atravessaria dois níveis
 * sem necessidade.
 */
export type FunnelRuntime = {
  context: FunnelContext;
  setAnswer: (name: string, value: AnswerValue) => void;
  /**
   * Grava a resposta e avança na mesma ação. Existe separado do `setAnswer`
   * porque o `autoAdvance` precisa navegar já enxergando o valor recém-dado —
   * ler do state nesse instante devolveria a resposta anterior.
   */
  answerAndAdvance: (name: string, value: AnswerValue) => void;
  runAction: (action: BlockAction) => void;
  next: () => void;
  back: () => void;
  canGoBack: boolean;
  /** Quais campos obrigatórios estão pendentes, para bloquear o avanço. */
  errors: Record<string, string>;
  /**
   * `false` no preview do editor: os blocos renderizam idênticos, mas clicar
   * não navega nem grava resposta.
   */
  interactive: boolean;

  /**
   * Onde este render está acontecendo.
   *
   * Separado de `interactive` porque as duas coisas não são a mesma: um bloco
   * mal configurado deve mostrar "escolha uma imagem" no editor e **nada** no
   * funil publicado. Sem essa distinção, o visitante lê instruções de edição.
   */
  mode: "publico" | "editor";

  /**
   * Presente só no funil publicado (`TrackedFunnelView`), nunca no editor —
   * o bloco de Checkout depende disso pra saber a quem associar o pedido.
   * `sessionId` é função, não valor: a sessão nasce numa `useEffect` do lado
   * de fora, então lê-la só na hora de cobrar (não na hora de renderizar)
   * evita depender de um valor que ainda não existiu no primeiro render.
   */
  tracking?: { funnelId: string; sessionId: () => string };

  /** Public key da conta Mercado Pago conectada — ausente sem conexão feita. */
  mercadoPagoPublicKey?: string;

  /**
   * Id do último pedido criado nesta sessão — o bloco de Upsell 1-clique lê
   * isto pra saber em cima de qual compra cobrar. Baseado em ref (não state):
   * guardar aqui nunca deve causar novo render, só registrar um fato pra uma
   * tela futura consultar.
   */
  lastOrderId?: { get: () => string | null; set: (id: string) => void };
};

const RuntimeContext = createContext<FunnelRuntime | null>(null);

export const FunnelRuntimeProvider = RuntimeContext.Provider;

export function useFunnelRuntime(): FunnelRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) {
    throw new Error("Bloco de funil renderizado fora do FunnelRuntimeProvider");
  }
  return runtime;
}
