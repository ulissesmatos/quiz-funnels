import type { FunnelDocument, Step } from "../schema";
import { evaluateCondition } from "./conditions";
import type { FunnelContext } from "./context";

/**
 * Decide para onde ir ao sair de um step.
 *
 * As regras são testadas na ordem em que foram escritas e a primeira que casar
 * vence — igual a um `if/else if`. Sem regra que case, segue o caminho padrão,
 * que é a ordem da lista de steps.
 */
export function resolveNextStepId(
  doc: FunnelDocument,
  currentStepId: string,
  context: FunnelContext,
): string | null {
  const index = doc.steps.findIndex((s) => s.id === currentStepId);
  if (index === -1) return null;

  const step = doc.steps[index];

  if (step.logic.isEnd) return null;

  for (const rule of step.logic.rules) {
    if (evaluateCondition(rule.when, context)) {
      // Um `goto` quebrado não pode prender a pessoa: cai no caminho padrão.
      return doc.steps.some((s) => s.id === rule.goto) ? rule.goto : nextInOrder(doc, index);
    }
  }

  return nextInOrder(doc, index);
}

function nextInOrder(doc: FunnelDocument, index: number): string | null {
  const next = doc.steps[index + 1];
  return next ? next.id : null;
}

export function getStep(doc: FunnelDocument, stepId: string): Step | undefined {
  return doc.steps.find((s) => s.id === stepId);
}

export function stepIndexOf(doc: FunnelDocument, stepId: string): number {
  return doc.steps.findIndex((s) => s.id === stepId);
}
