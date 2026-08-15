import { describe, expect, it } from "vitest";

import { resolveNextStepId } from "./logic/routing";
import { applyOp, applyOps, createBlock, createStep, findBlock } from "./ops";
import { parseFunnelDocument } from "./schema";
import { metabolismoTemplate } from "./templates/metabolismo";

const base = metabolismoTemplate;

describe("operações de edição", () => {
  it("não altera o documento original", () => {
    const antes = JSON.stringify(base);
    applyOp(base, { type: "remove_step", stepId: "step_idade" });
    expect(JSON.stringify(base)).toBe(antes);
  });

  it("mantém o documento válido depois de uma sequência de operações", () => {
    const bloco = createBlock(base, "heading", "Novo título")!;
    const step = createStep(base, "content", "Tela extra");

    const doc = applyOps(base, [
      { type: "add_step", step, afterStepId: "step_inicio" },
      { type: "add_block", stepId: step.id, block: bloco },
      { type: "update_block", blockId: bloco.id, patch: { props: { text: "Olá" } } },
      { type: "set_theme", patch: { colors: { primary: "#ff0055" } } },
    ]);

    const parsed = parseFunnelDocument(doc);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(parsed.data?.theme.colors.primary).toBe("#ff0055");
  });

  it("remover um step apaga as regras que apontavam para ele", () => {
    const comRegra = applyOp(base, {
      type: "update_step",
      stepId: "step_inicio",
      patch: {
        logic: {
          rules: [
            {
              id: "regra_pula",
              when: { kind: "leaf", ref: { source: "score" }, op: "gte", value: 10 },
              goto: "step_idade",
            },
          ],
        },
      },
    });

    const semStep = applyOp(comRegra, { type: "remove_step", stepId: "step_idade" });

    expect(semStep.steps.some((s) => s.id === "step_idade")).toBe(false);
    expect(semStep.steps[0].logic.rules).toHaveLength(0);
    // Regra órfã deixaria o visitante preso; o documento tem que seguir válido.
    expect(parseFunnelDocument(semStep).success).toBe(true);
  });

  it("recusa remover o último step", () => {
    const umStepSo = { ...base, steps: [base.steps[0]] };
    const depois = applyOp(umStepSo, { type: "remove_step", stepId: base.steps[0].id });
    expect(depois.steps).toHaveLength(1);
  });

  it("gera ids únicos ao inserir blocos com o mesmo nome", () => {
    let doc = base;

    for (let i = 0; i < 3; i++) {
      const bloco = createBlock(doc, "heading", "Título")!;
      doc = applyOp(doc, { type: "add_block", stepId: "step_inicio", block: bloco });
    }

    const ids = doc.steps[0].blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gera nomes de variável únicos para campos de entrada", () => {
    let doc = base;

    const a = createBlock(doc, "input", "email")!;
    doc = applyOp(doc, { type: "add_block", stepId: "step_inicio", block: a });
    const b = createBlock(doc, "input", "email")!;

    // "email" já é usado pelo template, então nenhum dos dois pode reusá-lo.
    expect(a.type === "input" && a.props.name).not.toBe("email");
    expect(b.type === "input" && b.props.name).not.toBe(a.type === "input" && a.props.name);
  });

  it("mescla props em vez de substituir o objeto inteiro", () => {
    const doc = applyOp(base, {
      type: "update_block",
      blockId: "blk_opcoes_objetivo",
      patch: { props: { layout: "grid2" } },
    });

    const encontrado = findBlock(doc, "blk_opcoes_objetivo");
    expect(encontrado?.block.type).toBe("choice");
    if (encontrado?.block.type === "choice") {
      expect(encontrado.block.props.layout).toBe("grid2");
      // As opções não podem ter sumido no caminho.
      expect(encontrado.block.props.options).toHaveLength(4);
    }
  });

  it("move um bloco entre steps", () => {
    const doc = applyOp(base, {
      type: "move_block",
      blockId: "blk_subtitulo",
      toStepId: "step_objetivo",
      toIndex: 0,
    });

    expect(doc.steps[0].blocks.some((b) => b.id === "blk_subtitulo")).toBe(false);
    expect(doc.steps[1].blocks[0].id).toBe("blk_subtitulo");
    expect(parseFunnelDocument(doc).success).toBe(true);
  });

  it("duplicar um bloco cria id novo e mantém o conteúdo", () => {
    const doc = applyOp(base, { type: "duplicate_block", blockId: "blk_titulo" });
    const step = doc.steps[0];
    const indice = step.blocks.findIndex((b) => b.id === "blk_titulo");
    const copia = step.blocks[indice + 1];

    expect(copia.id).not.toBe("blk_titulo");
    expect(copia.type).toBe("heading");
    expect(parseFunnelDocument(doc).success).toBe(true);
  });

  it("não deixa um container entrar dentro de outro container", () => {
    const container = createBlock(base, "container")!;
    let doc = applyOp(base, { type: "add_block", stepId: "step_inicio", block: container });

    const interno = createBlock(doc, "container")!;
    doc = applyOp(doc, {
      type: "add_block",
      stepId: "step_inicio",
      block: interno,
      containerId: container.id,
    });

    const encontrado = findBlock(doc, container.id);
    expect(encontrado?.block.type).toBe("container");
    if (encontrado?.block.type === "container") {
      expect(encontrado.block.props.children).toHaveLength(0);
    }
  });

  it("um ramo com destino fixo não escorrega para o ramo seguinte", () => {
    // Reproduz a forma que a ramificação monta: duas telas de caminho, uma
    // depois da outra na lista, convergindo para a mesma tela adiante.
    const ramoA = { ...createStep(base, "content", "Ramo A"), logic: { rules: [], next: "step_nome" } };
    const ramoB = { ...createStep(base, "content", "Ramo B"), logic: { rules: [], next: "step_nome" } };

    let doc = applyOp(base, { type: "add_step", step: ramoA, afterStepId: "step_objetivo" });
    doc = applyOp(doc, { type: "add_step", step: ramoB, afterStepId: ramoA.id });

    const contexto = {
      answers: {},
      scores: { total: 0 },
      variables: {},
      stepIndex: 0,
      stepCount: doc.steps.length,
    };

    // Sem `next`, sair do ramo A cairia no ramo B, que é da outra resposta.
    expect(resolveNextStepId(doc, ramoA.id, contexto)).toBe("step_nome");
    expect(resolveNextStepId(doc, ramoB.id, contexto)).toBe("step_nome");
    expect(parseFunnelDocument(doc).success).toBe(true);
  });

  it("destino fixo apontando para tela inexistente cai no caminho padrão", () => {
    const doc = applyOp(base, {
      type: "update_step",
      stepId: "step_inicio",
      patch: { logic: { rules: [], next: "step_fantasma" } },
    });

    const contexto = {
      answers: {},
      scores: { total: 0 },
      variables: {},
      stepIndex: 0,
      stepCount: doc.steps.length,
    };

    expect(resolveNextStepId(doc, "step_inicio", contexto)).toBe("step_objetivo");
  });

  it("operação com id inexistente não quebra nada", () => {
    const doc = applyOps(base, [
      { type: "remove_block", blockId: "blk_nao_existe" },
      { type: "update_block", blockId: "blk_nao_existe", patch: { props: { text: "x" } } },
      { type: "move_step", stepId: "step_fantasma", toIndex: 0 },
    ]);

    expect(doc.steps).toHaveLength(base.steps.length);
    expect(parseFunnelDocument(doc).success).toBe(true);
  });
});
