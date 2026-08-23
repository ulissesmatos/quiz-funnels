import { walkBlocks } from "../schema/block";
import type { FunnelDocument } from "../schema";

/**
 * Estado de quem está percorrendo o funil. É o que alimenta a interpolação de
 * `{{variáveis}}`, as condições de visibilidade e o roteamento entre steps.
 */
export type FunnelContext = {
  /** Respostas por `name` do bloco de entrada. */
  answers: Record<string, AnswerValue>;
  /** Pontuação total (`total`) e por categoria. */
  scores: Record<string, number>;
  /** Variáveis de URL e constantes declaradas no funil. */
  variables: Record<string, string>;
  /** Posição no funil, base para a barra de progresso automática. */
  stepIndex: number;
  stepCount: number;
  /**
   * Rótulo de cada opção de `choice`, por nome de campo e id da opção.
   *
   * `{{objetivo}}` guarda o id gravado na resposta (`"perder_peso"`), não o
   * texto que a pessoa viu (`"Perder peso"`) — sem isto, citar a resposta de
   * volta no texto ("já que seu objetivo é {{objetivo}}...") mostra o id cru.
   */
  optionLabels?: Record<string, Record<string, string>>;
};

export type AnswerValue = string | string[] | number | boolean | null;

export function createContext(
  doc: FunnelDocument,
  searchParams?: Record<string, string | string[] | undefined>,
): FunnelContext {
  const variables: Record<string, string> = {};

  for (const variable of doc.variables) {
    if (variable.source === "constant") {
      variables[variable.key] = variable.defaultValue ?? "";
      continue;
    }

    const raw = searchParams?.[variable.key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    variables[variable.key] = value ?? variable.defaultValue ?? "";
  }

  return {
    answers: {},
    scores: { total: 0 },
    variables,
    stepIndex: 0,
    stepCount: doc.steps.length,
    optionLabels: buildOptionLabels(doc),
  };
}

export function buildOptionLabels(doc: FunnelDocument): Record<string, Record<string, string>> {
  const labels: Record<string, Record<string, string>> = {};

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.type !== "choice") continue;

      const porOpcao: Record<string, string> = {};
      for (const option of block.props.options) porOpcao[option.id] = option.label;
      labels[block.props.name] = porOpcao;
    }
  }

  return labels;
}

/** Progresso em porcentagem, para a barra automática. */
export function progressPercent(context: FunnelContext): number {
  if (context.stepCount <= 1) return 100;
  return Math.round((context.stepIndex / (context.stepCount - 1)) * 100);
}

/**
 * Resolve o nome usado dentro de `{{ }}`. A ordem importa: uma resposta com o
 * mesmo nome de uma variável de URL vence, porque foi o visitante que a deu.
 */
export function lookupValue(context: FunnelContext, key: string): string {
  switch (key) {
    case "score":
      return String(context.scores.total ?? 0);
    case "progresso":
      return String(progressPercent(context));
    case "passo":
      return String(context.stepIndex + 1);
    case "total":
      return String(context.stepCount);
  }

  if (key.startsWith("score.")) {
    return String(context.scores[key.slice("score.".length)] ?? 0);
  }

  if (key in context.answers) {
    return formatAnswer(context.answers[key], context.optionLabels?.[key]);
  }

  return context.variables[key] ?? "";
}

/**
 * Troca o id gravado por opção (`"perder_peso"`) pelo rótulo que a pessoa viu
 * (`"Perder peso"`), quando o campo vem de um bloco `choice` — é isso que
 * `{{objetivo}}` deve mostrar de volta no texto, não o id cru. Campos sem
 * mapa de rótulos (um `input` de texto livre, por exemplo) continuam como
 * estavam: o valor digitado já é o que deve aparecer.
 */
function formatAnswer(value: AnswerValue, labels: Record<string, string> | undefined): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value.map((item) => labels?.[String(item)] ?? String(item)).join(", ");
  }

  return labels?.[String(value)] ?? String(value);
}
