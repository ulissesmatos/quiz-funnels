import { describe, expect, it } from "vitest";

import { allBlockDefinitions, Block } from "./block";
import { createEmptyFunnel, FunnelDocument } from "./funnel";

describe("documento de funil", () => {
  it("aceita o funil vazio criado por createEmptyFunnel", () => {
    const result = FunnelDocument.safeParse(createEmptyFunnel("Meu funil", "meu-funil"));
    expect(result.success).toBe(true);
  });

  it("rejeita um goto que aponta para step inexistente", () => {
    const doc = createEmptyFunnel("Funil", "funil");
    doc.steps[0].logic.rules.push({
      id: "regra_1",
      when: { kind: "leaf", ref: { source: "answer", key: "objetivo" }, op: "eq", value: "sim" },
      goto: "step_que_nao_existe",
    });

    const result = FunnelDocument.safeParse(doc);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("não existe");
  });

  it("rejeita ids de step duplicados", () => {
    const doc = createEmptyFunnel("Funil", "funil");
    doc.steps.push({ ...doc.steps[0] });

    const result = FunnelDocument.safeParse(doc);
    expect(result.success).toBe(false);
  });

  it("rejeita props desconhecidas em um bloco", () => {
    const result = Block.safeParse({
      id: "blk_x",
      type: "heading",
      props: { text: "Oi", level: 1, tamanhoInventado: 42 },
    });
    expect(result.success).toBe(false);
  });

  it("rejeita id de bloco fora do padrão de slug", () => {
    const result = Block.safeParse({
      id: "Bloco Com Espaço",
      type: "heading",
      props: { text: "Oi", level: 1 },
    });
    expect(result.success).toBe(false);
  });
});

describe("registro de blocos", () => {
  it("todo bloco tem defaults e exemplo que passam no próprio schema", () => {
    for (const def of allBlockDefinitions) {
      const defaults = def.props.safeParse(def.defaults);
      expect(defaults.success, `defaults inválidos em "${def.type}": ${defaults.error?.message}`).toBe(true);

      const example = def.props.safeParse(def.example);
      expect(example.success, `exemplo inválido em "${def.type}": ${example.error?.message}`).toBe(true);
    }
  });

  it("todo bloco tem uma descrição útil para a IA", () => {
    for (const def of allBlockDefinitions) {
      expect(def.description.length, `descrição curta demais em "${def.type}"`).toBeGreaterThan(40);
    }
  });

  it("não permite container dentro de container", () => {
    const result = Block.safeParse({
      id: "blk_externo",
      type: "container",
      props: {
        columns: 2,
        gap: 16,
        children: [{ id: "blk_interno", type: "container", props: { columns: 1, gap: 8, children: [] } }],
      },
    });
    expect(result.success).toBe(false);
  });

  it("aceita um container com blocos folha dentro", () => {
    const result = Block.safeParse({
      id: "blk_colunas",
      type: "container",
      props: {
        columns: { base: 1, md: 2 },
        gap: 16,
        children: [
          { id: "blk_titulo", type: "heading", props: { text: "Oi", level: 2 } },
          { id: "blk_texto", type: "text", props: { text: "Tudo bem?" } },
        ],
      },
    });
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });
});

describe("condições", () => {
  it("aceita aninhamento de all/any/not", () => {
    const result = Block.safeParse({
      id: "blk_titulo",
      type: "heading",
      props: { text: "Oi", level: 1 },
      visibleIf: {
        kind: "all",
        conditions: [
          { kind: "leaf", ref: { source: "score" }, op: "gte", value: 40 },
          {
            kind: "any",
            conditions: [
              { kind: "leaf", ref: { source: "answer", key: "objetivo" }, op: "eq", value: "perder_peso" },
              { kind: "not", condition: { kind: "leaf", ref: { source: "variable", key: "utm_source" }, op: "is_empty" } },
            ],
          },
        ],
      },
    });
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });
});
