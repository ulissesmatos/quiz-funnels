import { walkBlocks } from "@/funnel/schema/block";
import type { FunnelDocument } from "@/funnel/schema/funnel";

/**
 * Campos que podem ser referenciados numa condição (regra de roteamento ou
 * visibilidade de bloco).
 *
 * Vem do próprio documento — ninguém digita key na mão, que é onde a condição
 * costuma nascer quebrada.
 */
export type CampoDisponivel =
  | {
      source: "answer";
      key: string;
      rotulo: string;
      opcoes: { id: string; label: string }[];
      definidoEmStepId: string;
      definidoEmStepNome: string;
    }
  | { source: "score"; key?: string; rotulo: string; opcoes: [] }
  | { source: "variable"; key: string; rotulo: string; opcoes: [] };

/**
 * Lista os campos disponíveis no documento.
 *
 * `ateStepId` presente: só campos respondidos antes daquele ponto do funil —
 * condicionar numa pergunta que vem depois produziria uma regra que nunca
 * bate. Omitido: todos os campos do funil, para um painel de referência.
 */
export function camposDisponiveis(doc: FunnelDocument, ateStepId?: string): CampoDisponivel[] {
  const campos: CampoDisponivel[] = [];
  const categorias = new Set<string>();

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.type === "choice") {
        campos.push({
          source: "answer",
          key: block.props.name,
          rotulo: `Resposta: ${block.props.name}`,
          opcoes: block.props.options.map((o) => ({ id: o.id, label: o.label })),
          definidoEmStepId: step.id,
          definidoEmStepNome: step.name,
        });

        for (const opcao of block.props.options) {
          for (const categoria of Object.keys(opcao.scores ?? {})) categorias.add(categoria);
        }
      }

      if (block.type === "input") {
        campos.push({
          source: "answer",
          key: block.props.name,
          rotulo: `Campo: ${block.props.name}`,
          opcoes: [],
          definidoEmStepId: step.id,
          definidoEmStepNome: step.name,
        });
      }
    }

    if (ateStepId && step.id === ateStepId) break;
  }

  campos.push({ source: "score", rotulo: "Pontuação total", opcoes: [] });
  for (const categoria of categorias) {
    campos.push({ source: "score", key: categoria, rotulo: `Pontos: ${categoria}`, opcoes: [] });
  }

  for (const variavel of doc.variables) {
    campos.push({
      source: "variable",
      key: variavel.key,
      rotulo: variavel.label ? `Variável: ${variavel.label}` : `Variável: ${variavel.key}`,
      opcoes: [],
    });
  }

  return campos;
}
