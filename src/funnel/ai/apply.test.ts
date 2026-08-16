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

  it("aponta a chave inválida de scores, não só o erro genérico do Zod", () => {
    const resultado = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "choice",
      props: {
        name: "pergunta_teste",
        multiple: false,
        layout: "list",
        autoAdvance: true,
        required: true,
        showLetters: false,
        options: [
          { id: "a", label: "Opção A", scores: { "valor percebido": 3 } },
          { id: "b", label: "Opção B" },
        ],
      },
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;

    // Sem o fix, a mensagem seria só "Invalid key in record" — inútil para o
    // modelo corrigir sozinho.
    expect(resultado.error).not.toContain("Invalid key in record");
    expect(resultado.error).toContain("letra minúscula");
  });

  it("recusa um tipo de bloco inexistente", () => {
    const resultado = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "carrossel_magico",
      props: {},
    });

    expect(resultado.ok).toBe(false);
  });

  it("layout 'emoji' exige emoji em toda opção", () => {
    const semEmoji = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "choice",
      props: {
        name: "pergunta_emoji",
        multiple: false,
        layout: "emoji",
        autoAdvance: true,
        required: true,
        showLetters: false,
        options: [
          { id: "a", label: "Opção A", emoji: "🔥" },
          { id: "b", label: "Opção B" }, // sem emoji
        ],
      },
    });
    expect(semEmoji.ok).toBe(false);
    if (semEmoji.ok) return;
    expect(semEmoji.error).toContain("emoji");

    const comEmoji = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "choice",
      props: {
        name: "pergunta_emoji",
        multiple: false,
        layout: "emoji",
        autoAdvance: true,
        required: true,
        showLetters: false,
        options: [
          { id: "a", label: "Opção A", emoji: "🔥" },
          { id: "b", label: "Opção B", emoji: "❄️" },
        ],
      },
    });
    expect(comEmoji.ok, comEmoji.ok ? "" : comEmoji.error).toBe(true);
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

describe("ramificação por resposta", () => {
  it("cria uma regra por opção, com a condição correta", () => {
    // Telas de destino primeiro: ramificar para tela inexistente é recusado.
    let doc = base;

    for (const nome of ["Caminho A", "Caminho B"]) {
      const resultado = aplicarChamadaDaIa(doc, "add_step", { name: nome, type: "content" });
      expect(resultado.ok).toBe(true);
      if (resultado.ok) doc = resultado.doc;
    }

    const destinos = doc.steps.slice(-2).map((s) => s.id);

    const resultado = aplicarChamadaDaIa(doc, "branch_by_answer", {
      stepId: "step_objetivo",
      branches: [
        { optionId: "perder_peso", goto: destinos[0] },
        { optionId: "ganhar_massa", goto: destinos[1] },
      ],
      replace: true,
    });

    expect(resultado.ok, resultado.ok ? "" : resultado.error).toBe(true);
    if (!resultado.ok) return;

    const step = resultado.doc.steps.find((s) => s.id === "step_objetivo")!;
    expect(step.logic.rules).toHaveLength(2);

    const primeira = step.logic.rules[0];
    expect(primeira.goto).toBe(destinos[0]);
    expect(primeira.when).toEqual({
      kind: "leaf",
      ref: { source: "answer", key: "objetivo" },
      op: "eq",
      value: "perder_peso",
    });

    expect(parseFunnelDocument(resultado.doc).success).toBe(true);
  });

  it("recusa opção inexistente e diz quais são as válidas", () => {
    const resultado = aplicarChamadaDaIa(base, "branch_by_answer", {
      stepId: "step_objetivo",
      branches: [
        { optionId: "opcao_inventada", goto: "step_resultado" },
        { optionId: "perder_peso", goto: "step_resultado" },
      ],
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;

    expect(resultado.error).toContain("opcao_inventada");
    // O erro precisa ensinar o caminho, não só recusar.
    expect(resultado.error).toContain("perder_peso");
  });

  it("recusa destino inexistente apontando o que fazer", () => {
    const resultado = aplicarChamadaDaIa(base, "branch_by_answer", {
      stepId: "step_objetivo",
      branches: [
        { optionId: "perder_peso", goto: "step_que_nao_existe" },
        { optionId: "ganhar_massa", goto: "step_resultado" },
      ],
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain("add_step");
  });

  it("recusa ramificar uma tela sem pergunta", () => {
    const resultado = aplicarChamadaDaIa(base, "branch_by_answer", {
      stepId: "step_inicio",
      branches: [
        { optionId: "a", goto: "step_resultado" },
        { optionId: "b", goto: "step_resultado" },
      ],
    });

    expect(resultado.ok).toBe(false);
  });
});

describe("reordenar telas", () => {
  it("move uma tela para depois de outra", () => {
    const resultado = aplicarChamadaDaIa(base, "move_step", {
      stepId: "step_resultado",
      afterStepId: "step_inicio",
    });

    expect(resultado.ok, resultado.ok ? "" : resultado.error).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.doc.steps[1].id).toBe("step_resultado");
    expect(parseFunnelDocument(resultado.doc).success).toBe(true);
  });

  it("move para o começo com afterStepId nulo", () => {
    const resultado = aplicarChamadaDaIa(base, "move_step", {
      stepId: "step_oferta",
      afterStepId: null,
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.doc.steps[0].id).toBe("step_oferta");
  });

  it("conserta o caso real: resultado preso depois da oferta", () => {
    // Reproduz o funil que foi ao ar quebrado — oferta marcada como fim, com o
    // resultado atrás dela.
    const doc = aplicarChamadaDaIa(base, "move_step", {
      stepId: "step_resultado",
      afterStepId: "step_oferta",
    });
    expect(doc.ok).toBe(true);
    if (!doc.ok) return;

    const comFimNoMeio = aplicarChamadaDaIa(doc.doc, "update_step", {
      stepId: "step_oferta",
      isEnd: true,
    });
    expect(comFimNoMeio.ok).toBe(true);
    if (!comFimNoMeio.ok) return;

    // O check precisa acusar, e apontar a causa e não só a vítima.
    const relatorio = aplicarChamadaDaIa(comFimNoMeio.doc, "check_funnel", {});
    expect(relatorio.ok).toBe(true);
    if (!relatorio.ok) return;

    expect(relatorio.resumo).toContain("fim do funil");
    expect(relatorio.resumo).toContain("Resultado");

    // E deve ser consertável movendo a tela de volta.
    const consertado = aplicarChamadaDaIa(relatorio.doc, "move_step", {
      stepId: "step_resultado",
      afterStepId: "step_carregando",
    });
    expect(consertado.ok).toBe(true);
    if (!consertado.ok) return;

    const depois = aplicarChamadaDaIa(consertado.doc, "check_funnel", {});
    expect(depois.ok).toBe(true);
    if (depois.ok) expect(depois.resumo).not.toContain("não é alcançável");
  });
});

describe("conteúdo condicional", () => {
  it("torna um bloco condicional e depois volta atrás", () => {
    const condicionado = aplicarChamadaDaIa(base, "set_block_visibility", {
      blockId: "blk_botao_oferta",
      when: {
        match: "all",
        rules: [{ source: "answer", key: "objetivo", op: "eq", value: "perder_peso" }],
      },
    });

    expect(condicionado.ok, condicionado.ok ? "" : condicionado.error).toBe(true);
    if (!condicionado.ok) return;

    const bloco = findBlock(condicionado.doc, "blk_botao_oferta");
    expect(bloco?.block.visibleIf).toEqual({
      kind: "leaf",
      ref: { source: "answer", key: "objetivo" },
      op: "eq",
      value: "perder_peso",
    });
    expect(parseFunnelDocument(condicionado.doc).success).toBe(true);

    const revertido = aplicarChamadaDaIa(condicionado.doc, "set_block_visibility", {
      blockId: "blk_botao_oferta",
      when: null,
    });

    expect(revertido.ok).toBe(true);
    if (revertido.ok) expect(findBlock(revertido.doc, "blk_botao_oferta")?.block.visibleIf).toBeUndefined();
  });

  it("recusa bloco inexistente", () => {
    const resultado = aplicarChamadaDaIa(base, "set_block_visibility", {
      blockId: "blk_fantasma",
      when: null,
    });

    expect(resultado.ok).toBe(false);
  });
});

describe("autoconferência", () => {
  it("check_funnel devolve o relatório sem alterar o documento", () => {
    const resultado = aplicarChamadaDaIa(base, "check_funnel", {});

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.doc).toBe(base);
    // O funil de exemplo é o que a IA deve tomar como referência: limpo.
    expect(resultado.resumo).toContain("Nenhum problema");
  });

  it("o relatório aponta perguntas em série", () => {
    const doc = { ...base, steps: [base.steps[1], base.steps[2], base.steps[3], base.steps[5]] };
    const resultado = aplicarChamadaDaIa(doc, "check_funnel", {});

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.resumo).toContain("respiro");
  });
});

describe("submit_plan (modo cuidadoso)", () => {
  const telaBasica = { name: "Tela", type: "content" as const, purpose: "Teste", blocks: ["heading"] };

  function perguntas(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      name: `Pergunta ${i + 1}`,
      type: "question" as const,
      purpose: "Coleta uma resposta",
      blocks: ["progress", "heading", "choice"],
    }));
  }

  it("aceita um plano pequeno, de uma tela só, sem exigir oferta robusta", () => {
    const resultado = aplicarChamadaDaIa(base, "submit_plan", {
      screens: [telaBasica],
      scoring: "Nenhuma pontuação nova.",
      personalizationSummary: "Nenhuma mudança de personalização neste ajuste.",
    });

    expect(resultado.ok, resultado.ok ? "" : resultado.error).toBe(true);
    if (resultado.ok) expect(resultado.doc).toBe(base); // não muda o documento
  });

  it("recusa um plano com 4+ perguntas e oferta rasa, com erro acionável", () => {
    const resultado = aplicarChamadaDaIa(base, "submit_plan", {
      screens: [
        ...perguntas(4),
        { name: "Oferta", type: "checkout" as const, purpose: "Vender", blocks: ["heading", "text", "button"] },
      ],
      scoring: "Cada pergunta soma 1 ponto.",
      personalizationSummary: "Resultado varia por pontuação.",
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain("oferta");
  });

  it("aceita um plano com 4+ perguntas quando a oferta planejada é robusta", () => {
    const resultado = aplicarChamadaDaIa(base, "submit_plan", {
      screens: [
        ...perguntas(4),
        {
          name: "Oferta",
          type: "checkout" as const,
          purpose: "Vender",
          blocks: ["heading", "text", "pricing", "guarantee", "testimonials"],
        },
      ],
      scoring: "Cada pergunta soma 1 ponto.",
      personalizationSummary: "Resultado varia por pontuação.",
    });

    expect(resultado.ok, resultado.ok ? "" : resultado.error).toBe(true);
  });
});

describe("set_variables", () => {
  it("declara variáveis novas sem apagar as existentes do documento", () => {
    const comUtm = aplicarChamadaDaIa(base, "set_variables", {
      variables: [{ key: "utm_source", source: "query" }],
    });
    expect(comUtm.ok, comUtm.ok ? "" : comUtm.error).toBe(true);
    if (!comUtm.ok) return;

    const comSegunda = aplicarChamadaDaIa(comUtm.doc, "set_variables", {
      variables: [{ key: "campanha", source: "constant", defaultValue: "verao" }],
    });
    expect(comSegunda.ok, comSegunda.ok ? "" : comSegunda.error).toBe(true);
    if (!comSegunda.ok) return;

    const chaves = comSegunda.doc.variables.map((v) => v.key);
    expect(chaves).toContain("utm_source");
    expect(chaves).toContain("campanha");
    expect(parseFunnelDocument(comSegunda.doc).success).toBe(true);
  });

  it("upsert: reenviar a mesma key substitui, não duplica", () => {
    const primeira = aplicarChamadaDaIa(base, "set_variables", {
      variables: [{ key: "utm_source", source: "query", defaultValue: "direto" }],
    });
    expect(primeira.ok).toBe(true);
    if (!primeira.ok) return;

    const segunda = aplicarChamadaDaIa(primeira.doc, "set_variables", {
      variables: [{ key: "utm_source", source: "constant", defaultValue: "google" }],
    });
    expect(segunda.ok).toBe(true);
    if (!segunda.ok) return;

    const variaveis = segunda.doc.variables.filter((v) => v.key === "utm_source");
    expect(variaveis).toHaveLength(1);
    expect(variaveis[0].source).toBe("constant");
  });
});

describe("container com filhos já populados", () => {
  it("dá ids e nomes únicos a dois filhos choice de mesmo nome", () => {
    const resultado = aplicarChamadaDaIa(base, "add_block", {
      stepId: "step_inicio",
      type: "container",
      props: {
        columns: { base: 1, md: 2 },
        gap: 16,
        children: [
          {
            id: "blk_titulo", // já existe no template — precisa ganhar sufixo
            type: "choice",
            props: {
              name: "objetivo", // já existe no template — precisa ganhar sufixo
              multiple: false,
              layout: "list",
              autoAdvance: true,
              required: true,
              showLetters: false,
              options: [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
              ],
            },
          },
          {
            id: "blk_titulo", // colide com o filho anterior também
            type: "choice",
            props: {
              name: "objetivo", // colide com o filho anterior também
              multiple: false,
              layout: "list",
              autoAdvance: true,
              required: true,
              showLetters: false,
              options: [
                { id: "c", label: "C" },
                { id: "d", label: "D" },
              ],
            },
          },
        ],
      },
    });

    expect(resultado.ok, resultado.ok ? "" : resultado.error).toBe(true);
    if (!resultado.ok) return;

    const container = findBlock(resultado.doc, resultado.blocosTocados[0]);
    expect(container?.block.type).toBe("container");
    if (container?.block.type !== "container") return;

    const [filho1, filho2] = container.block.props.children;
    expect(filho1.id).not.toBe(filho2.id);
    expect(filho1.id).not.toBe("blk_titulo"); // não pode ter roubado o id do bloco existente

    expect(filho1.type).toBe("choice");
    expect(filho2.type).toBe("choice");
    if (filho1.type === "choice" && filho2.type === "choice") {
      expect(filho1.props.name).not.toBe(filho2.props.name);
      expect(filho1.props.name).not.toBe("objetivo");
    }

    expect(parseFunnelDocument(resultado.doc).success).toBe(true);
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
    // Container tem forma diferente (props aninhadas) e por isso não entra no
    // catálogo genérico — mas ganha uma seção própria explicando o padrão.
    expect(prompt).not.toContain("### container");
    expect(prompt).toContain("container");
  });
});
