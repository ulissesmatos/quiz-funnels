import type { Condition, ConditionLeaf } from "../schema/common";
import type { AnswerValue, FunnelContext } from "./context";

/**
 * Avalia uma condição contra o estado atual do visitante.
 * Usada em três lugares: visibilidade de bloco (`visibleIf`), escolha do
 * resultado (`outcomes[].when`) e roteamento entre steps (`logic.rules`).
 *
 * Nunca lança: um documento com condição malformada deve degradar para
 * "não bate" em vez de derrubar o funil de alguém no ar.
 */
export function evaluateCondition(condition: Condition | undefined, context: FunnelContext): boolean {
  if (!condition) return true;

  switch (condition.kind) {
    case "all":
      return condition.conditions.every((c) => evaluateCondition(c, context));
    case "any":
      return condition.conditions.some((c) => evaluateCondition(c, context));
    case "not":
      return !evaluateCondition(condition.condition, context);
    case "leaf":
      return evaluateLeaf(condition, context);
    default:
      return false;
  }
}

function evaluateLeaf(leaf: ConditionLeaf, context: FunnelContext): boolean {
  const actual = resolveRef(leaf.ref, context);
  const expected = leaf.value;

  switch (leaf.op) {
    case "is_set":
      return !isEmpty(actual);
    case "is_empty":
      return isEmpty(actual);

    case "eq":
      return equals(actual, expected);
    case "neq":
      return !equals(actual, expected);

    case "contains":
      return contains(actual, expected);
    case "not_contains":
      return !contains(actual, expected);

    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = toNumber(actual);
      const b = toNumber(expected);
      if (a === null || b === null) return false;

      if (leaf.op === "gt") return a > b;
      if (leaf.op === "gte") return a >= b;
      if (leaf.op === "lt") return a < b;
      return a <= b;
    }

    default:
      return false;
  }
}

function resolveRef(ref: ConditionLeaf["ref"], context: FunnelContext): AnswerValue {
  switch (ref.source) {
    case "answer":
      return ref.key ? (context.answers[ref.key] ?? null) : null;
    case "score":
      return context.scores[ref.key ?? "total"] ?? 0;
    case "variable":
      return ref.key ? (context.variables[ref.key] ?? "") : "";
    default:
      return null;
  }
}

function isEmpty(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/**
 * Numa resposta de múltipla escolha, `eq` bate se a opção está entre as
 * selecionadas — é o que a pessoa quer dizer ao montar a regra, e evita ter que
 * explicar a diferença entre `eq` e `contains` para quem monta o funil.
 */
function equals(actual: AnswerValue, expected: unknown): boolean {
  if (Array.isArray(actual)) {
    if (Array.isArray(expected)) {
      return (
        actual.length === expected.length && expected.every((v) => actual.includes(String(v)))
      );
    }
    return actual.includes(String(expected));
  }

  if (Array.isArray(expected)) {
    return expected.some((v) => looseEquals(actual, v));
  }

  return looseEquals(actual, expected);
}

function looseEquals(actual: AnswerValue, expected: unknown): boolean {
  if (actual === null || actual === undefined) return expected === null || expected === undefined;

  if (typeof actual === "number" || typeof expected === "number") {
    const a = toNumber(actual);
    const b = toNumber(expected as AnswerValue);
    if (a !== null && b !== null) return a === b;
  }

  if (typeof actual === "boolean" || typeof expected === "boolean") {
    return Boolean(actual) === Boolean(expected);
  }

  return String(actual).toLowerCase() === String(expected).toLowerCase();
}

function contains(actual: AnswerValue, expected: unknown): boolean {
  if (expected === undefined || expected === null) return false;

  if (Array.isArray(actual)) {
    const needles = Array.isArray(expected) ? expected : [expected];
    return needles.some((needle) => actual.includes(String(needle)));
  }

  return String(actual ?? "")
    .toLowerCase()
    .includes(String(expected).toLowerCase());
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
