import { describe, expect, it } from "vitest";

import type { Condition, ConditionLeaf } from "@/funnel/schema/common";

import {
  builderParaCondicao,
  condicaoParaBuilder,
  type ConditionBuilderValue,
} from "./condition-builder-utils";

const folhaObjetivo: ConditionLeaf = {
  kind: "leaf",
  ref: { source: "answer", key: "objetivo" },
  op: "eq",
  value: "perder_peso",
};

const folhaIdade: ConditionLeaf = {
  kind: "leaf",
  ref: { source: "answer", key: "idade" },
  op: "gte",
  value: 30,
};

describe("condicaoParaBuilder / builderParaCondicao", () => {
  it("faz round-trip de uma folha única", () => {
    const { value, irrepresentavel } = condicaoParaBuilder(folhaObjetivo);

    expect(irrepresentavel).toBeNull();
    expect(value).toEqual<ConditionBuilderValue>({ match: "all", rows: [
      { source: "answer", key: "objetivo", op: "eq", value: "perder_peso" },
    ] });
    expect(builderParaCondicao(value)).toEqual(folhaObjetivo);
  });

  it("faz round-trip de um grupo E/OU de folhas simples", () => {
    const grupo: Condition = { kind: "any", conditions: [folhaObjetivo, folhaIdade] };
    const { value, irrepresentavel } = condicaoParaBuilder(grupo);

    expect(irrepresentavel).toBeNull();
    expect(value.match).toBe("any");
    expect(value.rows).toHaveLength(2);
    expect(builderParaCondicao(value)).toEqual(grupo);
  });

  it("colapsa uma linha só de volta para uma folha solta, não um grupo", () => {
    const value: ConditionBuilderValue = {
      match: "all",
      rows: [{ source: "score", op: "gte", value: 10 }],
    };

    const condicao = builderParaCondicao(value);
    expect(condicao.kind).toBe("leaf");
  });

  it("marca condição com `not` como irrepresentável, sem descartá-la", () => {
    const comNot: Condition = { kind: "not", condition: folhaObjetivo };
    const { value, irrepresentavel } = condicaoParaBuilder(comNot);

    expect(irrepresentavel).toEqual(comNot);
    // Melhor esforço: acha a folha simples lá dentro como ponto de partida.
    expect(value.rows).toEqual([{ source: "answer", key: "objetivo", op: "eq", value: "perder_peso" }]);
  });

  it("marca grupo aninhado (all dentro de any) como irrepresentável", () => {
    const aninhado: Condition = {
      kind: "any",
      conditions: [folhaObjetivo, { kind: "all", conditions: [folhaIdade] }],
    };
    const { irrepresentavel } = condicaoParaBuilder(aninhado);

    expect(irrepresentavel).toEqual(aninhado);
  });

  it("marca folha com valor em lista como irrepresentável, para não perder opções ao editar", () => {
    const comLista: ConditionLeaf = {
      kind: "leaf",
      ref: { source: "answer", key: "objetivo" },
      op: "eq",
      value: ["perder_peso", "ganhar_massa"],
    };

    const { irrepresentavel, value } = condicaoParaBuilder(comLista);
    expect(irrepresentavel).toEqual(comLista);
    expect(value.rows).toEqual([]);
  });

  it("sem condição inicial e com campo padrão, semeia uma linha", () => {
    const { value, irrepresentavel } = condicaoParaBuilder(undefined, {
      source: "answer",
      key: "objetivo",
      rotulo: "Resposta: objetivo",
      opcoes: [],
      definidoEmStepId: "step_1",
      definidoEmStepNome: "Tela 1",
    });

    expect(irrepresentavel).toBeNull();
    expect(value.rows).toEqual([{ source: "answer", key: "objetivo", op: "eq", value: undefined }]);
  });

  it("sem condição inicial e sem campo padrão, fica com zero linhas", () => {
    const { value } = condicaoParaBuilder(undefined);
    expect(value.rows).toEqual([]);
  });
});
