import { current, produce } from "immer";

import { slugifyId, uniqueId } from "@/lib/slug";

import { getBlockDefinition, isContainer, walkBlocks, type Block, type LeafBlock } from "./schema/block";
import type { FunnelDocument } from "./schema/funnel";
import type { RoutingRule, Step, StepType } from "./schema/step";
import type { Theme } from "./schema/theme";
import { defaultStepLayout } from "./schema/step";

/**
 * Operações de edição do documento.
 *
 * Este módulo é o único caminho de escrita: o editor manual e o copiloto de IA
 * passam pelas mesmas funções. É o que garante que uma mudança feita pela IA
 * seja indistinguível de uma feita à mão — mesma validação, mesmo undo, mesmo
 * autosave — e evita duas implementações divergindo com o tempo.
 *
 * Toda operação é pura: recebe o documento e devolve outro. O Immer cuida da
 * cópia estrutural, então o React enxerga a mudança sem clonar o mundo.
 */

export type FunnelOp =
  | { type: "add_step"; step: Step; afterStepId?: string }
  | { type: "update_step"; stepId: string; patch: StepPatch }
  | { type: "remove_step"; stepId: string }
  | { type: "move_step"; stepId: string; toIndex: number }
  | {
      type: "add_block";
      stepId: string;
      block: Block;
      /** Posição na lista; omitido insere no fim. */
      index?: number;
      /** Insere dentro deste container em vez de direto no step. */
      containerId?: string;
    }
  | { type: "update_block"; blockId: string; patch: BlockPatch }
  | { type: "remove_block"; blockId: string }
  | {
      type: "move_block";
      blockId: string;
      toStepId: string;
      toIndex: number;
      containerId?: string;
    }
  | { type: "duplicate_block"; blockId: string }
  | { type: "set_theme"; patch: ThemePatch }
  | { type: "set_funnel"; patch: FunnelPatch }
  // ── Fluxo ────────────────────────────────────────────────────
  | { type: "set_flow_position"; stepId: string; x: number; y: number }
  | { type: "add_rule"; stepId: string; rule: RoutingRule }
  | { type: "update_rule"; stepId: string; ruleId: string; patch: Partial<RoutingRule> }
  | { type: "remove_rule"; stepId: string; ruleId: string }
  | {
      /**
       * Gera uma regra por opção de um bloco de escolha.
       *
       * Existe como operação própria porque montar condição a condição é onde
       * o erro acontece — id trocado, operador errado. Aqui basta dizer "esta
       * opção vai para esta tela"; a condição é construída em código. É o mesmo
       * caminho do botão "ramificar por resposta" do editor e da ferramenta
       * `branch_by_answer` do copiloto.
       */
      type: "branch_by_answer";
      stepId: string;
      /** Bloco de escolha que define as opções; omitido, usa o primeiro da tela. */
      blockId?: string;
      branches: { optionId: string; goto: string }[];
      /** Remove as regras que já existiam antes de gerar as novas. */
      replace?: boolean;
    };

export type StepPatch = Partial<Pick<Step, "name" | "type" | "layout" | "logic" | "seo">>;

export type BlockPatch = {
  /** Mesclado nas props existentes; não substitui o objeto inteiro. */
  props?: Record<string, unknown>;
  style?: Block["style"] | null;
  visibleIf?: Block["visibleIf"] | null;
  animation?: Block["animation"] | null;
};

export type ThemePatch = {
  colors?: Partial<Theme["colors"]>;
  typography?: Partial<Theme["typography"]>;
  radius?: Partial<Theme["radius"]>;
  spacing?: Partial<Theme["spacing"]>;
  button?: Partial<Theme["button"]>;
  contentWidth?: number;
  transition?: Theme["transition"];
};

export type FunnelPatch = Partial<Pick<FunnelDocument, "name" | "slug" | "settings" | "variables">>;

/** Aplica uma operação. Operação inválida devolve o documento intacto. */
export function applyOp(doc: FunnelDocument, op: FunnelOp): FunnelDocument {
  return produce(doc, (draft) => {
    switch (op.type) {
      case "add_step": {
        const step = op.step as Step;
        step.id = uniqueId(step.id, draft.steps.map((s) => s.id));

        const at = op.afterStepId
          ? draft.steps.findIndex((s) => s.id === op.afterStepId) + 1
          : draft.steps.length;

        draft.steps.splice(at <= 0 ? draft.steps.length : at, 0, step);
        break;
      }

      case "update_step": {
        const step = draft.steps.find((s) => s.id === op.stepId);
        if (step) Object.assign(step, op.patch);
        break;
      }

      case "remove_step": {
        // Um funil sem nenhuma tela não é editável nem renderizável.
        if (draft.steps.length <= 1) break;

        const index = draft.steps.findIndex((s) => s.id === op.stepId);
        if (index === -1) break;

        draft.steps.splice(index, 1);

        // Regras que apontavam para a tela removida virariam becos sem saída.
        for (const step of draft.steps) {
          step.logic.rules = step.logic.rules.filter((rule) => rule.goto !== op.stepId);
        }
        break;
      }

      case "move_step": {
        const from = draft.steps.findIndex((s) => s.id === op.stepId);
        if (from === -1) break;

        const [step] = draft.steps.splice(from, 1);
        draft.steps.splice(clamp(op.toIndex, 0, draft.steps.length), 0, step);
        break;
      }

      case "add_block": {
        const step = draft.steps.find((s) => s.id === op.stepId);
        if (!step) break;

        const block = op.block as Block;
        block.id = uniqueId(block.id, [...collectBlockIds(draft)]);

        const list = op.containerId
          ? findContainerChildren(step, op.containerId)
          : (step.blocks as Block[]);
        if (!list) break;

        // Container não aceita container: a restrição existe no schema e
        // repeti-la aqui evita produzir um documento que só falharia ao salvar.
        if (op.containerId && isContainer(block)) break;

        const at = op.index ?? list.length;
        list.splice(clamp(at, 0, list.length), 0, block as LeafBlock & Block);
        break;
      }

      case "update_block": {
        const found = findBlock(draft, op.blockId);
        if (!found) break;

        const { block } = found;

        if (op.patch.props) {
          Object.assign(block.props as Record<string, unknown>, op.patch.props);
        }

        applyNullable(block, "style", op.patch.style);
        applyNullable(block, "visibleIf", op.patch.visibleIf);
        applyNullable(block, "animation", op.patch.animation);
        break;
      }

      case "remove_block": {
        const found = findBlock(draft, op.blockId);
        if (!found) break;

        found.list.splice(found.index, 1);
        break;
      }

      case "move_block": {
        const found = findBlock(draft, op.blockId);
        if (!found) break;

        const target = draft.steps.find((s) => s.id === op.toStepId);
        if (!target) break;

        const destination = op.containerId
          ? findContainerChildren(target, op.containerId)
          : (target.blocks as Block[]);
        if (!destination) break;

        if (op.containerId && isContainer(found.block)) break;

        const [block] = found.list.splice(found.index, 1);
        destination.splice(clamp(op.toIndex, 0, destination.length), 0, block);
        break;
      }

      case "duplicate_block": {
        const found = findBlock(draft, op.blockId);
        if (!found) break;

        // `found.block` é um draft do Immer (Proxy) e não é clonável direto;
        // `current` devolve o snapshot puro por trás dele.
        const copy = structuredClone(current(found.block)) as Block;
        copy.id = uniqueId(found.block.id, [...collectBlockIds(draft)]);

        if (isContainer(copy)) {
          const taken = new Set(collectBlockIds(draft));
          for (const child of copy.props.children) {
            child.id = uniqueId(child.id, taken);
            taken.add(child.id);
          }
        }

        found.list.splice(found.index + 1, 0, copy);
        break;
      }

      case "set_theme": {
        for (const [group, values] of Object.entries(op.patch)) {
          if (values === undefined) continue;

          if (group === "contentWidth" || group === "transition") {
            (draft.theme as Record<string, unknown>)[group] = values;
            continue;
          }

          Object.assign(
            (draft.theme as unknown as Record<string, object>)[group],
            values as object,
          );
        }
        break;
      }

      case "set_funnel": {
        Object.assign(draft, op.patch);
        break;
      }

      case "set_flow_position": {
        if (!draft.steps.some((s) => s.id === op.stepId)) break;

        draft.flow ??= { positions: {} };
        draft.flow.positions[op.stepId] = { x: Math.round(op.x), y: Math.round(op.y) };
        break;
      }

      case "add_rule": {
        const step = draft.steps.find((s) => s.id === op.stepId);
        if (!step) break;
        if (!draft.steps.some((s) => s.id === op.rule.goto)) break;

        const rule = { ...op.rule };
        rule.id = uniqueId(rule.id, step.logic.rules.map((r) => r.id));
        step.logic.rules.push(rule);
        break;
      }

      case "update_rule": {
        const step = draft.steps.find((s) => s.id === op.stepId);
        const rule = step?.logic.rules.find((r) => r.id === op.ruleId);
        if (!rule) break;

        // Um destino inexistente prenderia o visitante; o resto do patch entra.
        const { goto, ...resto } = op.patch;
        Object.assign(rule, resto);
        if (goto && draft.steps.some((s) => s.id === goto)) rule.goto = goto;
        break;
      }

      case "remove_rule": {
        const step = draft.steps.find((s) => s.id === op.stepId);
        if (!step) break;

        step.logic.rules = step.logic.rules.filter((r) => r.id !== op.ruleId);
        break;
      }

      case "branch_by_answer": {
        const step = draft.steps.find((s) => s.id === op.stepId);
        if (!step) break;

        const escolha = encontrarBlocoDeEscolha(step, op.blockId);
        if (!escolha) break;

        const opcoesValidas = new Set(escolha.props.options.map((o) => o.id));
        const novas: RoutingRule[] = [];

        for (const branch of op.branches) {
          if (!opcoesValidas.has(branch.optionId)) continue;
          if (!draft.steps.some((s) => s.id === branch.goto)) continue;

          novas.push({
            id: uniqueId(
              `regra_${escolha.props.name}_${branch.optionId}`,
              [...step.logic.rules.map((r) => r.id), ...novas.map((r) => r.id)],
            ),
            goto: branch.goto,
            when: {
              kind: "leaf",
              ref: { source: "answer", key: escolha.props.name },
              op: "eq",
              value: branch.optionId,
            },
          });
        }

        if (novas.length === 0) break;

        step.logic.rules = op.replace ? novas : [...step.logic.rules, ...novas];
        break;
      }
    }
  });
}

function encontrarBlocoDeEscolha(step: Step, blockId?: string) {
  for (const block of walkBlocks(step.blocks)) {
    if (block.type !== "choice") continue;
    if (!blockId || block.id === blockId) return block;
  }
  return null;
}

export function applyOps(doc: FunnelDocument, ops: FunnelOp[]): FunnelDocument {
  return ops.reduce(applyOp, doc);
}

// ── Consultas ──────────────────────────────────────────────────

type BlockLocation = {
  block: Block;
  /** A lista que contém o bloco: os blocos do step ou os filhos do container. */
  list: Block[];
  index: number;
  stepId: string;
  containerId?: string;
};

/** Localiza um bloco em qualquer step, inclusive dentro de containers. */
export function findBlock(doc: FunnelDocument, blockId: string): BlockLocation | null {
  for (const step of doc.steps) {
    const index = step.blocks.findIndex((b) => b.id === blockId);
    if (index !== -1) {
      return { block: step.blocks[index], list: step.blocks, index, stepId: step.id };
    }

    for (const block of step.blocks) {
      if (!isContainer(block)) continue;

      const childIndex = block.props.children.findIndex((c) => c.id === blockId);
      if (childIndex !== -1) {
        return {
          block: block.props.children[childIndex],
          list: block.props.children as Block[],
          index: childIndex,
          stepId: step.id,
          containerId: block.id,
        };
      }
    }
  }

  return null;
}

export function collectBlockIds(doc: FunnelDocument): Set<string> {
  const ids = new Set<string>();
  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) ids.add(block.id);
  }
  return ids;
}

/** Nomes de variável já usados — o editor evita colisão ao inserir campos. */
export function collectAnswerNames(doc: FunnelDocument): Set<string> {
  const names = new Set<string>();

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.type === "choice" || block.type === "input") names.add(block.props.name);
    }
  }

  return names;
}

// ── Construtores ───────────────────────────────────────────────

/**
 * Cria um bloco a partir dos defaults do registro, com id único.
 * Usado tanto pela paleta do editor quanto pelas tools da IA.
 */
export function createBlock(doc: FunnelDocument, type: string, hint?: string): Block | null {
  const definition = getBlockDefinition(type);
  if (!definition) return null;

  const base = hint ? slugifyId(hint) : type;
  const id = uniqueId(`blk_${base}`, collectBlockIds(doc));

  const block = {
    id,
    type,
    props: structuredClone(definition.defaults),
  } as Block;

  // Campos de entrada precisam de um nome de variável que não colida, senão
  // duas perguntas gravariam na mesma chave e uma sobrescreveria a outra.
  if (block.type === "choice" || block.type === "input") {
    block.props.name = uniqueId(hint ? slugifyId(hint) : block.props.name, collectAnswerNames(doc));
  }

  return block;
}

export function createStep(doc: FunnelDocument, type: StepType = "question", name?: string): Step {
  const label = name ?? nomePadraoDoStep(type);

  return {
    id: uniqueId(`step_${slugifyId(label)}`, new Set(doc.steps.map((s) => s.id))),
    name: label,
    type,
    layout: { ...defaultStepLayout },
    blocks: [],
    logic: { rules: [] },
  };
}

function nomePadraoDoStep(type: StepType): string {
  const nomes: Record<StepType, string> = {
    question: "Nova pergunta",
    content: "Nova tela",
    loading: "Personalizando",
    result: "Resultado",
    form: "Captura de dados",
    checkout: "Oferta",
  };
  return nomes[type];
}

// ── Auxiliares ─────────────────────────────────────────────────

function findContainerChildren(step: Step, containerId: string): Block[] | null {
  const container = step.blocks.find((b) => b.id === containerId);
  return container && isContainer(container) ? (container.props.children as Block[]) : null;
}

/** `null` remove o campo; `undefined` deixa como está. */
function applyNullable<K extends "style" | "visibleIf" | "animation">(
  block: Block,
  key: K,
  value: Block[K] | null | undefined,
) {
  if (value === undefined) return;
  if (value === null) delete block[key];
  else block[key] = value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
