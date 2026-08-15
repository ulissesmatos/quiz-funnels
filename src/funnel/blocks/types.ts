import type { z } from "zod";

export const blockCategories = {
  conteudo: "Conteúdo",
  midia: "Mídia",
  entrada: "Entrada",
  acao: "Ação",
  layout: "Layout",
} as const;

export type BlockCategory = keyof typeof blockCategories;

/**
 * Descrição pura (sem React) de um tipo de bloco.
 *
 * É a partir daqui que saem, ao mesmo tempo:
 *   • o schema de validação do documento,
 *   • os itens da paleta do editor,
 *   • o JSON Schema entregue às tools da IA.
 *
 * Registrar um bloco novo é criar um arquivo em `definitions/` e adicioná-lo ao
 * índice — o editor e a IA passam a conhecê-lo sem nenhuma outra mudança.
 */
export interface BlockDefinition<
  TType extends string = string,
  TProps extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  type: TType;
  /** Nome exibido na paleta do editor. */
  label: string;
  category: BlockCategory;
  /** Nome do ícone em `lucide-react` (ex.: "Heading1"). */
  icon: string;
  /**
   * Explicação em linguagem natural de para que serve o bloco e quando usá-lo.
   * Vai direto para o prompt do copiloto — escreva pensando no modelo lendo.
   */
  description: string;
  /** Exemplo de `props` válido, também injetado no contexto da IA. */
  example: z.infer<TProps>;
  props: TProps;
  /** Valores usados ao inserir o bloco pelo editor. */
  defaults: z.infer<TProps>;
  /**
   * Quando true, o bloco grava uma resposta em `props.name`, participa da
   * pontuação e pode ser referenciado por condições (`source: "answer"`).
   */
  isInput?: boolean;
}

/** Helper que preserva os tipos literais ao declarar uma definição. */
export function defineBlock<
  TType extends string,
  TProps extends z.ZodObject<z.ZodRawShape>,
>(def: BlockDefinition<TType, TProps>): BlockDefinition<TType, TProps> {
  return def;
}

/**
 * Supertipo estrutural de qualquer definição, para quando o código precisa
 * tratar blocos de forma genérica (paleta do editor, geração do JSON Schema
 * das tools da IA). `BlockDefinition` é invariante nas props por causa de
 * `defaults`/`example`, então uma união de definições concretas não é
 * atribuível a ela — este tipo frouxo resolve isso sem espalhar `any`.
 */
export type AnyBlockDefinition = {
  readonly type: string;
  readonly label: string;
  readonly category: BlockCategory;
  readonly icon: string;
  readonly description: string;
  readonly example: unknown;
  readonly props: z.ZodType;
  readonly defaults: unknown;
  readonly isInput?: boolean;
};
