import { describe, expect, it } from "vitest";

import { findBlock } from "../ops";
import { parseFunnelDocument } from "../schema";
import { metabolismoTemplate } from "../templates/metabolismo";
import { aplicarChamadaDaIa, converterCondicao } from "./apply";
import { buildSystemPrompt, outlineFunnel } from "./prompt";

const base = metabolismoTemplate;

describe("aplicação de chamadas da IA", () => {
  it("adiciona um bloco válido e mantém o documento consistente", () => {
    const resultado = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "text",
      props: { text: "Feito pela IA" },
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(parseFunnelDocument(resultado.doc).success).toBe(true);
    expect(resultado.blocosTocados).toHaveLength(1);
  });

  it("recusa props inválidas e devolve um erro com exemplo para o modelo", () => {
    const resultado = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "heading",
      props: { texto: "campo com nome errado" },
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;

    expect(resultado.error).toContain("heading");
    // O exemplo é o que permite ao modelo corrigir sozinho na próxima chamada.
    expect(resultado.error).toContain("Exemplo válido");
  });

  it("recusa um tipo de bloco inexistente", () => {
    const resultado = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "carrossel_magico",
      props: {},
    });

    expect(resultado.ok).toBe(false);
  });

  it("recusa uma tela que não existe", () => {
    const resultado = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inventado",
      type: "text",
      props: { text: "oi" },
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain("não existe");
  });

  it("evita que dois campos gravem na mesma variável", () => {
    const resultado = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "input",
      // "email" já é usado pelo template.
      props: { name: "email", inputType: "email", required: true },
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const bloco = findBlock(resultado.doc, resultado.blocosTocados[0]);
    expect(bloco?.block.type).toBe("input");
    if (bloco?.block.type === "input") expect(bloco.block.props.name).not.toBe("email");
  });

  it("valida update_block sobre a mescla, não sobre o patch isolado", () => {
    const ok = aplicarChamadaDaIa(base, "update_block", {
      blockId: "blk_titulo",
      props: { text: "Novo título" },
    });
    expect(ok.ok).toBe(true);

    const invalido = aplicarChamadaDaIa(base, "update_block", {
      blockId: "blk_titulo",
      props: { level: 9 },
    });
    expect(invalido.ok).toBe(false);
  });

  it("recusa uma regra de lógica que aponta para tela inexistente", () => {
    const resultado = aplicarChamadaDaIa(base, "set_step_logic", {
      stepId: "step_objetivo",
      rules: [
        {
          id: "regra_1",
          goto: "step_que_nao_existe",
          when: { match: "all", rules: [{ source: "score", op: "gte", value: 5 }] },
        },
      ],
    });

    expect(resultado.ok).toBe(false);
  });

  it("converte lógica achatada da IA na condição do motor", () => {
    const resultado = aplicarChamadaDaIa(base, "set_step_logic", {
      stepId: "step_objetivo",
      rules: [
        {
          id: "regra_atalho",
          goto: "step_resultado",
          when: {
            match: "all",
            rules: [
              { source: "answer", key: "objetivo", op: "eq", value: "perder_peso" },
              { source: "score", key: "metabolismo_lento", op: "gte", value: 4 },
            ],
          },
        },
      ],
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const step = resultado.doc.steps.find((s) => s.id === "step_objetivo");
    expect(step?.logic.rules[0].when.kind).toBe("all");
    expect(parseFunnelDocument(resultado.doc).success).toBe(true);
  });

  it("recusa cor de tema fora do formato hexadecimal", () => {
    expect(aplicarChamadaDaIa(base, "set_theme", { primary: "azul" }).ok).toBe(false);
    expect(aplicarChamadaDaIa(base, "set_theme", { primary: "#ff0055" }).ok).toBe(true);
  });

  it("uma sequência de operações produz um funil válido", () => {
    let doc = base;

    const passos: [Parameters<typeof aplicarChamadaDaIa>[1], Record<string, unknown>][] = [
      ["add_step", { name: "Tela nova", type: "question", afterStepId: "step_inicio" }],
      ["add_block", { stepId: "step_tela_nova", type: "heading", props: { text: "Pergunta?", level: 1 } }],
      [
        "add_block",
        {
          stepId: "step_tela_nova",
          type: "choice",
          props: {
            name: "nova_pergunta",
            multiple: false,
            layout: "list",
            autoAdvance: true,
            required: true,
            showLetters: false,
            options: [
              { id: "sim", label: "Sim", score: 1 },
              { id: "nao", label: "Não", score: 0 },
            ],
          },
        },
      ],
    ];

    for (const [nome, entrada] of passos) {
      const resultado = aplicarChamadaDaIa(doc, nome, entrada);
      expect(resultado.ok, `falhou em ${nome}: ${resultado.ok ? "" : resultado.error}`).toBe(true);
      if (resultado.ok) doc = resultado.doc;
    }

    expect(doc.steps).toHaveLength(base.steps.length + 1);
    expect(parseFunnelDocument(doc).success).toBe(true);
  });
});

describe("condições achatadas", () => {
  it("uma regra só não vira grupo desnecessário", () => {
    const condicao = converterCondicao({
      match: "all",
      rules: [{ source: "score", op: "gte", value: 10 }],
    });

    expect(condicao.kind).toBe("leaf");
  });
});

describe("contexto entregue ao modelo", () => {
  it("o resumo cita os ids que as ferramentas esperam receber", () => {
    const resumo = outlineFunnel(base);

    expect(resumo).toContain("step_objetivo");
    expect(resumo).toContain("blk_opcoes_objetivo");
    // Precisa ser um resumo, não o documento inteiro.
    expect(resumo.length).toBeLessThan(JSON.stringify(base).length / 3);
  });

  it("o prompt descreve todos os blocos do registro", () => {
    const prompt = buildSystemPrompt(base);

    for (const tipo of ["heading", "choice", "loader", "result", "button"]) {
      expect(prompt).toContain(`### ${tipo}`);
    }
    // O container não entra: a IA não manipula blocos aninhados.
    expect(prompt).not.toContain("### container");
  });
});
