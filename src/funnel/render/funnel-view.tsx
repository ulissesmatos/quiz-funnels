"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { evaluateCondition } from "../logic/conditions";
import { createContext, type AnswerValue, type FunnelContext } from "../logic/context";
import { resolveNextStepId, stepIndexOf } from "../logic/routing";
import { computeScores } from "../logic/scoring";
import { walkBlocks, type Block } from "../schema/block";
import type { FunnelDocument } from "../schema/funnel";
import type { Step } from "../schema/step";
import { themeToCssVars } from "../theme/css";
import { safeHref } from "./rich-text";
import { FunnelRuntimeProvider, type FunnelRuntime } from "./runtime-context";
import { StepView } from "./step-view";

import "./funnel.css";

export type FunnelCompletion = {
  answers: Record<string, AnswerValue>;
  scores: Record<string, number>;
};

export type FunnelViewProps = {
  document: FunnelDocument;
  /** Parâmetros da URL de entrada, para variáveis do tipo `query`. */
  searchParams?: Record<string, string | string[] | undefined>;
  /**
   * Step forçado. O editor usa para mostrar a tela selecionada; o funil público
   * deixa o runtime decidir.
   */
  forcedStepId?: string;
  /** `false` no preview do editor: renderiza igual, mas não navega. */
  interactive?: boolean;
  onComplete?: (result: FunnelCompletion) => void;
  onStepChange?: (stepId: string) => void;
};

/**
 * Runtime do funil: mantém respostas, calcula pontuação e decide a navegação.
 *
 * É client component, mas o Next renderiza o HTML inicial no servidor — a
 * primeira tela sai pronta no HTML, que é o que importa para SEO e para o tempo
 * até a primeira pintura.
 *
 * Respostas e step atual são espelhados em refs. O motivo é concreto: com
 * `autoAdvance`, gravar a resposta e navegar acontecem no mesmo handler, e ler
 * do state daria o valor anterior — o funil recusaria a resposta que a pessoa
 * acabou de dar.
 */
export function FunnelView({
  document: doc,
  searchParams,
  forcedStepId,
  interactive = true,
  onComplete,
  onStepChange,
}: FunnelViewProps) {
  const firstStepId = doc.steps[0]?.id ?? "";

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [history, setHistory] = useState<string[]>([firstStepId]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

  const answersRef = useRef(answers);
  const historyRef = useRef(history);

  const currentStepId = forcedStepId ?? history[history.length - 1];
  const step = doc.steps.find((s) => s.id === currentStepId) ?? doc.steps[0];

  /** Contexto para um instantâneo de respostas — nunca lê do state direto. */
  const buildContext = useCallback(
    (snapshot: Record<string, AnswerValue>, stepId: string): FunnelContext => ({
      ...createContext(doc, searchParams),
      answers: snapshot,
      scores: computeScores(doc, snapshot),
      stepIndex: Math.max(0, stepIndexOf(doc, stepId)),
      stepCount: doc.steps.length,
    }),
    [doc, searchParams],
  );

  const context = useMemo(
    () => buildContext(answers, step?.id ?? firstStepId),
    [answers, buildContext, firstStepId, step?.id],
  );

  const goTo = useCallback(
    (stepId: string) => {
      historyRef.current = [...historyRef.current, stepId];
      setHistory(historyRef.current);
      setErrors({});
      onStepChange?.(stepId);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
    },
    [onStepChange],
  );

  const finish = useCallback(
    (snapshot: Record<string, AnswerValue>) => {
      setCompleted(true);
      onComplete?.({ answers: snapshot, scores: computeScores(doc, snapshot) });
    },
    [doc, onComplete],
  );

  /** Avalia obrigatórios e roteamento sobre o instantâneo recebido. */
  const advance = useCallback(
    (snapshot: Record<string, AnswerValue>) => {
      const fromStepId = forcedStepId ?? historyRef.current[historyRef.current.length - 1];
      const currentStep = doc.steps.find((s) => s.id === fromStepId);
      if (!currentStep) return;

      const ctx = buildContext(snapshot, fromStepId);

      const missing = findMissingRequired(currentStep, ctx);
      if (Object.keys(missing).length > 0) {
        setErrors(missing);
        return;
      }

      const nextId = resolveNextStepId(doc, fromStepId, ctx);
      if (!nextId) {
        finish(snapshot);
        return;
      }

      goTo(nextId);
    },
    [buildContext, doc, finish, forcedStepId, goTo],
  );

  const setAnswer = useCallback((name: string, value: AnswerValue) => {
    answersRef.current = { ...answersRef.current, [name]: value };
    setAnswers(answersRef.current);

    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  /**
   * Grava a resposta e avança na mesma ação — o caminho do `autoAdvance`.
   * Separado do `setAnswer` justamente para navegar com o valor novo em mãos.
   */
  const answerAndAdvance = useCallback(
    (name: string, value: AnswerValue) => {
      const snapshot = { ...answersRef.current, [name]: value };
      answersRef.current = snapshot;
      setAnswers(snapshot);
      setErrors({});
      advance(snapshot);
    },
    [advance],
  );

  const next = useCallback(() => advance(answersRef.current), [advance]);

  const back = useCallback(() => {
    if (historyRef.current.length <= 1) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setHistory(historyRef.current);
    setErrors({});
  }, []);

  const runAction = useCallback(
    (action: Parameters<FunnelRuntime["runAction"]>[0]) => {
      switch (action.kind) {
        case "next":
          next();
          break;
        case "back":
          back();
          break;
        case "goto":
          if (doc.steps.some((s) => s.id === action.stepId)) goTo(action.stepId);
          break;
        case "submit":
          finish(answersRef.current);
          break;
        case "link": {
          const ctx = buildContext(answersRef.current, currentStepId);
          const href = safeHref(interpolateUrl(action.url, ctx));
          if (!href) return;
          if (action.newTab) window.open(href, "_blank", "noopener");
          else window.location.href = href;
          break;
        }
        case "whatsapp": {
          const ctx = buildContext(answersRef.current, currentStepId);
          const text = encodeURIComponent(interpolateUrl(action.message, ctx));
          window.open(
            `https://wa.me/${action.phone.replace(/\D/g, "")}?text=${text}`,
            "_blank",
            "noopener",
          );
          break;
        }
      }
    },
    [back, buildContext, currentStepId, doc.steps, finish, goTo, next],
  );

  const runtime: FunnelRuntime = useMemo(
    () => ({
      context,
      setAnswer,
      answerAndAdvance,
      next,
      back,
      canGoBack: history.length > 1,
      errors,
      interactive,
      mode: "publico",
      runAction,
    }),
    [answerAndAdvance, back, context, errors, history.length, interactive, next, runAction, setAnswer],
  );

  if (!step) return null;

  return (
    <div className="fn-root" style={themeToCssVars(doc.theme)} data-completed={completed}>
      <FunnelRuntimeProvider value={runtime}>
        <StepView step={step} theme={doc.theme} transition={doc.theme.transition} />

        {doc.settings.showBranding && (
          <p className="fn-branding">
            Feito com <strong>Funis</strong>
          </p>
        )}
      </FunnelRuntimeProvider>
    </div>
  );
}

/**
 * Campos obrigatórios ainda vazios no step atual. Blocos escondidos por
 * condição não contam — cobrar uma resposta que a pessoa nem viu prenderia o
 * funil sem explicação nenhuma.
 */
function findMissingRequired(step: Step, context: FunnelContext): Record<string, string> {
  const missing: Record<string, string> = {};

  for (const block of walkBlocks(step.blocks)) {
    if (!evaluateCondition(block.visibleIf, context)) continue;
    if (!isRequiredInput(block)) continue;

    const value = context.answers[block.props.name];
    const empty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (empty) {
      missing[block.props.name] =
        block.type === "choice" ? "Escolha uma opção para continuar." : "Preencha este campo.";
      continue;
    }

    if (block.type === "choice" && block.props.multiple && block.props.minSelect) {
      const count = Array.isArray(value) ? value.length : 1;
      if (count < block.props.minSelect) {
        missing[block.props.name] = `Escolha pelo menos ${block.props.minSelect} opções.`;
      }
    }

    if (
      block.type === "input" &&
      block.props.inputType === "email" &&
      !isValidEmail(String(value))
    ) {
      missing[block.props.name] = "Digite um e-mail válido.";
    }
  }

  return missing;
}

function isRequiredInput(block: Block): block is Extract<Block, { type: "choice" | "input" }> {
  return (block.type === "choice" || block.type === "input") && block.props.required;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim());
}

function interpolateUrl(text: string, context: FunnelContext): string {
  return text.replace(/\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g, (_m, key: string) => {
    const value = context.answers[key] ?? context.variables[key] ?? "";
    return encodeURIComponent(Array.isArray(value) ? value.join(",") : String(value));
  });
}
