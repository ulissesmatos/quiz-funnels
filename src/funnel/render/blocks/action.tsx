"use client";

import { Check, Loader2, icons } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { evaluateCondition } from "../../logic/conditions";
import type { FunnelContext } from "../../logic/context";
import type { PropsOf } from "../../schema/block";
import type { Theme } from "../../schema/theme";
import { RichText, plainText } from "../rich-text";
import { useFunnelRuntime } from "../runtime-context";

export function ButtonBlock({
  props,
  theme,
}: {
  props: PropsOf<"button">;
  theme: Theme;
}) {
  const { context, runAction, interactive } = useFunnelRuntime();

  const variant = props.variant ?? theme.button.variant;
  const size = props.size ?? theme.button.size;
  const fullWidth = props.fullWidth ?? theme.button.fullWidth;
  const Icon = props.icon ? icons[props.icon as keyof typeof icons] : null;

  return (
    <button
      type="button"
      className="fn-button"
      data-variant={variant}
      data-size={size}
      data-full={fullWidth}
      data-uppercase={theme.button.uppercase}
      onClick={() => interactive && runAction(props.action)}
    >
      <span className="fn-button-row">
        <RichText as="span" text={props.label} context={context} />
        {Icon && <Icon size={18} aria-hidden />}
      </span>
      {props.subLabel && (
        <span className="fn-button-sub">{plainText(props.subLabel, context)}</span>
      )}
    </button>
  );
}

/**
 * A tela de "personalizando seu plano".
 *
 * O tempo é teatro deliberado: o intervalo dá peso ao resultado que vem em
 * seguida, e é um dos padrões mais replicados em funis de alta conversão. Por
 * isso o progresso acompanha as durações declaradas em vez de correr solto.
 */
export function LoaderBlock({ props }: { props: PropsOf<"loader"> }) {
  const { context, runAction, interactive } = useFunnelRuntime();

  const [elapsed, setElapsed] = useState(0);
  const finished = useRef(false);

  const totalMs = props.steps.reduce((sum, step) => sum + step.durationMs, 0);

  useEffect(() => {
    if (!interactive) return;

    const startedAt = performance.now();
    let frame = 0;

    const tick = () => {
      const value = performance.now() - startedAt;
      setElapsed(value);

      if (value >= totalMs) {
        if (!finished.current) {
          finished.current = true;
          runAction(props.onFinish);
        }
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `runAction` muda a cada render do runtime; reexecutar o timer por causa
    // disso reiniciaria a animação no meio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, totalMs]);

  const percent = totalMs === 0 ? 100 : Math.min(100, Math.round((elapsed / totalMs) * 100));
  const currentIndex = stepIndexAt(props.steps, elapsed);
  const layout = props.layout ?? "anel";

  return (
    <div className="fn-loader" data-layout={layout}>
      {props.title && (
        <RichText as="h2" text={props.title} context={context} className="fn-heading" />
      )}
      {props.subtitle && (
        <RichText text={props.subtitle} context={context} className="fn-text" />
      )}

      {layout === "anel" && (
        <>
          <div className="fn-loader-ring">
            <ProgressRing percent={percent} />
            {props.showPercent && <span className="fn-loader-percent">{percent}%</span>}
          </div>
          <LoaderSteps steps={props.steps} currentIndex={currentIndex} context={context} />
        </>
      )}

      {layout === "barra" && (
        <>
          <div className="fn-loader-bar">
            <div className="fn-loader-bar-track">
              <div className="fn-loader-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            {props.showPercent && <span className="fn-loader-bar-percent">{percent}%</span>}
          </div>
          <LoaderSteps steps={props.steps} currentIndex={currentIndex} context={context} />
        </>
      )}

      {layout === "pulso" && (
        <div className="fn-loader-pulse">
          <span className="fn-loader-pulse-dot" />
          <p className="fn-loader-pulse-label" key={currentIndex}>
            {plainText(props.steps[currentIndex]?.label ?? "", context)}
          </p>
          {props.showPercent && <span className="fn-loader-pulse-percent">{percent}%</span>}
        </div>
      )}
    </div>
  );
}

/** Lista de etapas, compartilhada pelos layouts 'anel' e 'barra'. */
function LoaderSteps({
  steps,
  currentIndex,
  context,
}: {
  steps: PropsOf<"loader">["steps"];
  currentIndex: number;
  context: FunnelContext;
}) {
  return (
    <ul className="fn-loader-steps">
      {steps.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "todo";

        return (
          <li key={index} className="fn-loader-step" data-state={state}>
            <span className="fn-loader-step-icon">
              {state === "done" ? (
                <Check size={12} strokeWidth={3} />
              ) : state === "active" ? (
                <Loader2 size={12} className="fn-spin" />
              ) : null}
            </span>
            {plainText(step.label, context)}
          </li>
        );
      })}
    </ul>
  );
}

/** Qual etapa do loader está em foco no instante `elapsed`. */
function stepIndexAt(steps: { durationMs: number }[], elapsed: number): number {
  let acumulado = 0;

  for (let index = 0; index < steps.length; index++) {
    acumulado += steps[index].durationMs;
    if (elapsed < acumulado) return index;
  }

  return steps.length - 1;
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <circle
        className="fn-loader-ring-track"
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="8"
      />
      <circle
        className="fn-loader-ring-fill"
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent / 100)}
      />
    </svg>
  );
}

export function ResultBlock({ props }: { props: PropsOf<"result"> }) {
  const { context } = useFunnelRuntime();

  // Primeiro que casar vence; o último costuma vir sem condição e serve de
  // padrão, então nunca cai em tela vazia.
  const outcome =
    props.outcomes.find((candidate) => evaluateCondition(candidate.when, context)) ??
    props.outcomes[props.outcomes.length - 1];

  if (!outcome) return null;

  return (
    <div className="fn-result">
      {outcome.badge && <span className="fn-result-badge">{plainText(outcome.badge, context)}</span>}

      {outcome.image?.url && (
        <img
          className="fn-result-image"
          src={outcome.image.url}
          alt={plainText(outcome.image.alt, context)}
          loading="lazy"
        />
      )}

      <RichText as="h2" text={outcome.title} context={context} className="fn-result-title" />

      {outcome.description && (
        <RichText text={outcome.description} context={context} className="fn-text" />
      )}
    </div>
  );
}
