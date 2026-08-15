import { walkBlocks, type FunnelDocument } from "../schema";
import type { AnswerValue } from "./context";

/**
 * Recalcula a pontuação a partir das respostas.
 *
 * É sempre um recálculo completo, nunca um acumulador incremental: se a pessoa
 * voltar e trocar uma resposta, o score tem que refletir a escolha nova. Somar
 * pontos "ao responder" é a fonte clássica de score inflado em quiz com botão
 * de voltar.
 */
export function computeScores(
  doc: FunnelDocument,
  answers: Record<string, AnswerValue>,
): Record<string, number> {
  const scores: Record<string, number> = { total: 0 };

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.type !== "choice") continue;

      const answer = answers[block.props.name];
      if (answer === undefined || answer === null) continue;

      const selected = new Set(
        Array.isArray(answer) ? answer.map(String) : [String(answer)],
      );

      for (const option of block.props.options) {
        if (!selected.has(option.id)) continue;

        if (typeof option.score === "number") {
          scores.total += option.score;
        }

        if (option.scores) {
          for (const [category, points] of Object.entries(option.scores)) {
            scores[category] = (scores[category] ?? 0) + points;
          }
        }
      }
    }
  }

  return scores;
}

/**
 * Categoria com maior pontuação — o "seu perfil é X" de quiz de diagnóstico.
 * Empate resolve pela ordem de declaração, que é estável entre execuções.
 */
export function topScoreCategory(scores: Record<string, number>): string | null {
  let best: string | null = null;
  let bestValue = -Infinity;

  for (const [category, value] of Object.entries(scores)) {
    if (category === "total") continue;
    if (value > bestValue) {
      best = category;
      bestValue = value;
    }
  }

  return best;
}
