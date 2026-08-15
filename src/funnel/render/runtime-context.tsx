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
