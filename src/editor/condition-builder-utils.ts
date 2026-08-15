import type { Condition, ConditionLeaf } from "@/funnel/schema/common";

import type { CampoDisponivel } from "./condition-fields";

/**
 * Uma condição achatada para edição visual: um nível de E/OU sobre folhas.
 *
 * Mesmo formato que a IA já usa (`AiCondition` em `src/funnel/ai/tools.ts`) —
 * edição manual e edição por IA produzem árvores estruturalmente idênticas.
 */
export type ConditionRow = {
  source: "answer" | "score" | "variable";
  key?: string;
  op: ConditionLeaf["op"];
  value?: string | number | boolean;
};

export type ConditionBuilderValue = {
  match: "all" | "any";
  rows: ConditionRow[];
};

export type ConditionParaBuilder = {
  value: ConditionBuilderValue;
  /**
   * Presente quando `condition` usa uma forma que o editor visual não
   * representa (um `not`, ou um grupo com condições aninhadas). Carrega a
   * condição original para exibição em modo leitura — nunca é descartada
   * silenciosamente.
   */
  irrepresentavel: Condition | null;
};

/**
 * Converte a condição real para o estado do editor.
 *
 * `campoPadrao` preenche uma linha inicial quando não há condição ainda (regra
 * nova, bloco ainda sempre visível) — sem ele, o editor ficaria com zero
 * linhas, um estado que `ConditionBuilder` não sabe desenhar.
 */
export function condicaoParaBuilder(
  condition: Condition | undefined,
  campoPadrao?: CampoDisponivel,
): ConditionParaBuilder {
  if (!condition) {
    return {
      value: { match: "all", rows: campoPadrao ? [linhaPadrao(campoPadrao)] : [] },
      irrepresentavel: null,
    };
  }

  if (condition.kind === "leaf") {
    if (!folhaRepresentavel(condition)) {
      return { value: { match: "all", rows: [] }, irrepresentavel: condition };
    }
    return { value: { match: "all", rows: [folhaParaLinha(condition)] }, irrepresentavel: null };
  }

  if (condition.kind === "all" || condition.kind === "any") {
    const folhas = condition.conditions;
    const todasFolhasSimples = folhas.every(
      (c): c is ConditionLeaf => c.kind === "leaf" && folhaRepresentavel(c),
    );

    if (todasFolhasSimples) {
      return {
        value: { match: condition.kind, rows: folhas.map((f) => folhaParaLinha(f as ConditionLeaf)) },
        irrepresentavel: null,
      };
    }
  }

  // `not`, ou grupo com aninhamento/valor em lista: melhor esforço é achar a
  // primeira folha simples lá dentro, só para dar um ponto de partida caso a
  // pessoa decida substituir.
  const primeiraFolha = encontrarPrimeiraFolhaSimples(condition);
  return {
    value: { match: "all", rows: primeiraFolha ? [folhaParaLinha(primeiraFolha)] : [] },
    irrepresentavel: condition,
  };
}

/** Estado do editor → condição real. Uma linha só vira folha solta. */
export function builderParaCondicao(value: ConditionBuilderValue): Condition {
  const folhas = value.rows.map(linhaParaFolha);
  if (folhas.length <= 1) return folhas[0] ?? linhaParaFolha(linhaVazia());
  return { kind: value.match, conditions: folhas };
}

export function linhaPadrao(campo: CampoDisponivel): ConditionRow {
  return { source: campo.source, key: campo.key, op: "eq", value: undefined };
}

function linhaVazia(): ConditionRow {
  return { source: "score", op: "is_set" };
}

function folhaRepresentavel(leaf: ConditionLeaf): boolean {
  // Valor em lista (`eq` combinando várias opções, por exemplo) não tem
  // controle equivalente no editor visual — melhor marcar como irrepresentável
  // do que descartar as opções extras silenciosamente.
  return !Array.isArray(leaf.value);
}

function folhaParaLinha(leaf: ConditionLeaf): ConditionRow {
  return {
    source: leaf.ref.source as ConditionRow["source"],
    key: leaf.ref.key,
    op: leaf.op,
    value: leaf.value as ConditionRow["value"],
  };
}

function linhaParaFolha(row: ConditionRow): ConditionLeaf {
  const precisaDeValor = row.op !== "is_set" && row.op !== "is_empty";
  return {
    kind: "leaf",
    ref: { source: row.source, key: row.key },
    op: row.op,
    value: precisaDeValor ? row.value : undefined,
  };
}

function encontrarPrimeiraFolhaSimples(condition: Condition): ConditionLeaf | null {
  if (condition.kind === "leaf") return folhaRepresentavel(condition) ? condition : null;
  if (condition.kind === "not") return encontrarPrimeiraFolhaSimples(condition.condition);

  for (const filha of condition.conditions) {
    const achada = encontrarPrimeiraFolhaSimples(filha);
    if (achada) return achada;
  }

  return null;
}

/** Converte o valor digitado para número quando possível; senão mantém texto. */
export function converterValor(valor: string): string | number {
  const numero = Number(valor.replace(",", "."));
  return valor.trim() !== "" && Number.isFinite(numero) ? numero : valor;
}
