import { describe, expect, it } from "vitest";

import { applyOp, createStep } from "../ops";
import type { FunnelDocument } from "../schema";
import { metabolismoTemplate } from "../templates/metabolismo";
import { lintFunnel, type FunnelIssue } from "./lint";

const base = metabolismoTemplate;

const temCodigo = (issues: FunnelIssue[], code: FunnelIssue["code"]) =>
  issues.some((i) => i.code === code);

describe("lint do funil", () => {
  it("não acusa erro no funil de exemplo", () => {
    const issues = lintFunnel(base);
    const erros = issues.filter((i) => i.severity === "erro");

    expect(erros, JSON.stringify(erros, null, 2)).toHaveLength(0);
  });

  it("detecta tela inalcançável", () => {
    // Uma tela solta no fim, com a anterior encerrando o funil, nunca é vista.
    const solta = createStep(base, "content", "Órfã");
    let doc = applyOp(base, { type: "add_step", step: solta });
    doc = applyOp(doc, {
      type: "update_step",
      stepId: "step_oferta",
      patch: { logic: { rules: [], isEnd: true } },
    });

    const issues = lintFunnel(doc);
    expect(temCodigo(issues, "step_inalcancavel")).toBe(true);
  });

  it("detecta regra apontando para tela inexistente", () => {
    // Documento montado à mão: o schema barraria isso, mas o lint precisa
    // sobreviver a um documento que chegou torto de qualquer origem.
    const doc = {
      ...base,
      steps: base.steps.map((step) =>
        step.id === "step_objetivo"
          ? {
              ...step,
              logic: {
                rules: [
                  {
                    id: "regra_x",
                    goto: "step_fantasma",
                    when: {
                      kind: "leaf" as const,
                      ref: { source: "score" as const },
                      op: "gte" as const,
                      value: 1,
                    },
                  },
                ],
              },
            }
          : step,
      ),
    } as FunnelDocument;

    expect(temCodigo(lintFunnel(doc), "regra_orfa")).toBe(true);
  });

  it("avisa quando há quatro ou mais perguntas seguidas", () => {
    const doc: FunnelDocument = {
      ...base,
      steps: [
        base.steps[1], // objetivo
        base.steps[2], // idade
        base.steps[3], // rotina
        base.steps[5], // energia
        base.steps[6], // hábitos
      ],
    };

    expect(temCodigo(lintFunnel(doc), "perguntas_em_serie")).toBe(true);
  });

  it("não reclama de ritmo quando há respiro no meio", () => {
    // O template tem prova social entre a terceira e a quarta pergunta.
    expect(temCodigo(lintFunnel(base), "perguntas_em_serie")).toBe(false);
  });

  it("detecta dois campos gravando na mesma variável", () => {
    const doc = {
      ...base,
      steps: base.steps.map((step) =>
        step.id === "step_nome"
          ? {
              ...step,
              blocks: [
                ...step.blocks,
                {
                  id: "blk_nome_duplicado",
                  type: "input" as const,
                  props: { name: "nome", inputType: "text" as const, required: true },
                },
              ],
            }
          : step,
      ),
    } as FunnelDocument;

    expect(temCodigo(lintFunnel(doc), "campo_duplicado")).toBe(true);
  });

  it("avisa quando o funil não captura contato", () => {
    const doc: FunnelDocument = { ...base, steps: [base.steps[0]] };
    expect(temCodigo(lintFunnel(doc), "sem_captura")).toBe(true);
  });
});
