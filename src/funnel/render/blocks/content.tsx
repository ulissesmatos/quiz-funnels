"use client";

import { Check } from "lucide-react";

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

  return (
    <ul className="fn-list">
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
          <Marker marker={props.marker} index={index} emoji={item.emoji} />
          <div>
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
  const { context } = useFunnelRuntime();

  const percent =
    props.mode === "manual" ? (props.value ?? 0) : progressPercent(context);
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={props.sticky ? "fn-progress-sticky" : undefined}>
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
  );
}
