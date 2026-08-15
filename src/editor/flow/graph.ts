import dagre from "dagre";

import { lintFunnel, type FunnelIssue } from "@/funnel/logic/lint";
import { walkBlocks, type Block } from "@/funnel/schema/block";
import type { Condition } from "@/funnel/schema/common";
import type { FunnelDocument } from "@/funnel/schema/funnel";
import type { Step } from "@/funnel/schema/step";

/**
 * Traduz o documento em nós e arestas.
 *
 * Nada aqui é estado novo: nó é tela, aresta é regra de roteamento ou ação de
 * botão. O mapa é uma leitura do mesmo documento que o Construtor edita, e é
 * por isso que uma mudança da IA aparece no fluxo sem nenhuma sincronização.
 */

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 96;

export type StepNodeData = {
  step: Step;
  index: number;
  /** Pergunta ou título principal da tela, para dar contexto no card. */
  resumo: string;
  problemas: FunnelIssue[];
  /** Leva para o Construtor nesta tela. Injetado pelo canvas. */
  onAbrir: (stepId: string) => void;
  [key: string]: unknown;
};

export type FlowEdgeKind = "padrao" | "regra" | "botao";

export type FlowEdgeData = {
  kind: FlowEdgeKind;
  /** Presente quando a aresta veio de uma regra, para permitir editar/remover. */
  ruleId?: string;
  fromStepId: string;
  [key: string]: unknown;
};

export type FlowGraph = {
  nodes: {
    id: string;
    type: "step";
    position: { x: number; y: number };
    data: StepNodeData;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    data: FlowEdgeData;
  }[];
};

export function buildGraph(
  doc: FunnelDocument,
  onAbrir: (stepId: string) => void = () => {},
): FlowGraph {
  const problemas = lintFunnel(doc);
  const idsExistentes = new Set(doc.steps.map((s) => s.id));

  const nodes: FlowGraph["nodes"] = doc.steps.map((step, index) => ({
    id: step.id,
    type: "step" as const,
    position: doc.flow?.positions?.[step.id] ?? { x: 0, y: 0 },
    data: {
      step,
      index,
      resumo: resumirStep(step),
      problemas: problemas.filter((p) => p.stepId === step.id),
      onAbrir,
    },
  }));

  const edges: FlowGraph["edges"] = [];

  doc.steps.forEach((step, index) => {
    // Regras primeiro: são o caminho que vence quando a condição bate.
    for (const rule of step.logic.rules) {
      if (!idsExistentes.has(rule.goto)) continue;

      edges.push({
        id: `regra:${step.id}:${rule.id}`,
        source: step.id,
        target: rule.goto,
        label: descreverCondicao(rule.when, doc),
        data: { kind: "regra", ruleId: rule.id, fromStepId: step.id },
      });
    }

    // Botões que saltam direto para uma tela.
    for (const block of walkBlocks(step.blocks)) {
      const destino = destinoDoBloco(block);
      if (!destino || !idsExistentes.has(destino)) continue;

      edges.push({
        id: `botao:${step.id}:${block.id}`,
        source: step.id,
        target: destino,
        label: rotuloDoBloco(block),
        data: { kind: "botao", fromStepId: step.id },
      });
    }

    // Caminho padrão: a ordem da lista de telas.
    const proximo = doc.steps[index + 1];
    if (proximo && !step.logic.isEnd) {
      edges.push({
        id: `padrao:${step.id}`,
        source: step.id,
        target: proximo.id,
        data: { kind: "padrao", fromStepId: step.id },
      });
    }
  });

  return { nodes, edges };
}

function destinoDoBloco(block: Block): string | null {
  if (block.type === "button" && block.props.action.kind === "goto") return block.props.action.stepId;
  if (block.type === "pricing" && block.props.action.kind === "goto") return block.props.action.stepId;
  if (block.type === "loader" && block.props.onFinish.kind === "goto") return block.props.onFinish.stepId;
  return null;
}

function rotuloDoBloco(block: Block): string {
  if (block.type === "button") return block.props.label;
  if (block.type === "pricing") return block.props.actionLabel;
  return "ao terminar";
}

function resumirStep(step: Step): string {
  for (const block of step.blocks) {
    if (block.type === "heading") return block.props.text;
    if (block.type === "loader") return block.props.title;
  }

  for (const block of walkBlocks(step.blocks)) {
    if (block.type === "choice") return `Campo: ${block.props.name}`;
  }

  return "";
}

// ── Condição em português ──────────────────────────────────────

/**
 * Descreve a condição para o rótulo da aresta.
 *
 * O rótulo mostra o texto da opção, não o id: quem está lendo o mapa reconhece
 * "Perder peso", não `perder_peso`.
 */
export function descreverCondicao(condition: Condition, doc: FunnelDocument): string {
  switch (condition.kind) {
    case "leaf": {
      const campo = nomeDoCampo(condition.ref, doc);
      const operador = OPERADORES[condition.op];

      if (condition.op === "is_set") return `${campo} preenchido`;
      if (condition.op === "is_empty") return `${campo} vazio`;

      const valor = rotuloDoValor(condition.ref, condition.value, doc);
      return `${campo} ${operador} ${valor}`;
    }

    case "all":
      return condition.conditions.map((c) => descreverCondicao(c, doc)).join(" e ");

    case "any":
      return condition.conditions.map((c) => descreverCondicao(c, doc)).join(" ou ");

    case "not":
      return `não (${descreverCondicao(condition.condition, doc)})`;

    default:
      return "condição";
  }
}

const OPERADORES: Record<string, string> = {
  eq: "=",
  neq: "≠",
  contains: "contém",
  not_contains: "não contém",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  is_set: "preenchido",
  is_empty: "vazio",
};

function nomeDoCampo(ref: { source: string; key?: string }, doc: FunnelDocument): string {
  if (ref.source === "score") return ref.key ? `pontos ${ref.key}` : "pontuação";
  if (ref.source === "variable") return ref.key ?? "variável";

  // Preferimos a pergunta ao nome cru do campo, quando ela é curta.
  const pergunta = perguntaDoCampo(doc, ref.key);
  return pergunta ?? ref.key ?? "resposta";
}

function perguntaDoCampo(doc: FunnelDocument, key?: string): string | null {
  if (!key) return null;

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if ((block.type === "choice" || block.type === "input") && block.props.name === key) {
        return key;
      }
    }
  }

  return null;
}

function rotuloDoValor(
  ref: { source: string; key?: string },
  valor: unknown,
  doc: FunnelDocument,
): string {
  if (valor === undefined || valor === null) return "";
  if (Array.isArray(valor)) return valor.map((v) => rotuloDoValor(ref, v, doc)).join(" ou ");

  if (ref.source === "answer" && ref.key) {
    const opcao = encontrarOpcao(doc, ref.key, String(valor));
    if (opcao) return `"${opcao}"`;
  }

  return typeof valor === "string" ? `"${valor}"` : String(valor);
}

function encontrarOpcao(doc: FunnelDocument, campo: string, optionId: string): string | null {
  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.type !== "choice" || block.props.name !== campo) continue;

      const opcao = block.props.options.find((o) => o.id === optionId);
      if (opcao) return opcao.label;
    }
  }

  return null;
}

// ── Layout automático ──────────────────────────────────────────

/**
 * Organiza em camadas as telas que ainda não têm posição gravada.
 *
 * Roda só quando falta posição — se a pessoa já arrastou os nós, o layout não
 * pode reorganizar tudo por baixo dela.
 */
export function autoLayout(graph: FlowGraph): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  // Esquerda para a direita: o caminho principal de um funil é uma sequência
  // longa, e empilhada na vertical ela obriga a diminuir o zoom até os cards
  // ficarem ilegíveis. Na horizontal, as ramificações descem em paralelo.
  g.setGraph({ rankdir: "LR", nodesep: 36, ranksep: 90, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const posicoes: Record<string, { x: number; y: number }> = {};

  for (const node of graph.nodes) {
    const calculado = g.node(node.id);
    if (!calculado) continue;

    // O dagre devolve o centro; o React Flow espera o canto superior esquerdo.
    posicoes[node.id] = {
      x: Math.round(calculado.x - NODE_WIDTH / 2),
      y: Math.round(calculado.y - NODE_HEIGHT / 2),
    };
  }

  return posicoes;
}

/** Telas sem posição gravada — as que o auto-layout precisa cobrir. */
export function stepsSemPosicao(doc: FunnelDocument): string[] {
  const posicoes = doc.flow?.positions ?? {};
  return doc.steps.filter((s) => !posicoes[s.id]).map((s) => s.id);
}
