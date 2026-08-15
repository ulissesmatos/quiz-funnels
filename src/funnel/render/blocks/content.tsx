"use client";

import { Check, ChevronLeft } from "lucide-react";

import { progressPercent } from "../../logic/context";
import type { PropsOf } from "../../schema/block";
import { RichText } from "../rich-text";
import { useFunnelRuntime } from "../runtime-context";

export function HeadingBlock({ props }: { props: PropsOf<"heading"> }) {
  const { context } = useFunnelRuntime();
  const Tag = (["h1", "h2", "h3"] as const)[props.level - 1];

  return (
    <RichText
      as={Tag}
      text={props.text}
      context={context}
      className="fn-heading"
      // A escala de tamanho por nível mora no CSS e depende deste atributo.
      data={{ level: props.level }}
    />
  );
}

export function TextBlock({ props }: { props: PropsOf<"text"> }) {
  const { context } = useFunnelRuntime();
  return <RichText text={props.text} context={context} className="fn-text" />;
}

export function ListBlock({ props }: { props: PropsOf<"list"> }) {
  const { context } = useFunnelRuntime();

  // `variant` nasceu depois de já haver funil salvo, então documentos antigos
  // chegam sem o campo e caem no formato original.
  const variant = props.variant ?? "simples";

  return (
    <ul className="fn-list" data-variant={variant}>
      {props.items.map((item, index) => (
        <li
          key={index}
          className={props.animated ? "fn-list-item fn-anim" : "fn-list-item"}
          data-preset={props.animated ? "fade_up" : undefined}
          style={
            props.animated
              ? ({ "--b-anim-delay": `${index * props.stagger}ms` } as React.CSSProperties)
              : undefined
          }
        >
          {variant === "notificacao" ? (
            <span className="fn-list-avatar" aria-hidden>
              {item.emoji ?? "🔔"}
            </span>
          ) : (
            <Marker marker={props.marker} index={index} emoji={item.emoji} />
          )}

          <div className="fn-list-body">
            <RichText as="div" text={item.title} context={context} className="fn-list-title" />
            {item.description && (
              <RichText
                as="div"
                text={item.description}
                context={context}
                className="fn-list-desc"
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Marker({
  marker,
  index,
  emoji,
}: {
  marker: PropsOf<"list">["marker"];
  index: number;
  emoji?: string;
}) {
  if (marker === "none") return null;

  return (
    <span className="fn-list-marker" data-marker={marker} aria-hidden>
      {marker === "check" && <Check size={13} strokeWidth={3} />}
      {marker === "number" && index + 1}
      {marker === "emoji" && (emoji ?? "•")}
    </span>
  );
}

export function DividerBlock({ props }: { props: PropsOf<"divider"> }) {
  return (
    <hr
      className="fn-divider"
      style={{ borderTopStyle: props.lineStyle, borderTopWidth: props.thickness }}
    />
  );
}

export function SpacerBlock({ props }: { props: PropsOf<"spacer"> }) {
  return <div style={{ height: props.size }} aria-hidden />;
}

export function ProgressBlock({ props }: { props: PropsOf<"progress"> }) {
  const { context, back, canGoBack, interactive } = useFunnelRuntime();

  const percent =
    props.mode === "manual" ? (props.value ?? 0) : progressPercent(context);
  const clamped = Math.max(0, Math.min(100, percent));
  const podeVoltar = props.showBack !== false && canGoBack;

  return (
    <div className={props.sticky ? "fn-progress-sticky" : undefined}>
      <div className="fn-progress-row">
        {podeVoltar && (
          <button
            type="button"
            className="fn-progress-back"
            onClick={() => interactive && back()}
            aria-label="Voltar para a pergunta anterior"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        )}

        <div className="fn-progress-main">
          {props.showLabel && (
            <div className="fn-progress-label">
              {props.label ? (
                <RichText as="span" text={props.label} context={context} />
              ) : (
                <span>
                  Etapa {context.stepIndex + 1} de {context.stepCount}
                </span>
              )}
              {!props.label && <span>{clamped}%</span>}
            </div>
          )}
          <div
            className="fn-progress-track"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="fn-progress-bar" style={{ width: `${clamped}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
